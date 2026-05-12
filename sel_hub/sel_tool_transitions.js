// ═══════════════════════════════════════════════════════════════
// sel_tool_transitions.js — Transitions & Change Workshop (v1.0)
// Normalizes change, teaches the Change Curve, shares stories of
// navigating transitions, identifies anchors, builds coping plans.
// For students experiencing: new school, family changes, grade
// transitions, loss, moves, or any disruption to their world.
// Registered tool ID: "transitions"
// Category: self-management
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
    if (document.getElementById('allo-live-transitions')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-transitions';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator(); var gain = ac.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxWarm() {
    playTone(330, 0.2, 'sine', 0.05);
    setTimeout(function() { playTone(392, 0.2, 'sine', 0.05); }, 150);
    setTimeout(function() { playTone(440, 0.25, 'sine', 0.06); }, 300);
  }
  function sfxAnchor() {
    playTone(262, 0.15, 'sine', 0.06);
    setTimeout(function() { playTone(330, 0.15, 'sine', 0.06); }, 100);
    setTimeout(function() { playTone(392, 0.2, 'sine', 0.07); }, 200);
  }
  function sfxComplete() {
    playTone(523, 0.1, 'sine', 0.08);
    setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80);
    setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160);
  }

  // ══════════════════════════════════════════════════════════════
  // ── Content Data ──
  // ══════════════════════════════════════════════════════════════

  var CHANGE_TYPES = [
    { id: 'newschool',  icon: '\uD83C\uDFEB', label: 'New School',       desc: 'Starting at a different school' },
    { id: 'moving',     icon: '\uD83C\uDFE0', label: 'Moving',           desc: 'Moving to a new home or city' },
    { id: 'family',     icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', label: 'Family Change', desc: 'Divorce, new sibling, or family structure shift' },
    { id: 'loss',       icon: '\uD83D\uDC94', label: 'Loss',             desc: 'Losing someone important (person or pet)' },
    { id: 'grade',      icon: '\uD83D\uDCDA', label: 'New Grade',        desc: 'Moving to a new grade or school level' },
    { id: 'friend',     icon: '\uD83D\uDC4B', label: 'Friendship Change', desc: 'A friend moved away or friendships shifting' },
    { id: 'health',     icon: '\uD83C\uDFE5', label: 'Health Change',    desc: 'Illness, injury, or diagnosis \u2014 yours or someone close' },
    { id: 'other',      icon: '\uD83C\uDF00', label: 'Something Else',   desc: 'Any change that feels big to you' },
  ];

  // The Change Curve — adapted from K\u00FCbler-Ross for children/adolescents
  var CHANGE_CURVE = {
    elementary: [
      { phase: 'Shocked', emoji: '\uD83D\uDE32', color: '#93c5fd', desc: 'When something changes, it can feel really surprising. You might think, "Wait, what?!" Your body might feel frozen or your mind might go blank. That\u2019s okay \u2014 your brain is trying to catch up.', normalize: 'Everyone feels this way when something unexpected happens.' },
      { phase: 'Upset', emoji: '\uD83D\uDE1E', color: '#fca5a5', desc: 'After the surprise, you might feel sad, angry, or scared. You might think, "I don\u2019t want this!" or "This isn\u2019t fair!" These feelings are your heart telling you that something mattered to you.', normalize: 'Big feelings mean you care about something. That\u2019s not weakness \u2014 it\u2019s love.' },
      { phase: 'Figuring It Out', emoji: '\uD83E\uDD14', color: '#fde68a', desc: 'Slowly, you start to wonder: "Okay, what do I do now?" You might try new things. Some will work, some won\u2019t. You\u2019re exploring and that takes courage.', normalize: 'Not knowing what to do is part of the process, not a sign that something is wrong with you.' },
      { phase: 'Finding Your Way', emoji: '\uD83D\uDE0A', color: '#86efac', desc: 'One day you notice things feel a little easier. Maybe you made a friend, or you found a new routine, or you laughed about something. The change doesn\u2019t disappear, but you find your place in the new world.', normalize: 'You don\u2019t "get over" change. You grow through it. And you\u2019re growing right now.' },
    ],
    middle: [
      { phase: 'Shock & Denial', emoji: '\uD83D\uDE32', color: '#93c5fd', desc: 'The initial response to change is often disbelief. "This can\u2019t be happening." Your brain literally hasn\u2019t built a mental model for the new reality yet, so it defaults to the old one.', normalize: 'Denial isn\u2019t weakness. It\u2019s your brain buying time to process something too big to absorb at once.' },
      { phase: 'Frustration & Grief', emoji: '\uD83D\uDE24', color: '#fca5a5', desc: 'As reality sets in, frustration and sadness emerge. You might feel angry at the situation, sad about what you\u2019ve lost, or anxious about what\u2019s coming. Sometimes all three at once.', normalize: 'You\u2019re not "overreacting." You\u2019re reacting proportionally to something that genuinely disrupted your life.' },
      { phase: 'Exploration', emoji: '\uD83D\uDD0D', color: '#fde68a', desc: 'Energy starts to shift from resisting the change to navigating it. You experiment with new routines, test new friendships, figure out new systems. It\u2019s awkward and uneven \u2014 good days and bad days.', normalize: 'Progress isn\u2019t linear. Having a bad day after a good week doesn\u2019t mean you\u2019re going backward.' },
      { phase: 'Integration', emoji: '\uD83C\uDF1F', color: '#86efac', desc: 'The change becomes part of your story rather than an interruption to it. You don\u2019t forget what was. You build something new alongside it. The person you\u2019re becoming includes the change, not despite it.', normalize: 'Integration doesn\u2019t mean being "fine." It means being able to carry both the loss and the growth.' },
    ],
    high: [
      { phase: 'Shock & Disorientation', emoji: '\uD83D\uDE32', color: '#93c5fd', desc: 'Significant transitions destabilize the narrative we\u2019ve built about our lives. The disorientation isn\u2019t just emotional \u2014 it\u2019s existential. "If this changed, what else can change? Who am I in this new context?"', normalize: 'William Bridges (Transitions, 1980): every transition begins with an ending. The disorientation is the space between the old identity and the new one.' },
      { phase: 'The Neutral Zone', emoji: '\uD83C\uDF2B\uFE0F', color: '#fca5a5', desc: 'Bridges calls this "the neutral zone" \u2014 the uncomfortable in-between where the old way no longer works but the new way hasn\u2019t formed yet. It\u2019s characterized by ambiguity, lowered motivation, and a sense of groundlessness.', normalize: 'The neutral zone is where growth actually happens. It\u2019s not a void to rush through \u2014 it\u2019s the chrysalis stage.' },
      { phase: 'Experimentation & Meaning-Making', emoji: '\uD83D\uDD0D', color: '#fde68a', desc: 'You begin to actively construct meaning from the change. Viktor Frankl: "Between stimulus and response there is a space. In that space is our freedom to choose our response." This is where you exercise that freedom.', normalize: 'Meaning isn\u2019t found. It\u2019s made. And making meaning from difficult change is one of the most profound human capacities.' },
      { phase: 'New Beginning', emoji: '\uD83C\uDF1F', color: '#86efac', desc: 'Not a return to how things were, but the emergence of something new \u2014 new identity, new relationships, new understanding. What you\u2019ve been through becomes part of your depth, not just your history.', normalize: 'Post-traumatic growth is real. People who navigate significant change often report greater empathy, clearer priorities, and deeper relationships afterward.' },
    ]
  };

  // Stories of navigating change
  var CHANGE_STORIES = {
    elementary: [
      { name: 'Maya\u2019s New School', type: 'newschool', story: 'Maya moved to a new city in the middle of third grade. She didn\u2019t know anyone. The halls were different, the rules were different, and she ate lunch alone for the first three days. On the fourth day, a girl named Priya asked if she wanted to sit together. They didn\u2019t become best friends that day \u2014 that took a month. But that one question changed everything.', insight: 'It only takes one person. And sometimes that person is waiting for you to say yes.' },
      { name: 'Sam\u2019s Two Houses', type: 'family', story: 'When Sam\u2019s parents got divorced, he had to have two bedrooms, two sets of rules, and two goodbyes every week. At first everything felt broken. Then his mom helped him decorate his new room with the same glow stars he had before. "Different doesn\u2019t mean less," she said. Slowly, Sam learned that love doesn\u2019t divide when families do \u2014 it multiplies.', insight: 'A family can change shape without losing what makes it a family.' },
      { name: 'Lily\u2019s Goodbye', type: 'loss', story: 'Lily\u2019s grandpa died in the fall. He was the one who taught her to fish. For months, she couldn\u2019t look at a fishing rod without crying. In the spring, her dad took her to their spot by the lake. She cried. She fished. She caught one. "Grandpa would be so proud," her dad said. She whispered, "He knows."', insight: 'The people we love stay in the skills they taught us, the laughter they gave us, and the love they left behind.' },
    ],
    middle: [
      { name: 'Marcus\u2019s Fresh Start', type: 'newschool', story: 'Marcus transferred mid-year because of bullying at his old school. He was terrified it would happen again. For the first two weeks, he barely spoke. Then his English teacher assigned a group project, and his partner said, "You\u2019re really good at this." It wasn\u2019t the words \u2014 it was that someone saw him for what he could do, not what had been done to him.', insight: 'A new environment doesn\u2019t erase the past. But it gives you a chance to write the next chapter yourself.' },
      { name: 'Aisha\u2019s Two Worlds', type: 'moving', story: 'Aisha\u2019s family moved from Nairobi to Portland when she was 12. Everything was different \u2014 the weather, the food, the way people talked. She felt caught between two worlds: too Kenyan for school, too American for home. A school counselor helped her see that she wasn\u2019t caught between \u2014 she was building a bridge. "You carry two cultures," the counselor said. "That\u2019s not confusion. That\u2019s richness."', insight: 'Living between worlds doesn\u2019t mean you don\u2019t belong anywhere. It means you belong to more.' },
      { name: 'Dev\u2019s Diagnosis', type: 'health', story: 'When Dev was diagnosed with ADHD in 7th grade, his first thought was "So I AM broken." His psychologist said something that changed his whole perspective: "Your brain isn\u2019t broken. It\u2019s wired differently. We\u2019re going to figure out how it works best." It didn\u2019t make everything easy. But it made everything make more sense.', insight: 'A diagnosis isn\u2019t a label. It\u2019s a flashlight that helps you see your own operating manual.' },
    ],
    high: [
      { name: 'Jordan\u2019s Reinvention', type: 'grade', story: 'Jordan was the best swimmer at their middle school. At the high school level, they were average. For the first time, identity and ability diverged. "If I\u2019m not the best swimmer, who am I?" A coach told them: "You\u2019re the person who loves being in the water. That hasn\u2019t changed. The scoreboard isn\u2019t your identity."', insight: 'When you build identity on being the best at something, any change in ranking feels like an identity crisis. Build identity on what you love, not where you rank.' },
      { name: 'Priya\u2019s Parent\u2019s Cancer', type: 'health', story: 'When Priya\u2019s mother was diagnosed with breast cancer, Priya became the person who held the family together. She cooked, drove her siblings to school, and smiled constantly. Her school counselor noticed she never cried. "It\u2019s okay to not be okay," the counselor said. "You don\u2019t have to carry everyone." Priya broke down for the first time in months. And for the first time in months, she felt lighter.', insight: 'Strength isn\u2019t performing wellness. Sometimes the strongest thing you can do is let someone see your pain.' },
      { name: 'Tomás\u2019s Undocumented Fear', type: 'other', story: 'Tom\u00E1s was a straight-A student who lived with the constant fear that his family\u2019s immigration status could change everything overnight. School felt unreal \u2014 why study for a future that might be taken away? A teacher who sensed his distance said, "Your education belongs to you. No policy can take what\u2019s in your mind." Tom\u00E1s didn\u2019t stop being afraid. But he started building anyway.', insight: 'Building a future under uncertain conditions isn\u2019t naive. It\u2019s the most defiant form of hope.' },
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('transitions', {
    icon: '\uD83C\uDF00',
    label: 'Transitions & Change',
    desc: 'Navigate life changes with understanding \u2014 new school, family shifts, loss, moves, and growing through it all.',
    color: 'sky',
    category: 'self-regulation',
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

      var d = (ctx.toolData && ctx.toolData.transitions) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('transitions', key); }
        else { if (ctx.update) ctx.update('transitions', key, val); }
      };

      var activeTab      = d.activeTab || 'identify';
      var soundEnabled   = d.soundEnabled != null ? d.soundEnabled : true;

      // Identify state
      var selectedChange = d.selectedChange || null;
      var myChangeNote   = d.myChangeNote || '';

      // Curve state
      var curvePhaseIdx  = d.curvePhaseIdx || 0;
      var myPhase        = d.myPhase || null;

      // Stories state
      var storyIdx       = d.storyIdx || 0;
      var storiesRead    = d.storiesRead || {};

      // Anchors state
      var anchors        = d.anchors || [];
      var newAnchor      = d.newAnchor || '';

      // Plan state
      var planSteps      = d.planSteps || [];
      var newStep        = d.newStep || '';

      // Coach state
      var coachInput     = d.coachInput || '';
      var coachHistory   = d.coachHistory || [];
      var coachLoading   = d.coachLoading || false;

      // Colors
      var SKY = '#0284c7';
      var SKY_LIGHT = '#f0f9ff';
      var SKY_DARK = '#0c4a6e';
      var WARM = '#ea580c';

      // ── Tab Bar ──
      var TABS = [
        { id: 'identify', icon: '\uD83C\uDF00', label: 'What\u2019s Changing' },
        { id: 'curve',    icon: '\uD83D\uDCC8', label: 'The Change Curve' },
        { id: 'stories',  icon: '\uD83D\uDCD6', label: 'Change Stories' },
        { id: 'anchors',  icon: '\u2693',       label: 'My Anchors' },
        { id: 'plan',     icon: '\uD83D\uDDFA\uFE0F', label: 'My Plan' },
        { id: 'coach',    icon: '\uD83E\uDD16', label: 'AI Support' },
      ];

      // Track explored tabs
      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #bae6fd', background: 'linear-gradient(180deg, #f0f9ff, #e0f2fe)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + SKY + ', #38bdf8)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Transitions sections'
        },
          TABS.map(function(t) {
            var active = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id, role: 'tab', className: 'sel-tab' + (active ? ' sel-tab-active' : ''), 'aria-selected': active ? 'true' : 'false',
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: {
                padding: '6px 14px', borderRadius: '10px', border: active ? 'none' : '1px solid ' + (explored ? '#bae6fd' : 'transparent'),
                background: active ? 'linear-gradient(135deg, ' + SKY + ', #0369a1)' : explored ? 'rgba(2,132,199,0.06)' : 'transparent',
                color: active ? '#fff' : explored ? '#0c4a6e' : '#94a3b8',
                fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
                boxShadow: active ? '0 3px 12px rgba(2,132,199,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
              }
            }, h('span', { className: active ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !active ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#38bdf8', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: SKY, fontWeight: 700, whiteSpace: 'nowrap', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', {
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            className: 'sel-btn', 'aria-label': soundEnabled ? 'Mute sounds' : 'Enable sounds',
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 }
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ══════════════════════════════════════════════════════════
      // ── What's Changing ──
      // ══════════════════════════════════════════════════════════
      var identifyContent = null;
      if (activeTab === 'identify') {
        identifyContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\uD83C\uDF00'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'What\u2019s Changing?'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'Change is a part of life. Let\u2019s name what\u2019s happening for you.'
              : 'Naming what\u2019s changing is the first step toward navigating it.')
          ),
          // Change type selection
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' } },
            CHANGE_TYPES.map(function(ct) {
              var isSelected = selectedChange === ct.id;
              return h('button', {
                key: ct.id, role: 'radio', 'aria-checked': isSelected ? 'true' : 'false',
                'aria-label': ct.label + ': ' + ct.desc,
                onClick: function() {
                  upd('selectedChange', ct.id);
                  if (soundEnabled) sfxWarm();
                  if (announceToSR) announceToSR('Selected: ' + ct.label);
                },
                style: {
                  padding: '14px 10px', borderRadius: '12px', cursor: 'pointer',
                  border: isSelected ? '2px solid ' + SKY : '2px solid #e5e7eb',
                  background: isSelected ? SKY_LIGHT : '#fff',
                  textAlign: 'center', transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 2px 10px rgba(2,132,199,0.15)' : 'none'
                }
              },
                h('div', { style: { fontSize: '24px', marginBottom: '4px' } }, ct.icon),
                h('div', { style: { fontSize: '12px', fontWeight: 700, color: isSelected ? SKY : '#374151' } }, ct.label),
                h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '2px' } }, ct.desc)
              );
            })
          ),
          // Personal note
          selectedChange && h('div', { style: { background: SKY_LIGHT, borderRadius: '12px', padding: '16px', border: '1px solid #bae6fd' } },
            h('label', { style: { fontSize: '12px', fontWeight: 600, color: SKY_DARK, display: 'block', marginBottom: '6px' } },
              band === 'elementary' ? 'Tell me about it in your own words (if you want to):' : 'What does this change look like in your life?'
            ),
            h('textarea', {
              value: myChangeNote,
              onChange: function(ev) { upd('myChangeNote', ev.target.value); },
              'aria-label': 'Describe your change',
              placeholder: band === 'elementary' ? 'I feel... because...' : 'What happened, how it affects you, what\u2019s hardest about it...',
              style: { width: '100%', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }
            }),
            h('p', { style: { fontSize: '11px', color: '#94a3b8', margin: '6px 0 0', fontStyle: 'italic' } },
              '\uD83D\uDD12 This stays private. Only you can see what you write here.')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── The Change Curve ──
      // ══════════════════════════════════════════════════════════
      var curveContent = null;
      if (activeTab === 'curve') {
        var phases = CHANGE_CURVE[band] || CHANGE_CURVE.elementary;
        var currentPhase = phases[curvePhaseIdx % phases.length];

        curveContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\uD83D\uDCC8'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'The Change Curve'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'Everyone goes through these feelings when things change. You\u2019re not alone.'
              : 'Change follows a predictable emotional pattern. Knowing where you are helps you navigate forward.')
          ),
          // Visual curve representation
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '16px', justifyContent: 'center' } },
            phases.map(function(p, i) {
              var isCurrent = i === curvePhaseIdx % phases.length;
              var isMyPhase = myPhase === i;
              return h('button', {
                key: i,
                'aria-label': p.phase + (isMyPhase ? ' (where I am)' : ''),
                onClick: function() { upd('curvePhaseIdx', i); if (soundEnabled) sfxClick(); },
                style: {
                  flex: 1, padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                  border: isCurrent ? '3px solid ' + p.color : '2px solid #e5e7eb',
                  background: isCurrent ? p.color + '22' : '#fff',
                  textAlign: 'center', transition: 'all 0.15s', position: 'relative',
                  maxWidth: '140px'
                }
              },
                isMyPhase && h('div', { style: { position: 'absolute', top: '-8px', right: '-4px', fontSize: '14px' } }, '\uD83D\uDCCD'),
                h('div', { style: { fontSize: '24px', marginBottom: '4px' } }, p.emoji),
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#374151' } }, p.phase)
              );
            })
          ),
          // Phase detail card
          h('div', { style: { background: currentPhase.color + '15', borderRadius: '16px', padding: '20px', border: '2px solid ' + currentPhase.color + '44', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '32px' } }, currentPhase.emoji),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: SKY_DARK, margin: 0 } }, currentPhase.phase)
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 12px' } }, currentPhase.desc),
            h('div', { style: { background: '#fff', borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid ' + currentPhase.color } },
              h('p', { style: { fontSize: '13px', fontWeight: 500, color: '#374151', margin: 0, fontStyle: 'italic' } }, currentPhase.normalize)
            )
          ),
          // "I'm here" button
          h('div', { style: { textAlign: 'center' } },
            h('button', {
              onClick: function() {
                upd('myPhase', curvePhaseIdx % phases.length);
                if (soundEnabled) sfxWarm();
                if (awardXP) awardXP(10, 'Identified your place on the Change Curve');
                if (announceToSR) announceToSR('Marked: I am in the ' + currentPhase.phase + ' phase');
              },
              'aria-label': 'Mark this as where I am on the Change Curve',
              style: {
                padding: '10px 24px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                background: myPhase === curvePhaseIdx % phases.length ? currentPhase.color : '#fff',
                color: myPhase === curvePhaseIdx % phases.length ? '#fff' : SKY,
                border: '2px solid ' + (myPhase === curvePhaseIdx % phases.length ? currentPhase.color : SKY),
                transition: 'all 0.15s'
              }
            }, myPhase === curvePhaseIdx % phases.length ? '\uD83D\uDCCD I\u2019m here' : '\uD83D\uDCCD This is where I am')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Change Stories ──
      // ══════════════════════════════════════════════════════════
      var storiesContent = null;
      if (activeTab === 'stories') {
        var stories = CHANGE_STORIES[band] || CHANGE_STORIES.elementary;
        var currentStory = stories[storyIdx % stories.length];
        var storyType = CHANGE_TYPES.find(function(ct) { return ct.id === currentStory.type; });

        storiesContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\uD83D\uDCD6'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'Stories of Change'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Real stories about navigating transitions. You\u2019re not the first to walk this path.')
          ),
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            storyType && h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: SKY_LIGHT, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, color: SKY, marginBottom: '10px' } },
              storyType.icon, ' ', storyType.label
            ),
            h('h4', { style: { fontSize: '16px', fontWeight: 800, color: '#1f2937', margin: '0 0 10px' } }, currentStory.name),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: '0 0 14px' } }, currentStory.story),
            h('div', { style: { background: '#fef9c3', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '13px', fontWeight: 600, color: '#92400e', margin: 0 } }, '\uD83D\uDCA1 ' + currentStory.insight)
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', {
              onClick: function() {
                var prev = (storyIdx - 1 + stories.length) % stories.length;
                upd({ storyIdx: prev, storiesRead: Object.assign({}, storiesRead, (function() { var o = {}; o[prev] = true; return o; })()) });
              },
              'aria-label': 'Previous story',
              style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' }
            }, '\u2190 Previous'), // a11y: label set via visible text
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#94a3b8' } },
              (storyIdx % stories.length + 1) + ' / ' + stories.length
            ),
            h('button', {
              onClick: function() {
                var next = (storyIdx + 1) % stories.length;
                var newRead = Object.assign({}, storiesRead, (function() { var o = {}; o[next] = true; return o; })());
                upd({ storyIdx: next, storiesRead: newRead });
                if (soundEnabled) sfxWarm();
                if (Object.keys(newRead).length >= stories.length && awardXP) awardXP(15, 'Read all Change Stories!');
              },
              'aria-label': 'Next story',
              style: { padding: '8px 16px', background: SKY, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' }
            }, 'Next \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── My Anchors ──
      // ══════════════════════════════════════════════════════════
      var anchorsContent = null;
      if (activeTab === 'anchors') {
        var ANCHOR_PROMPTS = band === 'elementary'
          ? ['A person who loves me no matter what', 'Something I\u2019m good at', 'My favorite place to feel safe', 'A happy memory I can always go back to', 'Something about me that stays the same']
          : ['A relationship that remains constant', 'A skill or strength that travels with me', 'A value I hold regardless of circumstances', 'A memory that grounds me', 'A routine that gives me stability'];

        anchorsContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\u2693'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'My Anchors'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'When everything is changing, some things stay the same. Let\u2019s find yours.'
              : 'Anchors are what stays constant when the world around you shifts. Identifying them builds resilience.')
          ),
          // Prompts
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' } },
            ANCHOR_PROMPTS.map(function(prompt) {
              return h('button', {
                key: prompt,
                'aria-label': 'Use prompt: ' + prompt,
                onClick: function() { upd('newAnchor', prompt); },
                style: { padding: '4px 10px', background: SKY_LIGHT, border: '1px solid #bae6fd', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: SKY_DARK }
              }, prompt);
            })
          ),
          // Input
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
            h('input', {
              type: 'text', value: newAnchor,
              onChange: function(ev) { upd('newAnchor', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && newAnchor.trim()) {
                  upd({ anchors: anchors.concat([{ id: Date.now().toString(), text: newAnchor.trim() }]), newAnchor: '' });
                  if (soundEnabled) sfxAnchor();
                  if (awardXP) awardXP(5, 'Identified an anchor!');
                }
              },
              placeholder: band === 'elementary' ? 'Something that stays the same for me...' : 'What stays constant when everything changes...',
              'aria-label': 'Add an anchor',
              style: { flex: 1, border: '2px solid #bae6fd', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!newAnchor.trim()) return;
                upd({ anchors: anchors.concat([{ id: Date.now().toString(), text: newAnchor.trim() }]), newAnchor: '' });
                if (soundEnabled) sfxAnchor();
                if (awardXP) awardXP(5, 'Identified an anchor!');
              },
              disabled: !newAnchor.trim(),
              style: { padding: '10px 16px', background: newAnchor.trim() ? SKY : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: newAnchor.trim() ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, '\u2693 Drop Anchor')
          ),
          // Anchors list
          anchors.length > 0
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                anchors.map(function(anchor) {
                  return h('div', { key: anchor.id, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#fff', border: '2px solid #bae6fd', borderRadius: '12px' } },
                    h('span', { style: { fontSize: '20px', flexShrink: 0 } }, '\u2693'),
                    h('span', { style: { flex: 1, fontSize: '14px', color: '#1f2937', fontWeight: 500 } }, anchor.text),
                    h('button', {
                      onClick: function() { upd('anchors', anchors.filter(function(a) { return a.id !== anchor.id; })); },
                      'aria-label': 'Remove anchor',
                      style: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', fontSize: '10px', padding: '2px 6px' }
                    }, '\u2715')
                  );
                })
              )
            : h('div', { style: { textAlign: 'center', padding: '24px', color: '#94a3b8' } },
                h('p', { style: { fontSize: '13px', fontStyle: 'italic' } }, 'No anchors yet. Even in the biggest storm, something holds steady. What is it for you?')
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── My Plan ──
      // ══════════════════════════════════════════════════════════
      var planContent = null;
      if (activeTab === 'plan') {
        planContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\uD83D\uDDFA\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'My Change Plan'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'Small steps make big changes feel smaller. What\u2019s one thing you can do?'
              : 'You can\u2019t control the change, but you can choose your response. What\u2019s your plan?')
          ),
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
            h('input', {
              type: 'text', value: newStep,
              onChange: function(ev) { upd('newStep', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && newStep.trim()) {
                  upd({ planSteps: planSteps.concat([{ id: Date.now().toString(), text: newStep.trim(), done: false }]), newStep: '' });
                  if (soundEnabled) sfxClick();
                  if (awardXP) awardXP(5, 'Added a step to your Change Plan!');
                }
              },
              placeholder: band === 'elementary' ? 'One small thing I can try...' : 'A concrete step I can take...',
              'aria-label': 'Add a plan step',
              style: { flex: 1, border: '2px solid #bae6fd', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!newStep.trim()) return;
                upd({ planSteps: planSteps.concat([{ id: Date.now().toString(), text: newStep.trim(), done: false }]), newStep: '' });
                if (soundEnabled) sfxClick();
              },
              disabled: !newStep.trim(),
              style: { padding: '10px 16px', background: newStep.trim() ? SKY : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: newStep.trim() ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, '+ Add Step')
          ),
          planSteps.length > 0
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                planSteps.map(function(step) {
                  return h('div', Object.assign({
                    key: step.id,
                    'aria-label': (step.done ? 'Mark incomplete: ' : 'Mark complete: ') + step.text,
                    'aria-pressed': step.done ? 'true' : 'false',
                    style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: step.done ? '#f0fdf4' : '#fff', border: '2px solid ' + (step.done ? '#86efac' : '#e5e7eb'), borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' }
                  }, a11yClick(function() {
                      upd('planSteps', planSteps.map(function(s) { return s.id === step.id ? Object.assign({}, s, { done: !s.done }) : s; }));
                      if (!step.done && soundEnabled) sfxComplete();
                      if (!step.done && awardXP) awardXP(10, 'Completed a step!');
                  })),
                    h('div', { style: { width: '22px', height: '22px', borderRadius: '6px', border: '2px solid ' + (step.done ? '#16a34a' : '#d1d5db'), background: step.done ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' } },
                      step.done && h('span', { style: { color: '#fff', fontSize: '14px', fontWeight: 800 } }, '\u2713')
                    ),
                    h('span', { style: { flex: 1, fontSize: '14px', color: step.done ? '#94a3b8' : '#1f2937', textDecoration: step.done ? 'line-through' : 'none' } }, step.text),
                    h('button', {
                      onClick: function(ev) { ev.stopPropagation(); upd('planSteps', planSteps.filter(function(s) { return s.id !== step.id; })); },
                      'aria-label': 'Remove step',
                      style: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', padding: '2px' }
                    }, '\u2715')
                  );
                }),
                planSteps.filter(function(s) { return s.done; }).length > 0 && h('p', { style: { fontSize: '12px', color: '#059669', fontWeight: 600, textAlign: 'center', marginTop: '8px' } },
                  '\u2728 ' + planSteps.filter(function(s) { return s.done; }).length + ' of ' + planSteps.length + ' steps completed!'
                )
              )
            : h('div', { style: { textAlign: 'center', padding: '24px', color: '#94a3b8' } },
                h('p', { style: { fontSize: '13px', fontStyle: 'italic' } }, 'No steps yet. Even the smallest step counts. What\u2019s one thing you can do today?')
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── AI Support Coach ──
      // ══════════════════════════════════════════════════════════
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
        var changeContext = selectedChange ? CHANGE_TYPES.find(function(ct) { return ct.id === selectedChange; }) : null;
        var phaseContext = myPhase != null ? (CHANGE_CURVE[band] || CHANGE_CURVE.elementary)[myPhase] : null;

        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(2,132,199,0.3))' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: SKY_DARK, margin: '0 0 4px' } }, 'AI Support'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Talk about what you\u2019re going through.'),
            window.SelHub && window.SelHub.renderSafetyDisclosure && window.SelHub.renderSafetyDisclosure(h, band, ctx.activeSessionCode)
          ),
          // Context summary
          (changeContext || phaseContext) && h('div', { style: { background: SKY_LIGHT, borderRadius: '10px', padding: '8px 12px', marginBottom: '12px', fontSize: '11px', color: SKY_DARK } },
            changeContext && h('span', null, changeContext.icon + ' Going through: ' + changeContext.label),
            changeContext && phaseContext && ' \u00b7 ',
            phaseContext && h('span', null, phaseContext.emoji + ' Currently in: ' + phaseContext.phase + ' phase')
          ),
          // Chat
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Conversation with transition support coach', 'aria-live': 'polite', 'aria-busy': coachLoading ? 'true' : 'false', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: {
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser ? '#eff6ff' : SKY_LIGHT,
                  border: '1px solid ' + (isUser ? '#bfdbfe' : '#bae6fd'),
                  fontSize: '13px', lineHeight: 1.6, color: '#1f2937'
                } },
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: SKY, marginBottom: '4px' } }, '\uD83C\uDF00 Transition Coach'),
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

                  var context = '';
                  if (changeContext) context += 'The student is going through: ' + changeContext.label + '. ';
                  if (phaseContext) context += 'They identify as being in the "' + phaseContext.phase + '" phase of the Change Curve. ';
                  if (myChangeNote) context += 'They described their situation as: "' + myChangeNote + '". ';

                  var prompt = 'You are a warm, empathetic transition support coach for a ' + band + ' school student. '
                    + context
                    + 'The student said: "' + userMsg + '"\n\n'
                    + 'Respond with:\n'
                    + '1. Validate their feeling (1 sentence)\n'
                    + '2. Normalize the experience (1 sentence referencing the Change Curve if relevant)\n'
                    + '3. One gentle, specific suggestion or coping strategy (1 sentence)\n\n'
                    + 'Be warm, concise, age-appropriate. Never minimize their experience. Max 3-4 sentences.';

                  var sendSafe = (window.SelHub && window.SelHub.safeCoach)
                    ? function() { return window.SelHub.safeCoach({ studentMessage: userMsg, coachPrompt: prompt, toolId: 'transitions', band: band, callGemini: callGemini, codename: ctx.studentCodename || 'student', conversationHistory: newHist, onSafetyFlag: onSafetyFlag }); }
                    : function() { return callGemini(prompt, false).then(function(r) { return { response: r, tier: 0, showCrisis: false }; }); };
                  sendSafe().then(function(result) {
                    upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false });
                    if (awardXP) awardXP(5, 'Talked with Transition Coach');
                  }).catch(function() {
                    upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting right now. But I want you to know: what you\u2019re going through is real, your feelings about it are valid, and the fact that you\u2019re here talking about it shows remarkable courage.' }]), coachLoading: false });
                  });
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Listening...' : 'How are you feeling about the change?',
              'aria-label': 'Message the transition coach',
              style: { flex: 1, border: '2px solid #bae6fd', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                // Same send logic — trigger via synthetic Enter
                var kev = new KeyboardEvent('keydown', { key: 'Enter' });
                // Inline for reliability
                var userMsg = coachInput.trim();
                var newHist = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                upd({ coachHistory: newHist, coachInput: '', coachLoading: true });
                var context = '';
                if (changeContext) context += 'The student is going through: ' + changeContext.label + '. ';
                if (phaseContext) context += 'They identify as being in the "' + phaseContext.phase + '" phase. ';
                var prompt = 'You are a warm, empathetic transition support coach for a ' + band + ' school student. ' + context + 'The student said: "' + userMsg + '"\nValidate, normalize, suggest. Warm, concise, age-appropriate. Max 3-4 sentences.';
                var sendSafe = (window.SelHub && window.SelHub.safeCoach)
                  ? function() { return window.SelHub.safeCoach({ studentMessage: userMsg, coachPrompt: prompt, toolId: 'transitions', band: band, callGemini: callGemini, codename: ctx.studentCodename || 'student', conversationHistory: newHist, onSafetyFlag: onSafetyFlag }); }
                  : function() { return callGemini(prompt, false).then(function(r) { return { response: r, tier: 0, showCrisis: false }; }); };
                sendSafe().then(function(result) {
                  upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false });
                }).catch(function() {
                  upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But remember: you are not alone in this, and what you\u2019re feeling makes complete sense.' }]), coachLoading: false });
                });
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? SKY : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728 Send')
          ),
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'You might start with:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              [
                'I\u2019m scared about the change',
                'I miss how things used to be',
                'I don\u2019t know anyone at my new school',
                'Everything feels different and I don\u2019t like it'
              ].map(function(p) {
                return h('button', { key: p, 'aria-label': 'Use starter: ' + p, onClick: function() { upd('coachInput', p); },
                  style: { padding: '5px 10px', background: SKY_LIGHT, border: '1px solid #bae6fd', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: SKY_DARK, fontWeight: 500 }
                }, p);
              })
            )
          )
        );
        } // end else (hasConsent)
      }

      // ── Final render ──
      var content = identifyContent || curveContent || storiesContent || anchorsContent || planContent || coachContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('transitions', h) : null),
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content),
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });
})();
