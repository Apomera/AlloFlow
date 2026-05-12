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
    elementary: [
      { id: 'tone', icon: '🗺️', title: 'Tone got lost', situation: 'You sent a joke text. Your friend thought you were being mean. They are upset.', badMove: 'Say "it was just a joke, you are being too sensitive."', skill: 'Even if you did not mean it, the way it felt to them is real. Try: "I am sorry it sounded mean. That is not how I meant it. What can I do?"', note: 'Texts do not have faces or voices. Big jokes need big context, or a phone call.' },
      { id: 'left_out', icon: '🌟', title: 'You see a post without you', situation: 'You scroll past a photo of two friends having fun without you. It stings.', badMove: 'Comment something passive-aggressive, or quietly stay mad.', skill: 'Two things: (1) people post the highlight, not the boring parts. (2) Friends having other friends does not subtract from you. If it still stings, talk to someone offline.', note: 'Phones make small feelings feel huge. Putting it down helps.' },
      { id: 'group_drama', icon: '👥', title: 'Drama in the group chat', situation: 'Two of your friends start arguing in the group chat. Other kids pile on.', badMove: 'Pick a side in the chat to make one friend happy.', skill: 'DM each friend separately: "I love you both. I am not picking a side in the chat." Group chats are bad places for two-person fights.', note: 'Most chat blowups die fast if no one fans them.' },
      { id: 'mean_screenshot', icon: '📸', title: 'Someone shows you a screenshot', situation: 'A friend shows you a screenshot of someone else’s message and laughs at them. They want you to laugh too.', badMove: 'Laugh along, or send it to someone else.', skill: 'You can be quiet and still be honest. "I am not really comfortable with this. Can we drop it?" Never forward it.', note: 'Screenshots last longer than friendships. Be careful what you laugh at.' },
    ],
    middle: [
      { id: 'left_on_read', icon: '💬', title: 'Left on read', situation: 'You sent a long, vulnerable message to a friend two days ago. They have seen it (read receipt is on) but have not replied. You are starting to spiral.', badMove: 'Send "??" or "wow ok" or unfollow them.', skill: 'Read receipts are not real-time conversation. Your friend may be overwhelmed, busy, or unsure how to reply to something heavy. Wait one more day. Then try a low-stakes follow-up: "Hey, no pressure on the long message. Just wanted to say hi."', note: 'About 70% of "I think they hate me" stories are actually "they have not figured out what to say."' },
      { id: 'group_chat_drama', icon: '👥', title: 'Drama in the group chat', situation: 'In your group chat with five friends, two of them start arguing. Others are taking sides. You are close with both.', badMove: 'Stay silent and screenshot it for someone else, or pick a side publicly to keep one friend happy.', skill: 'Group chats are a terrible place for two-person conflict. DM each friend separately: "I saw what is happening. I love you both. I am not picking a side in the chat." Then encourage them to handle it 1-on-1.', note: 'Most group-chat blowups die fast if no one fans them. Your job is to not be the wind.' },
      { id: 'screenshot', icon: '📸', title: 'Someone screenshotted', situation: 'A friend sends you a screenshot of a private DM from another friend, with commentary mocking them. They want you to laugh along.', badMove: 'Laugh along to keep the peace, forward it to someone else, or confront them publicly.', skill: 'You do not have to be loud to be honest. "Hey, I am not really comfortable with this. Can we drop it?" If they push back, that tells you something about the friendship. You also do not share it onward, ever.', note: 'Screenshots outlive friendships. The thing you laugh at today can hurt someone for years.' },
      { id: 'ghosted', icon: '👻', title: 'You got ghosted', situation: 'A friend who used to text you every day has stopped responding. No fight, no explanation. You are hurt and confused.', badMove: 'Spam them, post about it publicly, or pretend you do not care.', skill: 'Send one clear message: "Hey, I noticed we have not talked in a while. If something happened, I would rather know. If life got busy, that is okay too. Just want to be honest." Then let it go. Their response, or silence, is information.', note: 'Ghosting usually says more about the ghoster than the ghosted. Some people do not have the skills for hard conversations yet.' },
      { id: 'highlight_reel', icon: '🌟', title: 'Compared to a feed', situation: 'You scroll past a friend’s post: them with a group of people you did not know they were close with, having an obviously great time. You feel a sting.', badMove: 'Subtweet, leave a passive-aggressive comment, or quietly resent them.', skill: 'Two things: (1) they posted the highlight, not the boring 23 hours. (2) Other people having other friendships does not subtract from yours. If the sting stays, the question is not about them; it is about a part of YOUR life that needs attention.', note: 'Comparison spirals are almost always solved offline. Get off the app. Call someone you actually love.' },
      { id: 'misunderstood', icon: '🗺️', title: 'Tone got lost', situation: 'You sent a joke. Your friend took it as an insult. They are mad. You explain it was a joke. They are still mad.', badMove: 'Insist "it was just a joke, you are being too sensitive."', skill: 'Even if you did not mean it that way, the IMPACT is real. "I am sorry it landed that way. That was not what I meant, but I can see how it sounded. What can I do?" Intent and impact are both real, and impact is the one your friend is living.', note: 'Text strips out most of communication: face, tone, body. Big jokes need big context. Or a video call.' },
    ],
    high: [
      { id: 'parasocial', icon: '📱', title: 'The parasocial drift', situation: 'You realize you know more about a stranger’s daily life from their feed than you do about a real friend you used to be close with.', badMove: 'Keep doom-scrolling and call it staying connected.', skill: 'Audit your feed once a month. Whose posts make you feel close to them? Whose posts give you the illusion of closeness without any actual reciprocity? Reach out to one real friend the time you would have spent on the second list.', note: 'Parasocial relationships are not bad in themselves, but they do not feed you the way real friendship does. Notice the difference.' },
      { id: 'cancellation', icon: '⚡', title: 'A friend gets piled on', situation: 'A friend posts something that gets dragged. The pile-on is intense. They are clearly suffering. You agree their post was a misstep, but the response feels disproportionate.', badMove: 'Stay quiet to protect yourself. Or join the pile-on to seem on the right side.', skill: 'Mistakes deserve correction, not annihilation. DM your friend privately first to check on them as a human. If you have a critique of the post, share it with them, not the mob. In public, you can hold both: "I disagree with what they posted AND I do not think this response is helping anyone."', note: 'The internet rewards the loudest take. Real friendship rewards the most accurate one.' },
      { id: 'long_distance', icon: '🌎', title: 'Friend drifting after they moved', situation: 'A close friend moved away. The texts have slowed. Neither of you has done anything wrong. It is just hard.', badMove: 'Wait passively, then quietly write the friendship off when nothing happens.', skill: 'Long-distance friendships die from neglect more often than from conflict. Schedule it: a 30-minute call once a month, on the calendar, treated like a meeting. Friendship at distance requires structure that friendship in proximity does not.', note: 'Most adult close friendships are 80% maintenance and 20% spontaneity. The math just shifts when distance is added.' },
      { id: 'digital_breakup', icon: '✂️', title: 'Ending a friendship cleanly', situation: 'You have realized a friendship is hurting you more than helping you. You want out, but feel guilty just disappearing.', badMove: 'Slow-fade through unread messages until they get the hint.', skill: 'A clean ending is a kindness to both of you. "I have been thinking about us a lot. I do not think this friendship is working for me right now, and I want to be honest with you instead of disappearing. I am sorry." Then mute, mute, mute. Closure is a gift you can give yourself.', note: 'Slow-fades feel polite but leave the other person with a question they cannot answer. Honest endings are kinder.' },
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
      var starterIdx    = d.starterIdx || 0;
      var repairIdx     = d.repairIdx || 0;
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
      var friendNotes   = d.friendNotes || [];
      var newNote       = d.newNote || '';
      // Digital friendship
      var digitalIdx    = d.digitalIdx || 0;
      var digitalShown  = d.digitalShown || false;
      var digitalDraft  = d.digitalDraft || '';
      var digitalDone   = d.digitalDone || {};

      var AMBER = '#d97706'; var AMBER_LIGHT = '#fffbeb'; var AMBER_DARK = '#78350f';

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
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #fde68a', background: 'linear-gradient(180deg, #fffbeb, #fef3c7)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + AMBER + ', #f59e0b)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Friendship sections'
        },
          TABS.map(function(t) {
            var active = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id, role: 'tab', className: 'sel-tab' + (active ? ' sel-tab-active' : ''), 'aria-selected': active ? 'true' : 'false',
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: active ? 'none' : '1px solid ' + (explored ? '#fde68a' : 'transparent'), background: active ? 'linear-gradient(135deg, ' + AMBER + ', #b45309)' : explored ? 'rgba(217,119,6,0.06)' : 'transparent', color: active ? '#fff' : explored ? '#78350f' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: active ? '0 3px 12px rgba(217,119,6,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: active ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !active ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: AMBER, fontWeight: 700, whiteSpace: 'nowrap', background: '#fef3c7', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, className: 'sel-btn', 'aria-label': soundEnabled ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          compass: { accent: '#d97706', soft: 'rgba(217,119,6,0.14)',  icon: '\uD83E\uDDED', title: 'My Style \u2014 how you show you care',                hint: 'Loyalist, encourager, advisor, peacekeeper, jokester, listener, adventurer. Most people lean on 1-2. Knowing yours is half the work \u2014 the other half is recognizing your friend\u2019s default is probably different.' },
          start:   { accent: '#10b981', soft: 'rgba(16,185,129,0.14)', icon: '\uD83D\uDCAC', title: 'Starting \u2014 the open + the follow-up',             hint: 'Mere-exposure effect (Zajonc 1968): repeated low-stakes contact predicts liking better than charm. Pair-share, lunch tables, shared activities. \u201CI like your shoes\u201D is corny because it WORKS.' },
          keep:    { accent: '#fbbf24', soft: 'rgba(251,191,36,0.14)', icon: '\uD83D\uDC9B', title: 'Keeping \u2014 maintenance is everything',              hint: 'Dunbar 1992: humans top out at ~150 stable relationships, ~5 close ones. Sustaining ANY of those takes regular small bids \u2014 a text, a memory mentioned, a check-in. Drift is the default.' },
          digital: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '📱',           title: 'Digital \u2014 different rules, same friendship',     hint: 'No tone-of-voice; punctuation matters more than you think. Read receipts feel like power moves but rarely intend to be. Posting + tagging = public; DM = private \u2014 picking the wrong channel breaks trust.' },
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
            h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
            h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ── My Style (Friendship Compass) ──
      var compassContent = null;
      if (activeTab === 'compass') {
        compassContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83E\uDDED'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'What Kind of Friend Am I?'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Everyone has a friendship style \u2014 the way they naturally show they care. Which one sounds most like you?')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' } },
            FRIEND_STYLES.map(function(fs) {
              var selected = myStyle === fs.id;
              return h('button', {
                key: fs.id, role: 'radio', 'aria-checked': selected ? 'true' : 'false',
                'aria-label': fs.label + ': ' + fs.desc,
                onClick: function() { upd('myStyle', fs.id); if (soundEnabled) sfxHeart(); if (awardXP) awardXP(10, 'Discovered your friendship style!'); if (announceToSR) announceToSR('Selected: ' + fs.label); },
                style: { padding: '16px 12px', borderRadius: '14px', border: selected ? '3px solid ' + AMBER : '2px solid #e5e7eb', background: selected ? AMBER_LIGHT : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: selected ? '0 2px 12px rgba(217,119,6,0.15)' : 'none' }
              },
                h('div', { style: { fontSize: '28px', marginBottom: '6px' } }, fs.icon),
                h('div', { style: { fontSize: '13px', fontWeight: 700, color: selected ? AMBER : '#374151' } }, fs.label),
                h('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 } }, fs.desc)
              );
            })
          ),
          myStyle && (function() {
            var style = FRIEND_STYLES.find(function(s) { return s.id === myStyle; });
            if (!style) return null;
            return h('div', { style: { marginTop: '16px', background: AMBER_LIGHT, borderRadius: '14px', padding: '16px', border: '2px solid #fde68a' } },
              h('div', { style: { fontSize: '14px', fontWeight: 700, color: AMBER_DARK, marginBottom: '8px' } }, style.icon + ' You\u2019re ' + style.label + '!'),
              h('div', { style: { fontSize: '13px', color: '#374151', marginBottom: '6px' } }, '\u2728 Superpower: ' + style.strength),
              h('div', { style: { fontSize: '13px', color: '#94a3b8' } }, '\uD83D\uDCA1 Growth edge: ' + style.watchFor)
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
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, band === 'elementary' ? 'The hardest part is the first words. Here\u2019s what to say.' : 'Specific words for specific situations. Practice makes natural.')
          ),
          // Scenario card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, '\uD83C\uDFAD Situation'),
            h('p', { style: { fontSize: '14px', color: '#1f2937', fontWeight: 600, margin: '0 0 14px' } }, cur.situation),
            h('div', { style: { background: AMBER_LIGHT, borderRadius: '12px', padding: '14px', borderLeft: '4px solid ' + AMBER, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, marginBottom: '4px' } }, '\uD83D\uDDE3\uFE0F You could say:'),
              h('p', { style: { fontSize: '15px', fontWeight: 700, color: AMBER_DARK, margin: 0, fontStyle: 'italic' } }, '"' + cur.say + '"')
            ),
            h('div', { style: { fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 } }, '\uD83D\uDCA1 Why it works: ' + cur.why)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('starterIdx', (starterIdx - 1 + starters.length) % starters.length); }, style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' } }, '\u2190 Prev'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#94a3b8' } }, (starterIdx % starters.length + 1) + ' / ' + starters.length),
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
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Friendships need care. Small, consistent actions matter more than grand gestures.')
          ),
          // Tips
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' } },
            KEEP_TIPS.map(function(tip, i) {
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', border: '1px solid #fde68a', borderRadius: '10px' } },
                h('div', { style: { width: '24px', height: '24px', borderRadius: '50%', background: AMBER_LIGHT, border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: AMBER, flexShrink: 0 } }, i + 1),
                h('span', { style: { fontSize: '13px', color: '#374151' } }, tip)
              );
            })
          ),
          // Friendship journal
          h('div', { style: { background: AMBER_LIGHT, borderRadius: '14px', padding: '16px', border: '1px solid #fde68a' } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: AMBER_DARK, marginBottom: '8px' } }, '\uD83D\uDCDD Friendship Journal'),
            h('p', { style: { fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' } }, 'Write about a friendship moment \u2014 something kind someone did, a fun memory, or something you\u2019re grateful for.'),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
              h('input', {
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
                'aria-label': 'Friendship journal entry',
                style: { flex: 1, border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                onClick: function() { if (!newNote.trim()) return; upd({ friendNotes: [{ id: Date.now().toString(), text: newNote.trim(), date: new Date().toLocaleDateString() }].concat(friendNotes), newNote: '' }); if (soundEnabled) sfxHeart(); },
                disabled: !newNote.trim(),
                style: { padding: '8px 14px', background: newNote.trim() ? AMBER : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontSize: '12px' }
              }, '\uD83D\uDC9B')
            ),
            friendNotes.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' } },
              friendNotes.slice(0, 10).map(function(note) {
                return h('div', { key: note.id, style: { fontSize: '12px', color: '#374151', padding: '4px 0', borderBottom: '1px solid #fef3c7' } },
                  h('span', { style: { color: '#94a3b8', fontSize: '10px' } }, note.date + ' \u2014 '),
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
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, band === 'elementary' ? 'When friends hurt each other, here\u2019s how to fix it.' : 'Conflict doesn\u2019t have to mean the end. These steps help you navigate back to each other.')
          ),
          // Step progress
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' } },
            steps.map(function(s, i) {
              var isCurrent = i === repairIdx % steps.length;
              return h('button', {
                key: i,
                'aria-label': 'Step ' + (i + 1) + ': ' + s.step + (isCurrent ? ' (current)' : ''),
                onClick: function() { upd('repairIdx', i); if (soundEnabled) sfxClick(); },
                style: { width: '36px', height: '36px', borderRadius: '50%', border: isCurrent ? '3px solid ' + AMBER : '2px solid #e5e7eb', background: isCurrent ? AMBER : '#fff', color: isCurrent ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }
              }, i + 1);
            })
          ),
          // Step card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '28px' } }, curStep.icon),
              h('div', null,
                h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, 'Step ' + ((repairIdx % steps.length) + 1) + ' of ' + steps.length),
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: '#1f2937', margin: 0 } }, curStep.step)
              )
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 12px' } }, curStep.desc),
            h('div', { style: { background: '#fef3c7', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', fontWeight: 600, color: '#92400e', margin: 0 } }, '\uD83D\uDCA1 ' + curStep.tip)
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('repairIdx', (repairIdx - 1 + steps.length) % steps.length); }, style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' } }, '\u2190 Prev'),
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
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Sometimes friendships end or change shape. That\u2019s one of the hardest parts of growing up.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            truths.map(function(truth, i) {
              return h('div', Object.assign({
                key: i,
                'aria-label': truth,
                'aria-pressed': i === endingIdx ? 'true' : 'false',
                style: { background: i === endingIdx ? '#fff8f0' : '#fff', border: i === endingIdx ? '2px solid #fdba74' : '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }
              }, a11yClick(function() { upd('endingIdx', i); if (soundEnabled) sfxClick(); })),
                h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: 0, fontStyle: i === endingIdx ? 'normal' : 'italic' } }, truth)
              );
            })
          ),
          h('p', { style: { fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '16px', fontStyle: 'italic' } },
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
          });
        } else {
        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Friendship Practice'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Describe a friendship situation. This space is monitored for your safety.')
          ),
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Friendship practice conversation', 'aria-live': 'polite', 'aria-busy': coachLoading ? 'true' : 'false', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? '#eff6ff' : AMBER_LIGHT, border: '1px solid ' + (isUser ? '#bfdbfe' : '#fde68a'), fontSize: '13px', lineHeight: 1.6, color: '#1f2937' } },
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, marginBottom: '4px' } }, '\uD83D\uDC9B Friend Coach'),
                  msg.text
                )
              );
            })
          ),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', {
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
                    window.SelHub.safeCoach({ studentMessage: userMsg, toolId: 'friendship', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: newHist }).then(function(result) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); if (awardXP) awardXP(5, 'Practiced friendship skills!'); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But here\u2019s what I know: the fact that you\u2019re thinking about how to be a better friend means you already are one.' }]), coachLoading: false }); });
                  } else {
                    callGemini(prompt, false).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false }); if (awardXP) awardXP(5, 'Practiced friendship skills!'); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But here\u2019s what I know: the fact that you\u2019re thinking about how to be a better friend means you already are one.' }]), coachLoading: false }); });
                  }
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Thinking...' : 'Describe a friendship situation...',
              'aria-label': 'Friendship practice message',
              style: { flex: 1, border: '2px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                var userMsg = coachInput.trim();
                var newHist = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                upd({ coachHistory: newHist, coachInput: '', coachLoading: true });
                var prompt = 'You are a warm friendship coach for a ' + band + ' school student. The student said: "' + userMsg + '"\nValidate, give specific words they could say, explain why. Max 3-4 sentences.';
                if (window.SelHub && window.SelHub.safeCoach) {
                  window.SelHub.safeCoach({ studentMessage: userMsg, toolId: 'friendship', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: newHist }).then(function(result) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting, but I believe in you. The courage to think about friendship is itself an act of friendship.' }]), coachLoading: false }); });
                } else {
                  callGemini(prompt, false).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting, but I believe in you. The courage to think about friendship is itself an act of friendship.' }]), coachLoading: false }); });
                }
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? AMBER : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728')
          ),
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'Try:'),
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
        var dilemmas = DIGITAL_DILEMMAS[band] || DIGITAL_DILEMMAS.middle;
        var curD = dilemmas[digitalIdx % dilemmas.length];
        var doneCount = Object.keys(digitalDone).length;
        digitalContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '📱'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Digital Friendship'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Texting, group chats, posts, screenshots. The friendship rules still apply, but the medium changes the math.')
          ),
          // Progress chip
          h('div', { style: { textAlign: 'center', marginBottom: '12px' } },
            h('span', { style: { background: AMBER_LIGHT, padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: AMBER, border: '1px solid #fde68a' } }, '📱 ' + doneCount + ' / ' + dilemmas.length + ' explored')
          ),
          // Situation card
          h('div', { style: { background: '#fff', border: '2px solid #fde68a', borderRadius: '16px', padding: '20px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '32px' } }, curD.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: AMBER_DARK, margin: 0 } }, curD.title)
            ),
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' } }, 'The situation'),
            h('p', { style: { fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.7 } }, curD.situation)
          ),
          // Common reaction (always shown, dimmed)
          h('div', { style: { background: '#fef2f2', borderRadius: '12px', padding: '12px 14px', borderLeft: '4px solid #fca5a5', marginBottom: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' } }, 'Common reaction:'),
            h('p', { style: { fontSize: '13px', color: '#7f1d1d', margin: 0, fontStyle: 'italic' } }, curD.badMove)
          ),
          // Student input (before reveal)
          !digitalShown && h('div', { style: { background: AMBER_LIGHT, borderRadius: '12px', padding: '14px', border: '1px solid #fde68a', marginBottom: '10px' } },
            h('label', { style: { fontSize: '12px', fontWeight: 700, color: AMBER_DARK, display: 'block', marginBottom: '6px' } }, '📝 What would YOU do or say?'),
            h('textarea', {
              value: digitalDraft,
              onChange: function(ev) { upd('digitalDraft', ev.target.value); },
              'aria-label': 'Your response to this digital dilemma',
              placeholder: 'Type the message you would actually send...',
              style: { width: '100%', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '70px', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('button', {
              onClick: function() { upd({ digitalShown: true, digitalDone: Object.assign({}, digitalDone, (function() { var o = {}; o[curD.id] = true; return o; })()) }); if (soundEnabled) sfxClick(); if (digitalDraft.trim() && awardXP) awardXP(8, 'Worked through a digital dilemma'); },
              'aria-label': 'Show the skillful response',
              style: { marginTop: '8px', padding: '8px 18px', background: AMBER, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
            }, 'See a skillful response →')
          ),
          // Skill response (revealed)
          digitalShown && h('div', null,
            digitalDraft.trim() && h('div', { style: { background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '12px', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#2563eb', marginBottom: '4px' } }, '💭 Your draft:'),
              h('p', { style: { fontSize: '13px', color: '#1e3a8a', margin: 0, fontStyle: 'italic', whiteSpace: 'pre-wrap' } }, digitalDraft)
            ),
            h('div', { style: { background: '#f0fdf4', borderRadius: '12px', padding: '14px', border: '2px solid #4ade80', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a', marginBottom: '2px' } }, 'A skillful response:'),
              h('p', { style: { fontSize: '14px', color: '#166534', margin: 0, lineHeight: 1.6 } }, curD.skill)
            ),
            h('p', { style: { fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 12px', paddingLeft: '8px', borderLeft: '2px solid #e5e7eb' } }, curD.note),
            h('button', {
              onClick: function() { upd({ digitalIdx: (digitalIdx + 1) % dilemmas.length, digitalShown: false, digitalDraft: '' }); if (soundEnabled) sfxClick(); },
              'aria-label': 'Next dilemma',
              style: { padding: '10px 22px', background: AMBER, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'block', margin: '0 auto' }
            }, 'Next dilemma →')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Rehearse — multi-turn role-play (AI plays the friend/peer) ──
      // ══════════════════════════════════════════════════════════
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
            upd({ fRpHistory: newHist.concat([{ speaker: 'ai', text: reply || '...' }]), fRpLoading: false });
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
          }).catch(function() { upd('fRpLoading', false); });
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
              h('p', { style: { fontSize: 13, color: '#94a3b8', margin: 0 } }, 'AI plays the friend. You practice what you would actually say. Coach is one tap away.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              F_ORDER.map(function(sid) {
                var cfg = FRIEND_SCENARIOS[sid];
                return h('button', {
                  key: sid,
                  onClick: function() { fStartRp(sid); },
                  disabled: !callGemini || fRpStarting,
                  style: {
                    padding: '12px 14px', textAlign: 'left',
                    background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 12,
                    color: '#0f172a', cursor: (callGemini && !fRpStarting) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14,
                    opacity: fRpStarting ? 0.6 : 1
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24, marginTop: 2 } }, cfg.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 700, color: AMBER_DARK, marginBottom: 4 } }, cfg.label),
                    h('div', { style: { fontSize: 12, color: '#64748b', lineHeight: 1.5 } }, cfg.blurb)
                  )
                );
              })
            ),
            fRpStarting && h('p', { 'aria-live': 'polite', style: { textAlign: 'center', marginTop: 12, fontSize: 12, color: AMBER_DARK, fontStyle: 'italic' } }, 'Setting the scene…'),
            !callGemini && h('p', { style: { textAlign: 'center', marginTop: 12, fontSize: 12, color: AMBER_DARK, fontStyle: 'italic' } }, 'AI features need a connection.')
          ),
          fRpScenarioId && fCfg && h('div', null,
            h('div', { style: { padding: '8px 12px', marginBottom: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: AMBER_DARK, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontWeight: 700 } }, fCfg.icon + ' ' + fCfg.label),
              h('button', { onClick: fResetRp, style: { padding: '4px 10px', background: '#fff', color: AMBER_DARK, border: '1px solid #fcd34d', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' } }, '← Different scenario')
            ),
            sceneTxt && h('div', { style: { padding: '10px 12px', marginBottom: 10, background: '#fafafa', border: '1px solid #e5e7eb', borderLeft: '3px solid #f59e0b', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: '#475569', fontStyle: 'italic' } },
              h('span', { style: { fontStyle: 'normal', fontWeight: 700, color: AMBER_DARK, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 } }, 'Scene:'),
              sceneTxt
            ),
            h('div', { 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '40vh', overflowY: 'auto', padding: 4 } },
              fRpHistory.map(function(turn, ti) {
                var isStudent = turn.speaker === 'student';
                var isCoach = turn.speaker === 'coach';
                return h('div', {
                  key: 'f-rp-' + ti,
                  style: {
                    alignSelf: isStudent ? 'flex-end' : 'flex-start', maxWidth: '85%',
                    padding: '10px 13px', borderRadius: 12, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    background: isStudent ? '#eff6ff' : (isCoach ? '#fef3c7' : '#fffbeb'),
                    border: '1px solid ' + (isStudent ? '#bfdbfe' : (isCoach ? '#fcd34d' : '#fde68a')),
                    color: '#1f2937'
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
                onChange: function(ev) { upd('fRpInput', ev.target.value); },
                placeholder: 'What would you actually say? Keep it short — say one thing, then listen.',
                rows: 2, disabled: fRpLoading,
                style: { width: '100%', padding: 10, fontSize: 13, border: '2px solid #fde68a', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
              }),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', {
                  onClick: fSendTurn, disabled: fRpLoading || !fRpInput.trim() || !callGemini, 'aria-busy': fRpLoading ? 'true' : 'false',
                  style: { padding: '10px 16px', background: (fRpLoading || !fRpInput.trim() || !callGemini) ? '#cbd5e1' : '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: (fRpLoading || !fRpInput.trim() || !callGemini) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, fRpLoading ? 'Thinking…' : 'Send →'),
                h('button', {
                  onClick: fCoachBreak, disabled: fRpLoading || !callGemini || fRpHistory.length === 0,
                  style: { padding: '10px 14px', background: '#fff', color: AMBER_DARK, border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 600, cursor: (fRpLoading || !callGemini || fRpHistory.length === 0) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, '🪶 Break character — coach me'),
                fRpHistory.filter(function(t) { return t.speaker === 'student'; }).length >= 2 && h('button', {
                  onClick: fEndRp, disabled: fRpLoading || !callGemini,
                  style: { padding: '10px 14px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: (fRpLoading || !callGemini) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, 'End & reflect')
              )
            ),
            fRpEnded && fRpReflection && h('div', { style: { marginTop: 12, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'How that went'),
              h('p', { style: { margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: '#0f172a', whiteSpace: 'pre-wrap' } }, fRpReflection),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { onClick: function() { fStartRp(fRpScenarioId); }, style: { padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 } }, 'Try again'),
                h('button', { onClick: fResetRp, style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 } }, 'Different scenario')
              )
            ),
            h('p', { style: { margin: '10px 0 0', fontSize: 11, color: AMBER_DARK, fontStyle: 'italic' } }, 'AI-generated. The friend is a simulation. Take what is useful, leave the rest.')
          )
        );
      }

      var content = compassContent || startContent || keepContent || digitalContent || repairContent || endingsContent || coachContent || rehearseContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('friendship', h) : null),
        tabBar,
        heroBand,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content),
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });
})();
