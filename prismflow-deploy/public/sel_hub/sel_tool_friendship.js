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
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
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
      // Friendship journal
      var friendNotes   = d.friendNotes || [];
      var newNote       = d.newNote || '';

      var AMBER = '#d97706'; var AMBER_LIGHT = '#fffbeb'; var AMBER_DARK = '#78350f';

      var TABS = [
        { id: 'compass',  icon: '\uD83E\uDDED', label: 'My Style' },
        { id: 'start',    icon: '\uD83D\uDCAC', label: 'Starting' },
        { id: 'keep',     icon: '\uD83D\uDC9B', label: 'Keeping' },
        { id: 'repair',   icon: '\uD83E\uDE79', label: 'Repair' },
        { id: 'endings',  icon: '\uD83C\uDF43', label: 'Endings' },
        { id: 'coach',    icon: '\uD83E\uDD16', label: 'Practice' },
      ];

      var tabBar = h('div', {
        style: { display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid #fde68a', background: AMBER_LIGHT, flexShrink: 0, overflowX: 'auto' },
        role: 'tablist', 'aria-label': 'Friendship sections'
      },
        TABS.map(function(t) {
          var active = activeTab === t.id;
          return h('button', {
            key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 14px', borderRadius: '8px', border: 'none', background: active ? AMBER : 'transparent', color: active ? '#fff' : '#374151', fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.15s', boxShadow: active ? '0 2px 8px rgba(217,119,6,0.3)' : 'none' }
          }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label);
        }),
        h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, 'aria-label': soundEnabled ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
      );

      // ── My Style (Friendship Compass) ──
      var compassContent = null;
      if (activeTab === 'compass') {
        compassContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83E\uDDED'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'What Kind of Friend Am I?'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, 'Everyone has a friendship style \u2014 the way they naturally show they care. Which one sounds most like you?')
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
                h('div', { style: { fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 } }, fs.desc)
              );
            })
          ),
          myStyle && (function() {
            var style = FRIEND_STYLES.find(function(s) { return s.id === myStyle; });
            if (!style) return null;
            return h('div', { style: { marginTop: '16px', background: AMBER_LIGHT, borderRadius: '14px', padding: '16px', border: '2px solid #fde68a' } },
              h('div', { style: { fontSize: '14px', fontWeight: 700, color: AMBER_DARK, marginBottom: '8px' } }, style.icon + ' You\u2019re ' + style.label + '!'),
              h('div', { style: { fontSize: '13px', color: '#374151', marginBottom: '6px' } }, '\u2728 Superpower: ' + style.strength),
              h('div', { style: { fontSize: '13px', color: '#6b7280' } }, '\uD83D\uDCA1 Growth edge: ' + style.watchFor)
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
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83D\uDCAC'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Starting a Friendship'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, band === 'elementary' ? 'The hardest part is the first words. Here\u2019s what to say.' : 'Specific words for specific situations. Practice makes natural.')
          ),
          // Scenario card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, '\uD83C\uDFAD Situation'),
            h('p', { style: { fontSize: '14px', color: '#1f2937', fontWeight: 600, margin: '0 0 14px' } }, cur.situation),
            h('div', { style: { background: AMBER_LIGHT, borderRadius: '12px', padding: '14px', borderLeft: '4px solid ' + AMBER, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, marginBottom: '4px' } }, '\uD83D\uDDE3\uFE0F You could say:'),
              h('p', { style: { fontSize: '15px', fontWeight: 700, color: AMBER_DARK, margin: 0, fontStyle: 'italic' } }, '"' + cur.say + '"')
            ),
            h('div', { style: { fontSize: '12px', color: '#6b7280', lineHeight: 1.5 } }, '\uD83D\uDCA1 Why it works: ' + cur.why)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('starterIdx', (starterIdx - 1 + starters.length) % starters.length); }, 'aria-label': 'Previous starter', style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' } }, '\u2190 Prev'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#6b7280' } }, (starterIdx % starters.length + 1) + ' / ' + starters.length),
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
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83D\uDC9B'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Keeping Friends'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, 'Friendships need care. Small, consistent actions matter more than grand gestures.')
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
            h('p', { style: { fontSize: '11px', color: '#6b7280', margin: '0 0 8px' } }, 'Write about a friendship moment \u2014 something kind someone did, a fun memory, or something you\u2019re grateful for.'),
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
                  h('span', { style: { color: '#6b7280', fontSize: '10px' } }, note.date + ' \u2014 '),
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
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83E\uDE79'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Friendship Repair'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, band === 'elementary' ? 'When friends hurt each other, here\u2019s how to fix it.' : 'Conflict doesn\u2019t have to mean the end. These steps help you navigate back to each other.')
          ),
          // Step progress
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' } },
            steps.map(function(s, i) {
              var isCurrent = i === repairIdx % steps.length;
              return h('button', {
                key: i, role: 'button', tabIndex: 0,
                'aria-label': 'Step ' + (i + 1) + ': ' + s.step + (isCurrent ? ' (current)' : ''),
                onClick: function() { upd('repairIdx', i); if (soundEnabled) sfxClick(); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); upd('repairIdx', i); } },
                style: { width: '36px', height: '36px', borderRadius: '50%', border: isCurrent ? '3px solid ' + AMBER : '2px solid #e5e7eb', background: isCurrent ? AMBER : '#fff', color: isCurrent ? '#fff' : '#374151', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }
              }, i + 1);
            })
          ),
          // Step card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '28px' } }, curStep.icon),
              h('div', null,
                h('div', { style: { fontSize: '10px', color: '#6b7280' } }, 'Step ' + ((repairIdx % steps.length) + 1) + ' of ' + steps.length),
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: '#1f2937', margin: 0 } }, curStep.step)
              )
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 12px' } }, curStep.desc),
            h('div', { style: { background: '#fef3c7', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', fontWeight: 600, color: '#92400e', margin: 0 } }, '\uD83D\uDCA1 ' + curStep.tip)
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('repairIdx', (repairIdx - 1 + steps.length) % steps.length); }, 'aria-label': 'Previous step', style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' } }, '\u2190 Prev'),
            h('button', { onClick: function() { upd('repairIdx', (repairIdx + 1) % steps.length); if (soundEnabled) sfxClick(); }, 'aria-label': 'Next step', style: { padding: '8px 16px', background: AMBER, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' } }, 'Next \u2192')
          )
        );
      }

      // ── When Friendships End ──
      var endingsContent = null;
      if (activeTab === 'endings') {
        var truths = ENDING_TRUTHS[band] || ENDING_TRUTHS.elementary;
        endingsContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDF43'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'When Friendships Change'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, 'Sometimes friendships end or change shape. That\u2019s one of the hardest parts of growing up.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            truths.map(function(truth, i) {
              return h('div', { key: i, style: { background: i === endingIdx ? '#fff8f0' : '#fff', border: i === endingIdx ? '2px solid #fdba74' : '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' },
                onClick: function() { upd('endingIdx', i); if (soundEnabled) sfxClick(); }
              },
                h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: 0, fontStyle: i === endingIdx ? 'normal' : 'italic' } }, truth)
              );
            })
          ),
          h('p', { style: { fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '16px', fontStyle: 'italic' } },
            band === 'elementary' ? 'It\u2019s okay to feel sad. It\u2019s also okay to feel relieved. All feelings are allowed.'
            : 'Letting go of a friendship can be one of the most mature things you ever do. Honor what was, and make space for what\u2019s coming.')
        );
      }

      // ── AI Practice Coach ──
      var coachContent = null;
      if (activeTab === 'coach') {
        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Friendship Practice'),
            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, 'Describe a friendship situation and practice what to say.')
          ),
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Friendship practice conversation', 'aria-live': 'polite', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
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
                  callGemini(prompt, true).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false }); if (awardXP) awardXP(5, 'Practiced friendship skills!'); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But here\u2019s what I know: the fact that you\u2019re thinking about how to be a better friend means you already are one.' }]), coachLoading: false }); });
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
                callGemini(prompt, true).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting, but I believe in you. The courage to think about friendship is itself an act of friendship.' }]), coachLoading: false }); });
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? AMBER : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728')
          ),
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' } }, 'Try:'),
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

      var content = compassContent || startContent || keepContent || repairContent || endingsContent || coachContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
