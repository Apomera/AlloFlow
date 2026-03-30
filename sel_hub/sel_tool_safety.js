// ═══════════════════════════════════════════════════════════════
// sel_tool_safety.js — Safety & Boundaries Plugin (v1.0)
// Body safety, trusted adults, consent, boundaries, crisis
// resources, grade-adaptive scenarios, and safety badges.
// Registered tool ID: "safety"
// Category: responsible-decision-making
// Grade-adaptive: K-8 (elementary / middle)
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
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }
  function sfxResolve() { playTone(262, 0.15, 'sine', 0.06); setTimeout(function() { playTone(330, 0.12, 'sine', 0.06); }, 100); setTimeout(function() { playTone(392, 0.12, 'sine', 0.07); }, 200); setTimeout(function() { playTone(523, 0.2, 'sine', 0.09); }, 320); }

  // ══════════════════════════════════════════════════════════════
  // ── Safety Concepts (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var LEARN_TOPICS = {
    elementary: [
      { id: 'body_safety', icon: '\uD83E\uDDD1', title: 'Body Safety', desc: 'Your body belongs to you. No one has the right to touch you in a way that makes you feel uncomfortable.', tip: 'Remember: You are the boss of YOUR body \u2014 always!' },
      { id: 'safe_touch', icon: '\u2764\uFE0F', title: 'Safe vs. Unsafe Touch', desc: 'Safe touches feel caring and kind, like a high-five or a hug you want. Unsafe touches make you feel confused, scared, or icky inside.', tip: 'Remember: Touches that feel wrong ARE wrong. Trust your feelings.' },
      { id: 'trusted_adults', icon: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', title: 'Trusted Adults', desc: 'Trusted adults are grown-ups who keep you safe, listen to you, and believe you. They could be a parent, teacher, counselor, or coach.', tip: 'Remember: Who are the grown-ups you can talk to? Try to name at least 3!' },
      { id: 'saying_no', icon: '\u270B', title: 'Saying No', desc: 'You have the right to say NO to anyone \u2014 even adults \u2014 if something feels wrong or uncomfortable. A safe adult will respect your NO.', tip: 'Remember: It is okay to say NO, even to adults. Your safety comes first.' },
      { id: 'secrets', icon: '\uD83D\uDCEC', title: 'Secrets vs. Surprises', desc: 'Surprises are fun and make people happy (like a birthday party). Unsafe secrets make you feel bad, scared, or worried inside.', tip: 'Remember: Unsafe secrets make you feel bad inside. It is always okay to tell a trusted adult.' },
      { id: 'online_safety', icon: '\uD83D\uDCBB', title: 'Online Safety', desc: 'Never share your real name, address, school, phone number, or photos with strangers online. Not everyone online is who they say they are.', tip: 'Remember: Never share personal info online. If something feels weird, tell a grown-up.' },
      { id: 'bullying', icon: '\uD83D\uDEAB', title: 'Bullying', desc: 'Bullying is when someone is mean to you on purpose, over and over. It is NEVER your fault. You deserve to be treated with kindness.', tip: 'Remember: No one deserves to be bullied. Tell a trusted adult \u2014 you will NOT get in trouble.' },
      { id: 'feelings_signals', icon: '\uD83D\uDEA8', title: 'Feelings as Signals', desc: 'When something feels icky, scary, or confusing, that is your brain\u2019s alarm system telling you something might not be safe.', tip: 'Remember: Icky feelings are your brain\u2019s alarm system. Listen to them and tell someone you trust.' }
    ],
    middle: [
      { id: 'boundaries', icon: '\uD83D\uDEE1\uFE0F', title: 'Personal Boundaries', desc: 'Boundaries are invisible lines that protect your physical space, emotions, and personal information. Everyone has the right to set limits \u2014 and to change them.', tip: 'Remember: Setting boundaries is not rude. It is healthy and brave.' },
      { id: 'consent', icon: '\u2705', title: 'Consent', desc: 'Consent means someone freely and clearly says YES. It must be enthusiastic, informed, and reversible. Silence or pressure is NOT consent. You can change your mind at any time.', tip: 'Remember: Consent must be enthusiastic, informed, and reversible \u2014 every time.' },
      { id: 'digital_safety', icon: '\uD83D\uDCF1', title: 'Digital Safety', desc: 'Everything you share online can be screenshotted, saved, and shared without your knowledge. Think before you send. Protect your digital footprint.', tip: 'Remember: Screenshots are forever. If you would not want it on a billboard, do not send it.' },
      { id: 'peer_pressure', icon: '\uD83E\uDDD2', title: 'Peer Pressure', desc: 'Real friends respect your boundaries and never make you feel bad for saying no. If someone pressures you, that is about their needs, not yours.', tip: 'Remember: Real friends do not pressure you. Your NO is enough \u2014 no explanation needed.' },
      { id: 'grooming', icon: '\u26A0\uFE0F', title: 'Recognizing Grooming', desc: 'Grooming is when someone builds trust to take advantage of you. Warning signs: special treatment, secret-keeping, rule-breaking "just for you," and making you feel like you owe them.', tip: 'Remember: Adults who break rules "just for you" are testing your limits. Tell someone you trust.' },
      { id: 'self_advocacy', icon: '\uD83D\uDDE3\uFE0F', title: 'Self-Advocacy', desc: 'Speaking up about something that is wrong \u2014 or asking for help \u2014 is brave. It is NOT tattling. You have the right to be heard and believed.', tip: 'Remember: Speaking up is brave, not tattling. You deserve to be safe.' },
      { id: 'bystander', icon: '\uD83D\uDC65', title: 'Bystander Action', desc: 'If you see someone being hurt, harassed, or bullied, you have the power to help. Tell a trusted adult, support the person, or safely intervene.', tip: 'Remember: See something? Say something. Your voice can protect others.' },
      { id: 'crisis_resources', icon: '\uD83D\uDCDE', title: 'Crisis Resources', desc: 'You are NEVER alone. No matter what you are going through, trained helpers are available 24/7. You do NOT need to handle hard things by yourself.', tip: 'Remember: You are NEVER alone \u2014 help is always available. Reaching out is the bravest thing you can do.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Crisis Resources (always visible) ──
  // ══════════════════════════════════════════════════════════════
  var CRISIS_RESOURCES = [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', desc: 'Free, confidential, 24/7 support', icon: '\uD83D\uDCDE' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Free crisis counseling via text', icon: '\uD83D\uDCF1' },
    { name: 'Childhelp National Child Abuse Hotline', contact: '1-800-422-4453', desc: 'Professional crisis counselors 24/7', icon: '\u2764\uFE0F' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Safety Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var SAFETY_SCENARIOS = {
    elementary: [
      { id: 'es1', title: 'The Stranger\u2019s Car',
        setup: 'A person you don\u2019t know pulls up in a car and says, "Your mom asked me to pick you up. Hop in!" They seem friendly.',
        choices: [
          { label: 'Get in the car \u2014 they said Mom sent them.', rating: 1, feedback: 'A safe adult would NEVER ask a child to get in a car without your parent telling you first. Even if they seem nice, this is a trick. Your instinct to be cautious is right.' },
          { label: 'Say "No thank you" and run to a trusted adult nearby.', rating: 3, feedback: 'Excellent choice! You said no clearly and got to safety. Your parents would always tell you ahead of time if someone else was picking you up. You did exactly the right thing.' },
          { label: 'Stand there and talk to them to figure out if they are telling the truth.', rating: 2, feedback: 'It is smart to be careful, but talking to a stranger who is trying to get you in a car gives them more time to convince you. The safest thing is to say NO and go to a trusted adult right away.' }
        ] },
      { id: 'es2', title: 'The Secret',
        setup: 'An older kid at school shows you something on their phone and says, "This is our secret. Don\u2019t tell anyone or you\u2019ll get in trouble."',
        choices: [
          { label: 'Keep the secret because you do not want to get in trouble.', rating: 1, feedback: 'When someone tells you to keep a secret AND threatens that you will get in trouble, that is an unsafe secret. You will NOT get in trouble for telling a trusted adult. The person who showed you something wrong is the one who made a bad choice \u2014 not you.' },
          { label: 'Tell a trusted adult what happened.', rating: 3, feedback: 'That is exactly right. Unsafe secrets feel scary and heavy. Telling a trusted adult is always the right move. You are brave for speaking up, and you will NOT get in trouble.' },
          { label: 'Tell your friend but not an adult.', rating: 2, feedback: 'It is good that you did not want to keep this to yourself. But in situations like this, a trusted adult is the best person to tell because they can actually help and protect you.' }
        ] },
      { id: 'es3', title: 'The Uncomfortable Touch',
        setup: 'Someone touches you in a way that makes you feel confused and uncomfortable. They say, "This is normal. Everyone does this."',
        choices: [
          { label: 'Believe them because they are older and must know better.', rating: 1, feedback: 'Just because someone is older does NOT mean they are right. If a touch makes you feel confused, uncomfortable, or scared, it is NOT okay \u2014 no matter what anyone says. This is NEVER your fault.' },
          { label: 'Say "STOP! I don\u2019t like that!" and tell a trusted adult right away.', rating: 3, feedback: 'You are so brave. Saying STOP is powerful. Telling a trusted adult means you will be protected. Remember: this is NOT your fault, and you will NOT get in trouble for telling.' },
          { label: 'Try to forget about it and hope it does not happen again.', rating: 2, feedback: 'It makes sense to want it to go away, and your feelings are completely valid. But telling a trusted adult is the best way to make sure you stay safe. You deserve help and protection.' }
        ] },
      { id: 'es4', title: 'The Dangerous Dare',
        setup: 'A group of friends dares you to climb onto the school roof. They say, "Don\u2019t be a chicken! Everyone has done it!"',
        choices: [
          { label: 'Do it so they do not think you are a coward.', rating: 1, feedback: 'Being called a chicken stings, but a dangerous dare is never worth risking your safety. Real friends will not make you prove yourself by doing something that could hurt you.' },
          { label: 'Say "No, that is dangerous" and walk away.', rating: 3, feedback: 'That takes real courage! Saying no when everyone is watching is one of the hardest \u2014 and bravest \u2014 things you can do. You chose safety, and that is always the right call.' },
          { label: 'Watch them do it but do not do it yourself.', rating: 2, feedback: 'It is good that you did not do the dare. But watching someone do something dangerous without telling an adult means they could get hurt too. A trusted adult can help everyone stay safe.' }
        ] },
      { id: 'es5', title: 'The Online Photo Request',
        setup: 'Someone you met in an online game asks you to send a photo of yourself. They say they want to see what their "gaming buddy" looks like.',
        choices: [
          { label: 'Send a photo \u2014 they seem really nice.', rating: 1, feedback: 'People online are not always who they say they are. A photo of you can be shared, saved, or used in ways you cannot control. Never send photos to people you only know online.' },
          { label: 'Say "I do not share photos online" and tell a parent or trusted adult.', rating: 3, feedback: 'Perfect response! You set a clear boundary AND told a trusted adult. It does not matter how nice someone seems online \u2014 protecting your privacy is always the smart choice.' },
          { label: 'Block them without telling anyone.', rating: 2, feedback: 'Blocking is a good instinct! But telling a trusted adult is also important because they can help make sure this person does not try to contact you another way.' }
        ] }
    ],
    middle: [
      { id: 'ms1', title: 'The Inappropriate Message',
        setup: 'A friend forwards you a message with sexual content from someone at school. They think it is funny and want you to share it too.',
        choices: [
          { label: 'Forward it to keep the joke going.', rating: 1, feedback: 'Sharing sexual content \u2014 especially involving minors \u2014 can have serious legal consequences and deeply hurts the person in the message. Even if you did not create it, forwarding it makes you part of the problem.' },
          { label: 'Delete the message and tell a trusted adult.', rating: 3, feedback: 'That is the right call. You protected yourself legally and ethically, and telling an adult means someone can help the person who was exposed. This takes courage, and it matters.' },
          { label: 'Ignore it and do not forward it, but do not tell anyone either.', rating: 2, feedback: 'Not forwarding is important. But the person in that message may need help, and a trusted adult can step in to protect them. Your voice can make a difference.' }
        ] },
      { id: 'ms2', title: 'The Uncomfortable Comments',
        setup: 'An adult in your life \u2014 a coach, family friend, or mentor \u2014 has started making comments about your body or appearance that make you uncomfortable. They say it is "just a compliment."',
        choices: [
          { label: 'Accept it because they are an adult and probably do not mean anything by it.', rating: 1, feedback: 'Your discomfort is telling you something important. When an adult\u2019s comments make you uncomfortable, that feeling is valid \u2014 regardless of their intentions. You have the right to set boundaries with anyone, including adults.' },
          { label: 'Tell another trusted adult how the comments make you feel.', rating: 3, feedback: 'Absolutely the right move. Trusting your instincts and telling another adult is brave and important. A trusted adult can help you figure out next steps and make sure you feel safe.' },
          { label: 'Try to avoid being alone with that person.', rating: 2, feedback: 'Protecting yourself by creating distance is smart. But telling a trusted adult is important too, because they can help address the situation and make sure it stops. You should not have to manage this alone.' }
        ] },
      { id: 'ms3', title: 'The Cyberbullying Witness',
        setup: 'You see a group chat where several classmates are ganging up on someone \u2014 posting mean comments, fake screenshots, and threatening messages. The target is clearly upset.',
        choices: [
          { label: 'Stay out of it \u2014 it is not your problem.', rating: 1, feedback: 'It is understandable to not want to get involved. But silence can feel like agreement to the person being targeted. Bystanders have more power than they realize.' },
          { label: 'Screenshot the messages and show a trusted adult. Send a private supportive message to the targeted person.', rating: 3, feedback: 'Outstanding. You documented evidence, reported it to someone who can help, and supported the person being hurt. That is powerful bystander action.' },
          { label: 'Privately message the bullies and ask them to stop.', rating: 2, feedback: 'It is brave to speak up directly. But in group cyberbullying situations, involving a trusted adult is important because the behavior often does not stop with peer intervention alone.' }
        ] },
      { id: 'ms4', title: 'The Privacy Pressure',
        setup: 'A peer you are dating pressures you to share a private photo. They say, "If you really liked me, you would trust me. I would never show anyone."',
        choices: [
          { label: 'Send the photo to prove you trust them.', rating: 1, feedback: 'Someone who truly respects you would NEVER pressure you to share something private. Sharing intimate images can have lifelong consequences. This pressure is a red flag, not a sign of love.' },
          { label: 'Say no clearly: "I do care about you, but I am not comfortable with that. If you respect me, you will understand."', rating: 3, feedback: 'That is a strong, clear boundary. Real respect means accepting someone\u2019s no without guilt-tripping them. You showed that you know your worth.' },
          { label: 'Change the subject and hope they stop asking.', rating: 2, feedback: 'Avoiding the topic is understandable, but if they keep pressuring you, a direct no is important. You might also talk to a trusted adult about the pressure you are feeling.' }
        ] },
      { id: 'ms5', title: 'The Warning Signs',
        setup: 'A close friend has been acting differently \u2014 giving away their things, saying goodbye in strange ways, and posting dark messages online. You are worried.',
        choices: [
          { label: 'Assume they are just going through a phase and it will pass.', rating: 1, feedback: 'These warning signs should always be taken seriously. It is better to overreact and be wrong than to underreact and miss a chance to help. Your concern shows you care deeply.' },
          { label: 'Talk to your friend directly AND tell a trusted adult right away.', rating: 3, feedback: 'This is exactly right. Let your friend know you care, and immediately involve a trusted adult who can provide professional support. You may be saving a life. That is not an exaggeration.' },
          { label: 'Ask your friend if they are okay.', rating: 2, feedback: 'Checking in is important and kind. But when warning signs are this serious, telling a trusted adult is essential \u2014 even if your friend asks you not to. Their safety matters more than keeping a secret.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'safety_scholar',   icon: '\uD83D\uDCDA', name: 'Safety Scholar',     desc: 'Read all safety concepts in your grade band' },
    { id: 'boundary_builder', icon: '\uD83E\uDDF1', name: 'Boundary Builder',   desc: 'Complete the My Circle reflection' },
    { id: 'circle_trust',     icon: '\uD83D\uDC9A', name: 'Circle of Trust',    desc: 'Add 3 or more trusted adults to your circle' },
    { id: 'scenario_star',    icon: '\u2B50',        name: 'Scenario Star',      desc: 'Complete your first safety scenario' },
    { id: 'safe_online',      icon: '\uD83D\uDD12', name: 'Safe Online',        desc: 'Read online safety and digital safety topics' },
    { id: 'help_seeker',      icon: '\uD83D\uDCDE', name: 'Help Seeker',        desc: 'View the crisis resources' },
    { id: 'brave_voice',      icon: '\uD83E\uDDB8', name: 'Brave Voice',        desc: 'Complete 3 scenarios with the top rating' },
    { id: 'ally',             icon: '\uD83E\uDD1D', name: 'Ally',               desc: 'Complete bystander or advocacy scenarios' },
    { id: 'quick_thinker',    icon: '\u26A1',        name: 'Quick Thinker',      desc: 'Complete all 5 scenarios in your grade band' },
    { id: 'safety_champion',  icon: '\uD83C\uDFC6', name: 'Safety Champion',    desc: 'Earn 7 or more badges' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('safety', {
    icon: '\uD83D\uDEE1\uFE0F',
    label: 'Safety & Boundaries',
    desc: 'Learn about body safety, trusted adults, consent, digital safety, and how to get help when you need it.',
    color: 'red',
    category: 'responsible-decision-making',
    render: function(ctx) {
      return (function() {
        var React = ctx.React;
        var h = React.createElement;
        var Sparkles = ctx.icons && ctx.icons.Sparkles;
        var addToast = ctx.addToast;
        var awardXP = ctx.awardXP;
        var celebrate = ctx.celebrate;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var band = ctx.gradeBand || 'elementary';
        if (band === 'high') band = 'middle'; // K-8 tool: map high school to middle

        // ── Tool-scoped state ──
        var d = (ctx.toolData && ctx.toolData.safety) || {};
        var upd = function(key, val) {
          if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('safety', key); }
          else { if (ctx.update) ctx.update('safety', key, val); }
        };

        // Navigation
        var activeTab     = d.activeTab || 'learn';
        var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

        // Learn tab state
        var viewedTopics  = d.viewedTopics || {};
        var expandedTopic = d.expandedTopic || null;

        // My Circle tab state
        var trustedAdults  = d.trustedAdults || [];
        var newAdultName   = d.newAdultName || '';
        var newAdultRole   = d.newAdultRole || '';
        var newAdultCat    = d.newAdultCat || 'family';
        var circleReflect  = d.circleReflect || '';
        var circleSaved    = d.circleSaved || false;
        var crisisViewed   = d.crisisViewed || false;

        // Scenarios tab state
        var scenIdx        = d.scenIdx || 0;
        var scenChoice     = d.scenChoice != null ? d.scenChoice : null;
        var scenCompleted  = d.scenCompleted || {};
        var scenTopRatings = d.scenTopRatings || 0;

        // Badges
        var earnedBadges    = d.earnedBadges || {};
        var showBadgePopup  = d.showBadgePopup || null;
        var showBadgesPanel = d.showBadgesPanel || false;

        // ── Helpers ──
        var ACCENT = '#ef4444';
        var ACCENT_DIM = '#ef444422';
        var ACCENT_MED = '#ef444444';

        function tryAwardBadge(badgeId) {
          if (earnedBadges[badgeId]) return;
          var newBadges = Object.assign({}, earnedBadges);
          newBadges[badgeId] = Date.now();
          upd('earnedBadges', newBadges);
          var badge = BADGES.find(function(b) { return b.id === badgeId; });
          if (badge) {
            upd('showBadgePopup', badgeId);
            if (soundEnabled) sfxBadge();
            addToast(badge.icon + ' Badge earned: ' + badge.name + '!', 'success');
            awardXP(25);
            setTimeout(function() { upd('showBadgePopup', null); }, 3000);
          }
          // Check safety champion (7+ badges)
          if (badgeId !== 'safety_champion') {
            var count = Object.keys(newBadges).length;
            if (count >= 7 && !newBadges.safety_champion) {
              setTimeout(function() { tryAwardBadge('safety_champion'); }, 3200);
            }
          }
        }

        function speak(text) {
          if (callTTS) {
            callTTS(text).then(function(url) {
              if (url) { var a = new Audio(url); a.play().catch(function() {}); }
            }).catch(function() {});
          }
        }

        // ══════════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════════
        var tabs = [
          { id: 'learn',     label: '\uD83D\uDCDA Learn' },
          { id: 'circle',    label: '\uD83D\uDC9A My Circle' },
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
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              'aria-selected': isActive,
              role: 'tab',
              style: {
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8',
                transition: 'all 0.15s'
              }
            }, t.label);
          }),
          // Sound toggle
          h('button', {
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b' },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        );

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', {
              style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' },
              onClick: function() { upd('showBadgePopup', null); }
            },
              h('div', {
                style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', animation: 'fadeIn 0.3s', maxWidth: 300 }
              },
                h('div', { style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
                h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
              )
            );
          }
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Learn ──
        // ══════════════════════════════════════════════════════════
        var learnContent = null;
        if (activeTab === 'learn') {
          var topics = LEARN_TOPICS[band] || LEARN_TOPICS.elementary;

          var crisisBanner = h('div', {
            style: { margin: '12px 16px', padding: '14px 16px', borderRadius: 12, background: '#7f1d1d', border: '1px solid #dc2626' }
          },
            h('div', { style: { fontWeight: 700, color: '#fca5a5', fontSize: 13, marginBottom: 6 } }, '\uD83D\uDCDE If you need help RIGHT NOW:'),
            CRISIS_RESOURCES.map(function(cr, i) {
              return h('div', { key: i, style: { padding: '4px 0', fontSize: 12, color: '#fde2e2' } },
                h('span', { style: { fontWeight: 600 } }, cr.icon + ' ' + cr.name + ': '),
                h('span', null, cr.contact)
              );
            }),
            h('div', { style: { marginTop: 8, fontSize: 11, color: '#fca5a5', fontStyle: 'italic' } }, 'You can ALWAYS tell a trusted adult. You will NOT get in trouble.')
          );

          var topicCards = topics.map(function(topic) {
            var isExpanded = expandedTopic === topic.id;
            var isViewed = !!viewedTopics[topic.id];
            return h('div', {
              key: topic.id,
              onClick: function() {
                upd('expandedTopic', isExpanded ? null : topic.id);
                if (!isViewed) {
                  var newViewed = Object.assign({}, viewedTopics);
                  newViewed[topic.id] = true;
                  upd('viewedTopics', newViewed);
                  if (soundEnabled) sfxReveal();
                  // Check safety scholar badge
                  var viewedCount = Object.keys(newViewed).length;
                  if (viewedCount >= topics.length) tryAwardBadge('safety_scholar');
                  // Check safe online badge
                  if (band === 'elementary' && (topic.id === 'online_safety' || newViewed.online_safety)) tryAwardBadge('safe_online');
                  if (band === 'middle' && (topic.id === 'digital_safety' || newViewed.digital_safety)) tryAwardBadge('safe_online');
                }
              },
              style: {
                margin: '0 16px 10px', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExpanded ? ACCENT_MED : '#1e293b'),
                transition: 'all 0.2s'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 24 } }, topic.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 } }, topic.title),
                  !isExpanded && h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, isViewed ? '\u2705 Read' : 'Tap to learn')
                )
              ),
              isExpanded && h('div', { style: { marginTop: 12 } },
                h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 10px' } }, topic.desc),
                h('div', { style: { padding: '10px 12px', borderRadius: 8, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 4 } }, '\uD83D\uDCA1 ' + topic.tip)
                ),
                callTTS && h('button', {
                  onClick: function(e) { e.stopPropagation(); speak(topic.title + '. ' + topic.desc + '. ' + topic.tip); },
                  style: { marginTop: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }
                }, '\uD83D\uDD0A Read aloud')
              )
            );
          });

          learnContent = h('div', { style: { padding: '8px 0 16px' } },
            h('div', { style: { padding: '0 16px 8px', fontSize: 13, color: '#94a3b8' } },
              band === 'elementary'
                ? 'These are important things every kid should know. Tap each card to learn more.'
                : 'Explore these key safety and boundary concepts. Tap each card for details.'
            ),
            crisisBanner,
            topicCards
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: My Circle ──
        // ══════════════════════════════════════════════════════════
        var circleContent = null;
        if (activeTab === 'circle') {
          var catLabels = { family: '\uD83C\uDFE0 Family', school: '\uD83C\uDFEB School', community: '\uD83C\uDF0D Community', hotline: '\uD83D\uDCDE Hotlines' };
          var categories = ['family', 'school', 'community', 'hotline'];

          // Crisis resources section
          var crisisSection = h('div', {
            style: { margin: '0 16px 14px', padding: '14px 16px', borderRadius: 12, background: '#7f1d1d', border: '1px solid #dc2626' }
          },
            h('div', { style: { fontWeight: 700, color: '#fca5a5', fontSize: 13, marginBottom: 8 } }, '\uD83D\uDCDE Crisis Resources \u2014 Always Available'),
            CRISIS_RESOURCES.map(function(cr, i) {
              return h('div', { key: i, style: { padding: '6px 0', borderBottom: i < CRISIS_RESOURCES.length - 1 ? '1px solid #991b1b' : 'none' } },
                h('div', { style: { fontWeight: 600, fontSize: 13, color: '#fde2e2' } }, cr.icon + ' ' + cr.name),
                h('div', { style: { fontSize: 12, color: '#fca5a5' } }, cr.contact),
                h('div', { style: { fontSize: 11, color: '#fca5a588' } }, cr.desc)
              );
            }),
            !crisisViewed && h('button', {
              onClick: function() {
                upd('crisisViewed', true);
                tryAwardBadge('help_seeker');
                if (soundEnabled) sfxResolve();
              },
              style: { marginTop: 10, padding: '6px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, '\u2764\uFE0F I have seen these resources'),
            crisisViewed && h('div', { style: { marginTop: 8, fontSize: 11, color: '#fca5a5', fontStyle: 'italic' } }, '\u2705 You have these resources. You are never alone.')
          );

          // Add trusted adult form
          var addForm = h('div', {
            style: { margin: '0 16px 14px', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 10 } }, '\u2795 Add a Trusted Adult'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('input', {
                type: 'text', placeholder: 'Name', value: newAdultName,
                onChange: function(e) { upd('newAdultName', e.target.value); },
                style: { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, outline: 'none' }
              }),
              h('input', {
                type: 'text', placeholder: 'Role (teacher, aunt, etc.)', value: newAdultRole,
                onChange: function(e) { upd('newAdultRole', e.target.value); },
                style: { flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, outline: 'none' }
              })
            ),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
              categories.filter(function(c) { return c !== 'hotline'; }).map(function(cat) {
                var isActive = newAdultCat === cat;
                return h('button', {
                  key: cat,
                  onClick: function() { upd('newAdultCat', cat); },
                  style: {
                    padding: '4px 10px', borderRadius: 6, border: '1px solid ' + (isActive ? ACCENT : '#334155'), fontSize: 11, cursor: 'pointer',
                    background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8'
                  }
                }, catLabels[cat]);
              })
            ),
            h('button', {
              onClick: function() {
                if (!newAdultName.trim()) return;
                var entry = { name: newAdultName.trim(), role: newAdultRole.trim(), category: newAdultCat, timestamp: Date.now() };
                var updated = trustedAdults.concat([entry]);
                upd({ trustedAdults: updated, newAdultName: '', newAdultRole: '' });
                if (soundEnabled) sfxCorrect();
                addToast('\uD83D\uDC9A Added ' + entry.name + ' to your Circle of Trust!', 'success');
                awardXP(10);
                // Circle of Trust badge
                if (updated.length >= 3) tryAwardBadge('circle_trust');
              },
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
            }, 'Add to My Circle')
          );

          // Display trusted adults by category
          var circleDisplay = categories.map(function(cat) {
            var inCat = trustedAdults.filter(function(a) { return a.category === cat; });
            if (cat === 'hotline') {
              // Pre-filled hotlines
              return h('div', { key: cat, style: { margin: '0 16px 10px' } },
                h('div', { style: { fontWeight: 600, color: '#94a3b8', fontSize: 12, marginBottom: 6 } }, catLabels[cat]),
                CRISIS_RESOURCES.map(function(cr, i) {
                  return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 4, fontSize: 12, color: '#cbd5e1' } },
                    cr.icon + ' ' + cr.name + ' \u2014 ' + cr.contact
                  );
                })
              );
            }
            if (inCat.length === 0) return null;
            return h('div', { key: cat, style: { margin: '0 16px 10px' } },
              h('div', { style: { fontWeight: 600, color: '#94a3b8', fontSize: 12, marginBottom: 6 } }, catLabels[cat]),
              inCat.map(function(adult, i) {
                return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { fontSize: 12, color: '#f1f5f9', fontWeight: 500 } }, adult.name),
                  adult.role && h('span', { style: { fontSize: 11, color: '#64748b' } }, '(' + adult.role + ')'),
                  h('button', {
                    onClick: function() {
                      var filtered = trustedAdults.filter(function(_, idx) { return idx !== trustedAdults.indexOf(adult); });
                      upd('trustedAdults', filtered);
                    },
                    style: { marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }
                  }, '\u2716')
                );
              })
            );
          });

          // Reflection
          var reflectionSection = h('div', {
            style: { margin: '14px 16px', padding: '14px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 600, color: '#f1f5f9', fontSize: 14, marginBottom: 8 } },
              band === 'elementary'
                ? '\uD83D\uDCDD If I needed help, I would talk to ___'
                : '\uD83D\uDCDD Reflection: Who would you turn to, and why?'
            ),
            h('textarea', {
              value: circleReflect,
              onChange: function(e) { upd('circleReflect', e.target.value); },
              placeholder: band === 'elementary'
                ? 'Write the name of someone you trust and why you trust them...'
                : 'Reflect on who you would turn to in different situations and what makes them trustworthy...',
              style: { width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }
            }),
            !circleSaved && circleReflect.trim().length > 10 && h('button', {
              onClick: function() {
                upd('circleSaved', true);
                if (soundEnabled) sfxResolve();
                addToast('\uD83D\uDC9A Reflection saved!', 'success');
                awardXP(15);
                tryAwardBadge('boundary_builder');
              },
              style: { marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
            }, 'Save Reflection'),
            circleSaved && h('div', { style: { marginTop: 8, fontSize: 12, color: '#4ade80' } }, '\u2705 Reflection saved')
          );

          // Affirming message
          var affirmation = h('div', {
            style: { margin: '0 16px 16px', padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500 }
          }, '\uD83D\uDEE1\uFE0F You deserve to feel safe. Building your circle is a powerful step.');

          circleContent = h('div', { style: { padding: '8px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#94a3b8' } },
              band === 'elementary'
                ? 'Your Circle of Trust is a group of safe grown-ups you can talk to about anything \u2014 especially when something feels wrong.'
                : 'Your Circle of Trust includes the people you can rely on. Mapping them out means you know exactly who to turn to.'
            ),
            crisisSection,
            addForm,
            circleDisplay,
            reflectionSection,
            affirmation
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Scenarios ──
        // ══════════════════════════════════════════════════════════
        var scenariosContent = null;
        if (activeTab === 'scenarios') {
          var scenarios = SAFETY_SCENARIOS[band] || SAFETY_SCENARIOS.elementary;
          var scen = scenarios[scenIdx];
          var completedCount = Object.keys(scenCompleted).length;

          var scenNav = h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 10px' }
          },
            h('button', {
              onClick: function() { upd({ scenIdx: Math.max(0, scenIdx - 1), scenChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: scenIdx === 0,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: scenIdx === 0 ? '#334155' : '#94a3b8', cursor: scenIdx === 0 ? 'default' : 'pointer', fontSize: 12 }
            }, '\u25C0 Prev'),
            h('span', { style: { fontSize: 12, color: '#94a3b8' } }, (scenIdx + 1) + ' / ' + scenarios.length),
            h('button', {
              onClick: function() { upd({ scenIdx: Math.min(scenarios.length - 1, scenIdx + 1), scenChoice: null }); if (soundEnabled) sfxClick(); },
              disabled: scenIdx === scenarios.length - 1,
              style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: scenIdx === scenarios.length - 1 ? '#334155' : '#94a3b8', cursor: scenIdx === scenarios.length - 1 ? 'default' : 'pointer', fontSize: 12 }
            }, 'Next \u25B6'),
            h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#64748b' } }, '\u2705 ' + completedCount + '/' + scenarios.length + ' completed')
          );

          var scenCard = h('div', {
            style: { margin: '0 16px', padding: '16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }
          },
            h('div', { style: { fontWeight: 700, color: '#f1f5f9', fontSize: 16, marginBottom: 4 } }, scen.title),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: '1.6', margin: '8px 0 14px' } }, scen.setup),
            callTTS && h('button', {
              onClick: function() { speak(scen.title + '. ' + scen.setup); },
              style: { marginBottom: 12, background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }
            }, '\uD83D\uDD0A Read aloud'),
            h('div', { style: { fontWeight: 600, color: '#94a3b8', fontSize: 12, marginBottom: 8 } }, 'What would you do?'),
            scen.choices.map(function(choice, i) {
              var isSelected = scenChoice === i;
              var isCompleted = scenCompleted[scen.id] != null;
              var ratingColors = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };
              return h('div', { key: i },
                h('button', {
                  onClick: function() {
                    if (isCompleted) return;
                    upd('scenChoice', i);
                    if (soundEnabled) { choice.rating === 3 ? sfxCorrect() : sfxReveal(); }
                    // Mark completed
                    var newCompleted = Object.assign({}, scenCompleted);
                    newCompleted[scen.id] = { choice: i, rating: choice.rating };
                    upd('scenCompleted', newCompleted);
                    awardXP(choice.rating === 3 ? 20 : 10);
                    // Badge: scenario star (first completion)
                    if (Object.keys(newCompleted).length === 1) tryAwardBadge('scenario_star');
                    // Badge: quick thinker (all 5 completed)
                    if (Object.keys(newCompleted).length >= scenarios.length) tryAwardBadge('quick_thinker');
                    // Track top ratings
                    var topCount = 0;
                    Object.keys(newCompleted).forEach(function(k) { if (newCompleted[k].rating === 3) topCount++; });
                    upd('scenTopRatings', topCount);
                    // Badge: brave voice (3 top ratings)
                    if (topCount >= 3) tryAwardBadge('brave_voice');
                    // Badge: ally (bystander/advocacy scenarios)
                    var allyIds = ['ms3', 'es2', 'ms5'];
                    var hasAlly = allyIds.some(function(aid) { return newCompleted[aid] && newCompleted[aid].rating >= 2; });
                    if (hasAlly) tryAwardBadge('ally');
                  },
                  style: {
                    width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: isCompleted ? 'default' : 'pointer',
                    border: '1px solid ' + (isSelected ? ratingColors[choice.rating] + '66' : '#334155'),
                    background: isSelected ? ratingColors[choice.rating] + '15' : '#0f172a',
                    color: '#e2e8f0', fontSize: 13, lineHeight: '1.4',
                    transition: 'all 0.2s'
                  }
                }, choice.label),
                isSelected && h('div', {
                  style: { padding: '10px 14px', marginBottom: 8, borderRadius: 8, background: ratingColors[choice.rating] + '15', border: '1px solid ' + ratingColors[choice.rating] + '44' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: ratingColors[choice.rating] } },
                      choice.rating === 3 ? '\u2B50 Great choice!' : choice.rating === 2 ? '\uD83D\uDCA1 Good thinking, but...' : '\u26A0\uFE0F Let\u2019s think about this...'
                    )
                  ),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', margin: 0 } }, choice.feedback),
                  callTTS && h('button', {
                    onClick: function() { speak(choice.feedback); },
                    style: { marginTop: 6, background: 'none', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }
                  }, '\uD83D\uDD0A Read feedback aloud')
                )
              );
            })
          );

          // Affirming footer
          var scenFooter = h('div', {
            style: { margin: '14px 16px', padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.5' }
          },
            band === 'elementary'
              ? 'Remember: You can ALWAYS tell a trusted adult. It is NEVER your fault. You will NOT get in trouble for telling the truth.'
              : 'Remember: Your safety always comes first. Trust your instincts. No one has the right to make you feel unsafe. You are never alone.'
          );

          // Crisis resources mini-banner
          var scenCrisis = h('div', {
            style: { margin: '0 16px 16px', padding: '10px 14px', borderRadius: 8, background: '#7f1d1d', fontSize: 11, color: '#fca5a5' }
          },
            '\uD83D\uDCDE Need help? 988 (call/text) \u2022 Text HOME to 741741 \u2022 1-800-422-4453'
          );

          scenariosContent = h('div', { style: { padding: '12px 0 16px' } },
            h('div', { style: { padding: '0 16px 10px', fontSize: 13, color: '#94a3b8' } },
              band === 'elementary'
                ? 'Read each situation carefully. Choose what you would do. There are no wrong feelings \u2014 only safer choices.'
                : 'These scenarios help you practice making safe decisions. Read carefully and choose your response.'
            ),
            scenNav,
            scenCard,
            scenFooter,
            scenCrisis
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Badges ──
        // ══════════════════════════════════════════════════════════
        var badgesContent = null;
        if (activeTab === 'badges') {
          var earnedCount = Object.keys(earnedBadges).length;

          badgesContent = h('div', { style: { padding: '12px 16px' } },
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 32, marginBottom: 4 } }, '\uD83C\uDFC5'),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' } }, earnedCount + ' / ' + BADGES.length + ' Badges'),
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, earnedCount === 0 ? 'Start exploring to earn badges!' : earnedCount >= 7 ? 'You are a Safety Champion!' : 'Keep going \u2014 you are doing great!')
            ),
            // Progress bar
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', marginBottom: 20 } },
              h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((earnedCount / BADGES.length) * 100) + '%', transition: 'width 0.3s' } })
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', {
                  key: b.id,
                  style: { padding: 14, borderRadius: 12, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#1e293b'), textAlign: 'center', opacity: earned ? 1 : 0.5, transition: 'all 0.2s' }
                },
                  h('div', { style: { fontSize: 30 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: earned ? '#f1f5f9' : '#64748b', marginTop: 6 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3 } }, b.desc),
                  earned && h('div', { style: { fontSize: 9, color: '#4ade80', marginTop: 4 } }, '\u2705 Earned ' + new Date(earnedBadges[b.id]).toLocaleDateString())
                );
              })
            ),
            // Affirming footer
            h('div', {
              style: { marginTop: 20, padding: '12px 14px', borderRadius: 10, background: ACCENT_DIM, textAlign: 'center', fontSize: 12, color: ACCENT, fontWeight: 500, lineHeight: '1.5' }
            }, '\uD83D\uDEE1\uFE0F Learning about safety is one of the most important things you can do. Every badge represents knowledge that helps protect you and others.')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── AI Safety Coach ──
        // ══════════════════════════════════════════════════════════
        // (Integrated into Learn tab via callGemini when available)

        // ══════════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════════
        var content = learnContent || circleContent || scenariosContent || badgesContent;

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });
})();

console.log('[SelHub] sel_tool_safety.js loaded');
