// ═══════════════════════════════════════════════════════════════
// sel_tool_compassion.js — Self-Compassion Workshop (v1.0)
// Based on Kristin Neff's three pillars: self-kindness, common
// humanity, and mindfulness. Teaches students to treat themselves
// with the same warmth they'd offer a friend who is struggling.
// The antidote to the inner critic.
// Registered tool ID: "compassion"
// Category: self-awareness
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
    if (document.getElementById('allo-live-compassion')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-compassion'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── WCAG 2.3.3: Reduced-motion guard ──
  (function() {
    if (document.getElementById('allo-compassion-rm-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-compassion-rm-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  function sfxClick() { tone(880, 0.04, 'sine', 0.05); }
  function sfxWarm() { tone(262, 0.25, 'sine', 0.04); setTimeout(function() { tone(330, 0.25, 'sine', 0.04); }, 200); setTimeout(function() { tone(392, 0.3, 'sine', 0.05); }, 400); }
  function sfxHeart() { tone(392, 0.15, 'sine', 0.06); setTimeout(function() { tone(494, 0.2, 'sine', 0.07); }, 150); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  var PILLARS = {
    elementary: [
      { id: 'kindness', icon: '\uD83D\uDC9C', title: 'Self-Kindness', color: '#a78bfa',
        explain: 'When your friend is having a hard time, you\u2019re nice to them, right? You say kind things, maybe give them a hug. Self-kindness means doing that same thing \u2014 for yourself. When YOU\u2019re having a hard time, instead of saying "I\u2019m so dumb," you say "This is hard, and it\u2019s okay that it\u2019s hard."',
        opposite: 'Self-judgment sounds like: "I\u2019m so stupid." "Everyone else can do this." "What\u2019s wrong with me?"',
        practice: 'Next time you make a mistake, try putting your hand on your heart and saying: "It\u2019s okay. Everyone makes mistakes. I\u2019m still learning."' },
      { id: 'humanity', icon: '\uD83C\uDF0D', title: 'Common Humanity', color: '#60a5fa',
        explain: 'When something goes wrong, it can feel like you\u2019re the only person in the whole world who messes up. But that\u2019s never true. Every single person \u2014 your teacher, your parents, your favorite athlete \u2014 has felt embarrassed, made mistakes, and had hard days.',
        opposite: 'Isolation sounds like: "Nobody understands." "I\u2019m the only one who can\u2019t do this." "Everyone else has it figured out."',
        practice: 'When something goes wrong, try saying: "Other kids feel this way too. I\u2019m not alone in this."' },
      { id: 'mindful', icon: '\uD83E\uDDD8', title: 'Mindfulness', color: '#34d399',
        explain: 'Mindfulness means noticing how you feel without making it BIGGER or trying to push it away. If you\u2019re sad, you don\u2019t have to pretend you\u2019re happy. You also don\u2019t have to be sad about being sad. You just notice: "I feel sad right now. That\u2019s okay."',
        opposite: 'Over-identification sounds like: "I\u2019m ALWAYS sad." "This will NEVER get better." "My whole life is ruined."',
        practice: 'Try naming your feeling like a weather report: "Right now there\u2019s some frustration passing through. It won\u2019t stay forever."' }
    ],
    middle: [
      { id: 'kindness', icon: '\uD83D\uDC9C', title: 'Self-Kindness', color: '#a78bfa',
        explain: 'Self-kindness means treating yourself with the same warmth you\u2019d offer a friend. Most people are significantly harsher with themselves than they\u2019d ever be with someone they care about. Self-kindness isn\u2019t about lowering standards \u2014 it\u2019s about responding to failure with encouragement instead of punishment.',
        opposite: 'Self-judgment: the inner critic that says "you\u2019re not good enough." It feels motivating but research shows it actually decreases performance and increases anxiety.',
        practice: 'When you catch your inner critic, ask: "Would I say this to my best friend?" If not, rephrase it as if you were talking to someone you love.' },
      { id: 'humanity', icon: '\uD83C\uDF0D', title: 'Common Humanity', color: '#60a5fa',
        explain: 'Suffering is not a personal failure \u2014 it\u2019s a shared human experience. When we\u2019re struggling, our brain tells us we\u2019re uniquely broken. In reality, the feeling of "I\u2019m the only one who can\u2019t handle this" is itself one of the most universal human experiences.',
        opposite: 'Isolation: believing your pain is uniquely yours. Social media amplifies this \u2014 you see everyone\u2019s highlight reel and compare it to your behind-the-scenes.',
        practice: 'When you feel alone in your struggle, try: "This is a moment of suffering. Suffering is part of being human. Other people feel exactly this way right now."' },
      { id: 'mindful', icon: '\uD83E\uDDD8', title: 'Mindfulness', color: '#34d399',
        explain: 'Mindfulness in self-compassion means acknowledging pain without drowning in it. It\u2019s the balanced awareness that says "this hurts" without adding "and it will hurt forever" or "and I deserve it." You can\u2019t be compassionate toward something you won\u2019t acknowledge.',
        opposite: 'Over-identification: "I AM a failure" instead of "I experienced a failure." The difference is identity vs. event. Events end. Identities feel permanent.',
        practice: 'Practice labeling: "I notice I\u2019m feeling anxious" instead of "I\u2019m anxious." The word "notice" creates space between you and the feeling.' }
    ],
    high: [
      { id: 'kindness', icon: '\uD83D\uDC9C', title: 'Self-Kindness', color: '#a78bfa',
        explain: 'Kristin Neff\u2019s research shows that self-compassion, not self-esteem, is the strongest predictor of emotional resilience. Self-esteem is contingent \u2014 it rises with success and crashes with failure. Self-compassion is unconditional: "I am worthy of kindness regardless of my performance." This isn\u2019t weakness. fMRI studies show self-compassion activates the care system (oxytocin, endorphins) while self-criticism activates the threat system (cortisol, adrenaline).',
        opposite: 'Self-judgment activates the amygdala\u2019s threat response. You\u2019re literally attacking yourself. Your brain can\u2019t distinguish between external and internal criticism \u2014 it responds to both with fight-or-flight.',
        practice: 'Neff\u2019s Self-Compassion Break: (1) "This is a moment of suffering" (mindfulness). (2) "Suffering is a part of life" (common humanity). (3) "May I be kind to myself" (self-kindness). Hand on heart. Breathe.' },
      { id: 'humanity', icon: '\uD83C\uDF0D', title: 'Common Humanity', color: '#60a5fa',
        explain: 'The illusion of separateness \u2014 that your pain is uniquely yours \u2014 is one of the deepest sources of suffering. Common humanity doesn\u2019t mean "other people have it worse" (that\u2019s toxic comparison). It means "the experience of inadequacy and pain is itself a connecting experience." Your struggle links you to every human who has ever struggled, which is every human.',
        opposite: 'Isolation creates a paradox: the more alone you feel in your suffering, the more universal that feeling actually is. Loneliness is the most common human experience.',
        practice: 'Try loving-kindness meditation: "May I be safe. May I be healthy. May I live with ease." Then extend it: "May all people who are struggling right now also be safe, healthy, and live with ease."' },
      { id: 'mindful', icon: '\uD83E\uDDD8', title: 'Mindfulness', color: '#34d399',
        explain: 'Mindfulness in self-compassion is the middle path between suppression and rumination. Suppression says "I shouldn\u2019t feel this." Rumination says "Let me replay this failure 47 times." Mindfulness says "I notice this pain. I hold it gently. I don\u2019t need to fix it or flee from it right now."',
        opposite: 'Over-identification fuses you with your experience: "I AM my anxiety." Mindful observation creates distance: "I am a person who is currently experiencing anxiety." The anxiety is weather. You are the sky.',
        practice: 'R.A.I.N. meditation (Tara Brach): Recognize what\u2019s happening. Allow it to be there. Investigate with kindness. Non-identification \u2014 you are not this feeling.' }
    ]
  };

  // Inner Critic → Inner Friend reframes
  var CRITIC_REFRAMES = {
    elementary: [
      { critic: 'I\u2019m so stupid.', friend: 'That was confusing! Let me try again a different way.', note: 'Calling yourself stupid is like kicking yourself when you\u2019re already down. A friend would never do that.' },
      { critic: 'Nobody likes me.', friend: 'I\u2019m having a hard day with friends. Some days are like that.', note: 'One bad day doesn\u2019t mean always. Feelings are visitors, not residents.' },
      { critic: 'I can\u2019t do anything right.', friend: 'I made a mistake on this one thing. I do lots of things well.', note: 'One mistake doesn\u2019t erase everything good. That\u2019s your brain being unfair.' },
      { critic: 'I\u2019m ugly.', friend: 'I\u2019m me, and there\u2019s nobody else like me. That\u2019s actually pretty cool.', note: 'Bodies come in every shape and size. The world would be boring if everyone looked the same.' },
      { critic: 'Everyone is better than me.', friend: 'Everyone is good at different things. I haven\u2019t found all of mine yet.', note: 'Comparing your worst to someone else\u2019s best isn\u2019t fair \u2014 to you.' },
      { critic: 'I always mess everything up.', friend: 'I messed up this time. That happens to everyone. What can I learn?', note: '"Always" and "everything" are lies your inner critic tells. Challenge them.' },
    ],
    middle: [
      { critic: 'I\u2019m such a loser.', friend: 'I\u2019m going through a rough patch. This doesn\u2019t define me.', note: 'Would you call your best friend a loser for struggling? Then why say it to yourself?' },
      { critic: 'I don\u2019t deserve good things.', friend: 'I\u2019m human and I deserve kindness, especially from myself.', note: 'Worthiness isn\u2019t earned through performance. You deserve kindness simply because you exist.' },
      { critic: 'I\u2019m not as good as everyone else on social media.', friend: 'I\u2019m comparing my unfiltered life to curated highlights. That\u2019s not a fair comparison.', note: 'Behind every perfect post is a person who also cries, fails, and doubts themselves.' },
      { critic: 'If people really knew me, they wouldn\u2019t like me.', friend: 'The people who matter will love the real me. Hiding myself is exhausting.', note: 'Imposter syndrome is almost universal in middle school. You\u2019re not faking \u2014 you\u2019re growing.' },
      { critic: 'I should be over this by now.', friend: 'Healing has its own timeline. I\u2019m allowed to still be processing this.', note: 'There\u2019s no deadline for pain. "Should" is the inner critic\u2019s favorite word.' },
    ],
    high: [
      { critic: 'I\u2019m falling behind in life.', friend: 'There is no universal timeline. My path is mine and I\u2019m exactly where my journey has taken me.', note: 'Instagram didn\u2019t exist when Einstein was 22, working as a patent clerk. "Behind" is a constructed comparison.' },
      { critic: 'I\u2019m not talented enough to pursue what I love.', friend: 'Passion + effort is more sustainable than talent alone. I can develop what I care about.', note: 'Angela Duckworth\u2019s research: grit predicts success better than talent. Caring deeply IS the qualification.' },
      { critic: 'I should be able to handle this on my own.', friend: 'Asking for support is wisdom, not weakness. The strongest people I know have therapists.', note: 'Individualism is a cultural myth. No significant human achievement has been solo.' },
      { critic: 'My anxiety makes me weak.', friend: 'My anxiety shows that my brain is trying to protect me. I can thank it and then choose how to respond.', note: 'Anxiety is the nervous system doing its job too enthusiastically. It\u2019s not a character flaw.' },
      { critic: 'I\u2019ve wasted so much time.', friend: 'Every experience taught me something, even if the lesson was "not this." There\u2019s no such thing as a wasted path.', note: 'Rumi: "The wound is the place where the Light enters you." The detours aren\u2019t waste. They\u2019re depth.' },
    ]
  };

  // Guided practice protocols (interactive, evidence-based)
  var PRACTICES = [
    {
      id: 'break',
      icon: '\uD83E\uDDD8',
      title: 'Self-Compassion Break',
      duration: '~3 minutes',
      source: 'Neff (2011)',
      intro: 'Three steps you can return to anytime. Bring to mind something difficult you are facing right now, or recently. Hold it in your mind as you move through the steps.',
      steps: [
        { id: 's1', label: 'Mindfulness', phrase: 'This is a moment of suffering.', body: 'Acknowledge the difficulty without trying to fix it or push it away. Place a hand over your heart if it helps. Notice that something hurts. Stay with it for two slow breaths.', voiceover: 'This is a moment of suffering. Notice that something hurts. Two slow breaths.' },
        { id: 's2', label: 'Common Humanity', phrase: 'Suffering is part of being human.', body: 'Everyone struggles. Everyone has moments like this. You are not alone in feeling what you feel. Somewhere right now, another person is feeling exactly this. Two slow breaths.', voiceover: 'Suffering is part of being human. Other people are feeling this too. Two slow breaths.' },
        { id: 's3', label: 'Self-Kindness', phrase: 'May I be kind to myself.', body: 'Offer yourself the same words you would offer a friend in this situation. You can use these phrases, or your own: May I give myself the kindness I need. May I accept myself as I am. May I be patient.', voiceover: 'May I be kind to myself. May I give myself the kindness I need.' }
      ],
      closing: 'Notice the shift, however small. The break does not make the hard thing go away. It changes how you carry it.'
    },
    {
      id: 'rain',
      icon: '\uD83C\uDF27\uFE0F',
      title: 'R.A.I.N.',
      duration: '~5 minutes',
      source: 'Brach (2013)',
      intro: 'A four-step practice for working with strong emotions. Bring to mind a feeling that is present right now, or one that has been showing up for you lately.',
      steps: [
        { id: 'r1', label: 'Recognize', phrase: 'What is here?', body: 'Name what you are feeling. "I notice anxiety." "I notice sadness." Naming creates space. The more specific, the better.', voiceover: 'Recognize. What is here? Name what you are feeling.' },
        { id: 'r2', label: 'Allow', phrase: 'Let it be.', body: 'Let the feeling be present. Do not try to fix it, change it, or distract from it. Allowing does not mean approving. It means stopping the fight against your own experience.', voiceover: 'Allow. Let the feeling be there. Stop fighting it.' },
        { id: 'r3', label: 'Investigate', phrase: 'Where do I feel this?', body: 'Investigate with kindness, not analysis. Where in your body does this feeling live? What does it want you to know? What is underneath it?', voiceover: 'Investigate. Where in your body do you feel this? What does it want you to know?' },
        { id: 'r4', label: 'Nurture', phrase: 'What do I need?', body: 'Offer the part of you that is hurting what it actually needs. A word. A breath. A hand on your chest. The reminder that you are loved.', voiceover: 'Nurture. What does this part of you need? Offer it now.' }
      ],
      closing: 'After RAIN, rest. Notice what is here now. The practice is not about the steps; it is about the relationship you are building with yourself.'
    }
  ];

  // Self-compassion letter prompts
  var LETTER_PROMPTS = {
    elementary: 'Write to yourself like you\u2019re writing to your best friend who is having a hard day. What would you tell them? Be as kind as you can.',
    middle: 'Write a letter to yourself about something you\u2019re struggling with. Write it the way you would if your closest friend came to you with this exact problem. Don\u2019t hold back on the kindness.',
    high: 'Write to yourself from the perspective of an unconditionally loving friend who knows everything about you \u2014 your fears, your failures, your secret doubts \u2014 and loves you not despite them but including them. What would this friend say about what you\u2019re going through?'
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('compassion', {
    icon: '\uD83D\uDC9C',
    label: 'Self-Compassion',
    desc: 'Learn to treat yourself with the kindness you\u2019d give a friend \u2014 the antidote to the inner critic.',
    color: 'purple',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      var d = (ctx.toolData && ctx.toolData.compassion) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('compassion', key); }
        else { if (ctx.update) ctx.update('compassion', key, val); }
      };

      var activeTab    = d.activeTab || 'pillars';
      var soundOn      = d.soundOn != null ? d.soundOn : true;
      var pillarIdx    = d.pillarIdx || 0;
      var criticIdx    = d.criticIdx || 0;
      var criticInput  = d.criticInput || '';
      var criticShow   = d.criticShow || false;
      var criticScore  = d.criticScore || 0;
      var letterDraft  = d.letterDraft || '';
      var savedLetters = d.savedLetters || [];
      var coachInput   = d.coachInput || '';
      var coachHistory = d.coachHistory || [];
      var coachLoading = d.coachLoading || false;
      var practiceId        = d.practiceId || null;
      var practiceStep      = d.practiceStep || 0;
      var practiceReflection= d.practiceReflection || '';
      var practiceCompleted = d.practiceCompleted || {};

      var PURPLE = '#7c3aed'; var PL = '#f5f3ff'; var PD = '#4c1d95';

      var TABS = [
        { id: 'pillars', icon: '\uD83D\uDC9C', label: 'Three Pillars' },
        { id: 'critic',  icon: '\uD83D\uDDE3\uFE0F', label: 'Inner Friend' },
        { id: 'practice',icon: '\uD83E\uDDD8', label: 'Practice' },
        { id: 'letter',  icon: '\u2709\uFE0F', label: 'Kind Letter' },
        { id: 'coach',   icon: '\uD83E\uDD16', label: 'Compassion Coach' },
      ];

      // Track explored tabs
      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #ddd6fe', background: 'linear-gradient(180deg, #faf5ff, #f5f3ff)', flexShrink: 0 }
      },
        // Progress bar
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + PURPLE + ', #a78bfa)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Self-Compassion sections'
        },
          TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', { key: t.id, role: 'tab', className: 'sel-tab' + (a ? ' sel-tab-active' : ''), 'aria-selected': a ? 'true' : 'false', onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#ddd6fe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + PURPLE + ', #6d28d9)' : explored ? 'rgba(124,58,237,0.06)' : 'transparent', color: a ? '#fff' : explored ? '#5b21b6' : '#94a3b8', fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: a ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#a78bfa', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: PURPLE, fontWeight: 700, whiteSpace: 'nowrap', background: '#ede9fe', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, className: 'sel-btn', 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          pillars:  { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83D\uDC9C', title: 'Three Pillars \u2014 Neff\u2019s self-compassion model',     hint: 'Self-kindness, common humanity, mindfulness. Kristen Neff (2003) showed self-compassion predicts well-being BETTER than self-esteem \u2014 and without the comparison-to-others trap. Three pillars are the entire framework.' },
          critic:   { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDDE3', title: 'Inner Friend \u2014 swap critic for ally',              hint: 'You\u2019d never talk to a friend the way you talk to yourself. The exercise: write what your inner critic says, then rewrite it as a trusted friend would. Bandura: changing self-talk changes self-efficacy.' },
          practice: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83E\uDDD8', title: 'Practice \u2014 short reps, real change',               hint: 'Loving-kindness meditation (metta): \u201Cmay I be safe, may I be well, may I be at peace.\u201D Then expand to friend, neutral person, difficult person, all beings. 5 min/day for 8 weeks shows brain changes (Hutcherson 2008).' },
          letter:   { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '\u2709',         title: 'Kind Letter \u2014 write what you needed to hear',     hint: 'Compose a letter to yourself from the perspective of someone who loves you unconditionally. Pennebaker\u2019s expressive-writing protocol shows lasting health benefits 6 months out. The letter often surprises the writer.' },
          coach:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83E\uDD16', title: 'Compassion Coach \u2014 AI as gentle mirror',           hint: 'Type what you\u2019re struggling with; the coach reflects back with self-compassion language, not advice or fixing. Practice ground for re-parenting your own difficult moments. Most users keep going because the tone feels different.' }
        };
        var meta = TAB_META[activeTab] || TAB_META.pillars;
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

      // ── Three Pillars ──
      var pillarsContent = null;
      if (activeTab === 'pillars') {
        var pillars = PILLARS[band] || PILLARS.elementary;
        var cur = pillars[pillarIdx % pillars.length];
        pillarsContent = h('div', { className: 'sel-hero', style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: '20px', position: 'relative' } },
            // Decorative hearts floating behind
            [0,1,2,3].map(function(i) {
              return h('div', { key: 'h'+i, style: {
                position: 'absolute', fontSize: (10 + i * 3) + 'px', opacity: 0.15, color: PURPLE,
                left: (15 + i * 20) + '%', top: (5 + Math.sin(i) * 15) + '%',
                animation: 'selFloat ' + (2.5 + i * 0.5) + 's ease-in-out infinite',
                animationDelay: (i * 0.4) + 's'
              }}, '\u2764\uFE0F');
            }),
            h('div', { className: 'sel-hero-icon', style: { fontSize: '56px', marginBottom: '8px', filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.3))' } }, '\uD83D\uDC9C'),
            h('h3', { style: { fontSize: '20px', fontWeight: 800, color: PD, margin: '0 0 6px', letterSpacing: '-0.3px' } }, 'The Three Pillars of Self-Compassion'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' } },
              band === 'elementary' ? 'Three ways to be kind to yourself when things are hard.'
              : 'Kristin Neff\u2019s framework: the science of treating yourself like someone you love.')
          ),
          // Pillar selector
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' } },
            pillars.map(function(p, i) {
              var active = i === pillarIdx % pillars.length;
              return h('button', {
                key: p.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                'aria-label': p.title,
                onClick: function() { upd('pillarIdx', i); if (soundOn) sfxWarm(); },
                style: { flex: 1, padding: '14px 10px', borderRadius: '14px', border: active ? '3px solid ' + p.color : '2px solid #e5e7eb', background: active ? p.color + '15' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', maxWidth: '180px' }
              },
                h('div', { style: { fontSize: '28px', marginBottom: '4px' } }, p.icon),
                h('div', { style: { fontSize: '12px', fontWeight: 700, color: active ? PD : '#374151' } }, p.title)
              );
            })
          ),
          // Pillar detail
          h('div', { style: { background: cur.color + '10', borderRadius: '16px', padding: '20px', border: '2px solid ' + cur.color + '33', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '32px' } }, cur.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: PD, margin: 0 } }, cur.title)
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 14px' } }, cur.explain),
            h('div', { style: { background: '#fef2f2', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #fca5a5', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' } }, 'The opposite:'),
              h('p', { style: { fontSize: '12px', color: '#7f1d1d', margin: 0, fontStyle: 'italic' } }, cur.opposite)
            ),
            h('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #4ade80' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a', marginBottom: '2px' } }, 'Try this:'),
              h('p', { style: { fontSize: '12px', color: '#166534', margin: 0 } }, cur.practice)
            )
          )
        );
      }

      // ── Inner Critic → Inner Friend ──
      var criticContent = null;
      if (activeTab === 'critic') {
        var reframes = CRITIC_REFRAMES[band] || CRITIC_REFRAMES.elementary;
        var curC = reframes[criticIdx % reframes.length];
        criticContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(124,58,237,0.3))' } }, '\uD83D\uDDE3\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: PD, margin: '0 0 4px' } }, 'Inner Critic \u2192 Inner Friend'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Transform the harsh voice in your head into one that sounds like someone who loves you.')
          ),
          criticScore > 0 && h('div', { style: { textAlign: 'center', marginBottom: '12px' } },
            h('span', { style: { background: PL, padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: PURPLE } }, '\uD83D\uDC9C ' + criticScore + ' reframed')
          ),
          // Critic bubble
          h('div', { style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '16px', padding: '18px', marginBottom: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' } }, '\uD83D\uDDE3\uFE0F Inner Critic says:'),
            h('p', { style: { fontSize: '16px', fontWeight: 700, color: '#7f1d1d', margin: 0, fontStyle: 'italic' } }, '"' + curC.critic + '"')
          ),
          // Student input
          !criticShow && h('div', { style: { marginBottom: '10px' } },
            h('label', { style: { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' } }, '\uD83D\uDC9C What would your Inner Friend say instead?'),
            h('textarea', { value: criticInput, onChange: function(ev) { upd('criticInput', ev.target.value); }, 'aria-label': 'Write what your inner friend would say', placeholder: 'Speak to yourself the way you\u2019d speak to someone you love...', style: { width: '100%', border: '2px solid #ddd6fe', borderRadius: '10px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' } }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' } },
              h('button', { onClick: function() { upd({ criticShow: true, criticScore: criticInput.trim() ? criticScore + 1 : criticScore }); if (soundOn) sfxHeart(); if (criticInput.trim() && awardXP) awardXP(10, 'Transformed your inner critic!'); }, style: { padding: '8px 20px', background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' } }, '\uD83D\uDC9C Show Inner Friend'),
              h('p', { style: { fontSize: '11px', color: '#94a3b8', margin: 0 } }, curC.note)
            )
          ),
          // Revealed
          criticShow && h('div', null,
            criticInput.trim() && h('div', { style: { background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: '12px', padding: '14px', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' } }, '\uD83D\uDCAD Your inner friend:'),
              h('p', { style: { fontSize: '14px', color: '#1e3a8a', margin: 0, fontStyle: 'italic' } }, '"' + criticInput + '"')
            ),
            h('div', { style: { background: PL, border: '2px solid #c4b5fd', borderRadius: '16px', padding: '18px', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: PURPLE, textTransform: 'uppercase', marginBottom: '4px' } }, '\uD83D\uDC9C A compassionate response:'),
              h('p', { style: { fontSize: '16px', fontWeight: 700, color: PD, margin: '0 0 8px' } }, '"' + curC.friend + '"'),
              h('p', { style: { fontSize: '12px', color: '#94a3b8', margin: 0, fontStyle: 'italic' } }, curC.note)
            ),
            h('button', { onClick: function() { upd({ criticIdx: (criticIdx + 1) % reframes.length, criticInput: '', criticShow: false }); }, style: { padding: '10px 24px', background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'block', margin: '0 auto' } }, 'Next \u2192')
          )
        );
      }

      // ── Kind Letter ──
      var letterContent = null;
      if (activeTab === 'letter') {
        var prompt = LETTER_PROMPTS[band] || LETTER_PROMPTS.elementary;
        letterContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(124,58,237,0.3))' } }, '\u2709\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: PD, margin: '0 0 4px' } }, 'A Kind Letter to Myself'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, prompt)
          ),
          h('div', { style: { background: '#faf5ff', borderRadius: '16px', padding: '20px', border: '2px solid #ddd6fe', marginBottom: '16px' } },
            h('div', { style: { fontSize: '13px', color: PURPLE, fontStyle: 'italic', marginBottom: '8px' } }, 'Dear Me,'),
            h('textarea', { value: letterDraft, onChange: function(ev) { upd('letterDraft', ev.target.value); }, 'aria-label': 'Write a compassionate letter to yourself', placeholder: 'I know you\u2019re going through a hard time right now...', onFocus: function(e) { e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.4)'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }, style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: '#374151', resize: 'vertical', minHeight: '120px', boxSizing: 'border-box', outline: 'none', borderRadius: '6px' } }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
              h('button', { onClick: function() {
                if (!letterDraft.trim()) return;
                var letter = { id: Date.now().toString(), text: letterDraft.trim(), date: new Date().toLocaleDateString(), ts: Date.now() };
                upd({ savedLetters: [letter].concat(savedLetters), letterDraft: '' });
                if (soundOn) sfxHeart(); if (awardXP) awardXP(15, 'Wrote a self-compassion letter!');
              }, disabled: !letterDraft.trim(), 'aria-label': 'Save letter',
                style: { padding: '8px 18px', background: letterDraft.trim() ? PURPLE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: letterDraft.trim() ? 'pointer' : 'not-allowed' }
              }, '\uD83D\uDC9C Save with Love')
            )
          ),
          savedLetters.length > 0 && h('div', null,
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '\uD83D\uDCEC Letters of Kindness (' + savedLetters.length + ')'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              savedLetters.map(function(l) {
                var days = Math.floor((Date.now() - l.ts) / 86400000);
                return h('div', { key: l.id, style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', position: 'relative' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } },
                    h('span', { style: { fontSize: '11px', color: '#94a3b8' } }, l.date + (days > 0 ? ' \u00b7 ' + days + 'd ago' : ' \u00b7 today')),
                    h('button', { onClick: function() { upd('savedLetters', savedLetters.filter(function(s) { return s.id !== l.id; })); }, 'aria-label': 'Delete letter', style: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '10px', padding: '2px 6px' } }, '\u2715')
                  ),
                  h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#374151', margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' } }, l.text),
                  days >= 7 && h('div', { style: { marginTop: '10px', background: PL, borderRadius: '8px', padding: '8px 10px', borderLeft: '3px solid ' + PURPLE } },
                    h('p', { style: { fontSize: '11px', color: PD, margin: 0 } }, '\uD83D\uDC9C You wrote this ' + days + ' days ago. Read it slowly. Let the kindness in. You meant every word.')
                  )
                );
              })
            )
          )
        );
      }

      // ── Compassion Coach ──
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
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(124,58,237,0.3))' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: PD, margin: '0 0 4px' } }, 'Compassion Coach'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Share what your inner critic is saying.'),
            window.SelHub && window.SelHub.renderSafetyDisclosure && window.SelHub.renderSafetyDisclosure(h, band, ctx.activeSessionCode)
          ),
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Compassion coach conversation', 'aria-live': 'polite', 'aria-busy': coachLoading ? 'true' : 'false', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? '#fef2f2' : PL, border: '1px solid ' + (isUser ? '#fca5a5' : '#ddd6fe'), fontSize: '13px', lineHeight: 1.6, color: '#1f2937' } },
                  isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' } }, '\uD83D\uDDE3\uFE0F Inner critic says:'),
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: PURPLE, marginBottom: '4px' } }, '\uD83D\uDC9C Compassion Coach:'),
                  msg.text
                )
              );
            })
          ),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', { type: 'text', value: coachInput, onChange: function(ev) { upd('coachInput', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                  var msg = coachInput.trim();
                  var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                  upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                  var p = 'You are a self-compassion coach based on Kristin Neff\u2019s framework, speaking to a ' + band + ' school student. They shared this inner critic thought: "' + msg + '"\n\nRespond with:\n1. Validate the pain beneath the self-criticism (1 sentence)\n2. Reframe using one of the three pillars: self-kindness, common humanity, or mindfulness (1-2 sentences)\n3. A gentle, specific self-compassion practice they can try right now (1 sentence)\n\nBe warm, never dismissive. Never say "just think positive." Acknowledge the pain AND offer a compassionate alternative. Max 4 sentences.';
                  if (window.SelHub && window.SelHub.safeCoach) {
                    window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'compassion', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); if (awardXP) awardXP(5, 'Practiced self-compassion'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting. But I want you to hear this: the fact that you noticed your inner critic means you\u2019re already practicing mindfulness. You see the voice. You\u2019re not the voice. That awareness is the first step toward compassion.' }]), coachLoading: false }); });
                  } else {
                    callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); if (awardXP) awardXP(5, 'Practiced self-compassion'); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting. But I want you to hear this: the fact that you noticed your inner critic means you\u2019re already practicing mindfulness. You see the voice. You\u2019re not the voice. That awareness is the first step toward compassion.' }]), coachLoading: false }); });
                  }
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Listening with care...' : 'What is your inner critic saying?',
              'aria-label': 'Share your inner critic thought',
              style: { flex: 1, border: '2px solid #ddd6fe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                var msg = coachInput.trim();
                var hist = (coachHistory || []).concat([{ role: 'user', text: msg }]);
                upd({ coachHistory: hist, coachInput: '', coachLoading: true });
                var p = 'You are a self-compassion coach (Kristin Neff framework) for a ' + band + ' student. Inner critic: "' + msg + '"\nValidate the pain, reframe with self-kindness/common humanity/mindfulness, give one practice. Warm, never dismissive. Max 4 sentences.';
                if (window.SelHub && window.SelHub.safeCoach) {
                  window.SelHub.safeCoach({ studentMessage: msg, coachPrompt: p, toolId: 'compassion', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: hist }).then(function(result) { upd({ coachHistory: hist.concat([{ role: 'coach', text: result.response }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. But remember: you are not your inner critic. You are the one who hears it \u2014 and that observer deserves tremendous kindness.' }]), coachLoading: false }); });
                } else {
                  callGemini(p, false).then(function(r) { upd({ coachHistory: hist.concat([{ role: 'coach', text: r }]), coachLoading: false }); }).catch(function() { upd({ coachHistory: hist.concat([{ role: 'coach', text: 'Connection issue. But remember: you are not your inner critic. You are the one who hears it \u2014 and that observer deserves tremendous kindness.' }]), coachLoading: false }); });
                }
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? PURPLE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\uD83D\uDC9C')
          ),
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'Your inner critic might say:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              [
                band === 'elementary' ? 'I\u2019m the worst at everything' : band === 'middle' ? 'Nobody actually likes me' : 'I\u2019m not good enough and I never will be',
                band === 'elementary' ? 'I always mess things up' : band === 'middle' ? 'I should be better than this' : 'I\u2019m falling behind everyone else',
              ].map(function(p) {
                return h('button', { key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                  style: { padding: '5px 10px', background: PL, border: '1px solid #ddd6fe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: PD, fontWeight: 500 }
                }, p);
              })
            )
          )
        );
        }
      }

      // ── Practice (Self-Compassion Break + R.A.I.N.) ──
      var practiceContent = null;
      if (activeTab === 'practice') {
        var activePractice = null;
        for (var pi = 0; pi < PRACTICES.length; pi++) {
          if (PRACTICES[pi].id === practiceId) { activePractice = PRACTICES[pi]; break; }
        }
        var speakLine = function(text) {
          try {
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              var u = new SpeechSynthesisUtterance(text);
              u.rate = 0.85; u.pitch = 1.05;
              window.speechSynthesis.speak(u);
            }
          } catch(e) {}
        };
        if (!activePractice) {
          // Picker view
          practiceContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(124,58,237,0.3))' } }, '\uD83E\uDDD8'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: PD, margin: '0 0 4px' } }, 'Guided Practice'),
              h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Two evidence-based protocols. Each can be done seated, eyes open or closed. Pick one and move through it at your own pace.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
              PRACTICES.map(function(p) {
                var done = !!practiceCompleted[p.id];
                return h('button', {
                  key: p.id,
                  'aria-label': 'Begin ' + p.title,
                  onClick: function() { upd({ practiceId: p.id, practiceStep: 0, practiceReflection: '' }); if (soundOn) sfxClick(); },
                  style: { textAlign: 'left', padding: '18px', background: '#fff', border: '2px solid ' + (done ? '#a78bfa' : '#ddd6fe'), borderRadius: '14px', cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'center' }
                },
                  h('span', { style: { fontSize: '40px', flexShrink: 0 } }, p.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      h('h4', { style: { fontSize: '15px', fontWeight: 800, color: PD, margin: 0 } }, p.title),
                      done && h('span', { style: { fontSize: '10px', fontWeight: 700, color: PURPLE, background: PL, padding: '2px 8px', borderRadius: '10px' } }, '\u2713 done')
                    ),
                    h('p', { style: { fontSize: '12px', color: '#475569', margin: '4px 0 0' } }, p.steps.length + ' steps \u00b7 ' + p.duration + ' \u00b7 ' + p.source)
                  )
                );
              })
            )
          );
        } else {
          // Stepper view
          var totalSteps = activePractice.steps.length;
          var atIntro = practiceStep === 0 && false; // Not used; intro shown above first step
          var atClosing = practiceStep >= totalSteps;
          var curStep = atClosing ? null : activePractice.steps[practiceStep];
          practiceContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' } },
              h('button', {
                onClick: function() { upd({ practiceId: null, practiceStep: 0, practiceReflection: '' }); },
                'aria-label': 'Back to practice list',
                style: { padding: '6px 10px', background: 'transparent', border: '1px solid #ddd6fe', borderRadius: '8px', color: PURPLE, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
              }, '\u2190 All practices'),
              h('span', { style: { fontSize: '14px', fontWeight: 800, color: PD } }, activePractice.icon + ' ' + activePractice.title),
              h('span', { style: { marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: 600 } },
                atClosing ? 'Complete' : ('Step ' + (practiceStep + 1) + ' of ' + totalSteps))
            ),
            // Progress bar
            h('div', { style: { height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' } },
              h('div', { style: { height: '100%', width: Math.round((Math.min(practiceStep, totalSteps) / totalSteps) * 100) + '%', background: 'linear-gradient(90deg, ' + PURPLE + ', #a78bfa)', transition: 'width 0.4s ease' } })
            ),
            // Intro (only on first step)
            practiceStep === 0 && h('div', { style: { background: PL, borderRadius: '12px', padding: '14px', marginBottom: '14px', borderLeft: '4px solid ' + PURPLE } },
              h('p', { style: { fontSize: '13px', color: PD, margin: 0, lineHeight: 1.6, fontStyle: 'italic' } }, activePractice.intro)
            ),
            // Step card
            curStep && h('div', { style: { background: '#fff', border: '2px solid #ddd6fe', borderRadius: '16px', padding: '24px', marginBottom: '14px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' } }, curStep.label),
              h('p', { style: { fontSize: '20px', fontWeight: 800, color: PD, margin: '0 0 14px', lineHeight: 1.4 } }, '\u201C' + curStep.phrase + '\u201D'),
              h('p', { style: { fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.7 } }, curStep.body),
              window.speechSynthesis && h('button', {
                onClick: function() { speakLine(curStep.voiceover); if (soundOn) sfxWarm(); },
                'aria-label': 'Hear this step read aloud',
                style: { marginTop: '14px', padding: '6px 12px', background: 'transparent', border: '1px solid ' + PURPLE, color: PURPLE, borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
              }, '\uD83D\uDD0A Read aloud')
            ),
            // Closing card
            atClosing && h('div', null,
              h('div', { style: { background: '#f0fdf4', border: '2px solid #4ade80', borderRadius: '16px', padding: '20px', marginBottom: '14px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' } }, 'Closing'),
                h('p', { style: { fontSize: '14px', color: '#166534', margin: 0, lineHeight: 1.7 } }, activePractice.closing)
              ),
              h('div', { style: { background: '#faf5ff', borderRadius: '12px', padding: '14px', border: '2px solid #ddd6fe', marginBottom: '14px' } },
                h('label', { style: { fontSize: '12px', fontWeight: 700, color: PURPLE, display: 'block', marginBottom: '6px' } }, '\uD83D\uDCDD One sentence: what shifted?'),
                h('textarea', {
                  value: practiceReflection,
                  onChange: function(ev) { upd('practiceReflection', ev.target.value); },
                  'aria-label': 'Reflection on the practice',
                  placeholder: 'Even if nothing big shifted, what is one small thing you noticed?',
                  style: { width: '100%', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', minHeight: '60px', boxSizing: 'border-box', resize: 'vertical' }
                })
              )
            ),
            // Nav
            h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
              practiceStep > 0 ? h('button', {
                onClick: function() { upd('practiceStep', practiceStep - 1); if (soundOn) sfxClick(); },
                'aria-label': 'Previous step',
                style: { padding: '10px 18px', background: 'transparent', border: '1.5px solid #ddd6fe', color: PURPLE, borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
              }, '\u2190 Back') : h('div'),
              !atClosing ? h('button', {
                onClick: function() { upd('practiceStep', practiceStep + 1); if (soundOn) sfxWarm(); },
                'aria-label': practiceStep === totalSteps - 1 ? 'Finish practice' : 'Next step',
                style: { padding: '10px 22px', background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
              }, practiceStep === totalSteps - 1 ? 'Finish \u2192' : 'Next \u2192') : h('button', {
                onClick: function() {
                  var done = Object.assign({}, practiceCompleted); done[activePractice.id] = true;
                  upd({ practiceCompleted: done, practiceId: null, practiceStep: 0 });
                  if (soundOn) sfxHeart();
                  if (awardXP) awardXP(15, 'Completed ' + activePractice.title + '!');
                  if (addToast) addToast('You finished ' + activePractice.title + '. Well done.', 'success');
                },
                'aria-label': 'Mark practice complete',
                style: { padding: '10px 22px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
              }, '\uD83D\uDC9C Mark complete')
            )
          );
        }
      }

      var content = pillarsContent || criticContent || practiceContent || letterContent || coachContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('compassion', h) : null),
        tabBar,
        heroBand,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
