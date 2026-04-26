// ═══════════════════════════════════════════════════════════════
// sel_tool_upstander.js — Upstander Workshop (v1.0)
// Addresses bullying through all three lenses: target, perpetrator,
// bystander. Grounded in the understanding that hurt people hurt
// people, silence is participation, and punitive approaches fail.
// Teaches the hardest skill: standing up — for others AND yourself.
// Registered tool ID: "upstander"
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
  (function() {
    if (document.getElementById('allo-live-upstander')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-upstander'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  function sfxClick() { tone(880, 0.04, 'sine', 0.05); }
  function sfxBrave() { tone(330, 0.15, 'triangle', 0.06); setTimeout(function() { tone(440, 0.15, 'sine', 0.06); }, 120); setTimeout(function() { tone(554, 0.2, 'sine', 0.07); }, 240); setTimeout(function() { tone(659, 0.25, 'sine', 0.08); }, 360); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  // The Three Roles
  var ROLES = {
    elementary: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Person Being Hurt', color: '#93c5fd',
        feels: ['scared', 'alone', 'ashamed', 'confused', 'angry', 'small'],
        truth: 'Being bullied is NEVER your fault. It doesn\u2019t matter what you look like, what you\u2019re good at, or how you talk. Nobody deserves to be treated badly.',
        myth: 'Myth: "Just ignore them and they\u2019ll stop." Truth: Ignoring doesn\u2019t always work, and telling you to just ignore it puts the responsibility on YOU instead of the person doing the hurting.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The Person Doing the Hurting', color: '#fca5a5',
        feels: ['scared too', 'hurt before', 'lonely', 'angry inside', 'wanting control', 'not knowing better'],
        truth: 'Most people who bully others have been hurt themselves. That doesn\u2019t make it okay. But understanding why helps us break the cycle instead of just adding more punishment.',
        myth: 'Myth: "Bullies are just mean people." Truth: Bullying is a behavior, not an identity. People who bully can learn to stop. The behavior is wrong. The person still deserves help.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Person Watching', color: '#fde68a',
        feels: ['frozen', 'guilty', 'relieved it\u2019s not them', 'wanting to help but scared', 'confused about what to do'],
        truth: 'When you see someone being bullied and don\u2019t say anything, it can feel like you\u2019re agreeing with the bully. But staying silent usually isn\u2019t about agreeing \u2014 it\u2019s about being scared. That\u2019s honest and human.',
        myth: 'Myth: "It\u2019s not my problem." Truth: Bullying only works when there\u2019s an audience that stays silent. One person speaking up changes everything.' }
    ],
    middle: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Target', color: '#93c5fd',
        feels: ['hypervigilant', 'dreading school', 'self-doubting', 'isolated', 'depressed', 'performing "okay"'],
        truth: 'Bullying targets are often chosen not for their weakness but for their difference \u2014 which is often their strength. The creative kid, the sensitive kid, the kid who doesn\u2019t perform dominance. The qualities that make you a target at 13 make you remarkable at 30.',
        myth: 'Myth: "You need thicker skin." Truth: Telling someone to be less affected by cruelty is protecting the cruelty, not the person. The skin isn\u2019t too thin. The behavior is too harmful.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The One Who Bullies', color: '#fca5a5',
        feels: ['fear of vulnerability', 'hurt that became armor', 'pressure to perform toughness', 'self-loathing masked as dominance', 'modeling what was done to them'],
        truth: 'Research (Olweus, 1993): students who bully are significantly more likely to have experienced abuse, witnessed domestic violence, or been bullied themselves. The behavior is a corruption of the need for connection \u2014 power substituted for belonging.',
        myth: 'Myth: "They\u2019re just evil." Truth: Dehumanizing the person who bullies is itself a form of the same thinking that enables bullying. Accountability without empathy just moves the harm around.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Bystander', color: '#fde68a',
        feels: ['relief it\u2019s not them', 'social calculation', 'guilt', 'paralysis', 'fear of becoming the next target'],
        truth: 'The bystander effect is one of the most studied phenomena in social psychology. The more people watching, the less likely any one person intervenes. It\u2019s not because people don\u2019t care. It\u2019s because each person assumes someone else will act.',
        myth: 'Myth: "I can\u2019t make a difference." Truth: Studies show that when ONE bystander speaks up, bullying stops within 10 seconds over 57% of the time (Hawkins, Pepler & Craig, 2001).' }
    ],
    high: [
      { id: 'target', icon: '\uD83D\uDC94', title: 'The Target', color: '#93c5fd',
        feels: ['chronic stress response', 'identity questioning', 'academic decline', 'social withdrawal', 'suicidal ideation in severe cases', 'complex PTSD symptoms'],
        truth: 'Bullying is not a rite of passage. Longitudinal research shows that bullying victimization is associated with increased risk of depression, anxiety, and self-harm that persists into adulthood (Copeland et al., 2013). It literally rewires the stress response system.',
        myth: 'Myth: "It builds character." Truth: Chronic stress doesn\u2019t build character \u2014 it depletes the neurobiological resources needed FOR character. Adversity that builds resilience is adversity with support. Bullying is adversity designed to isolate you from support.' },
      { id: 'bully', icon: '\uD83D\uDE1E', title: 'The One Who Bullies', color: '#fca5a5',
        feels: ['externalized pain', 'attachment disruption', 'performing a version of masculinity/power they were taught', 'fear of vulnerability equated with death', 'trapped in a role they may not want'],
        truth: 'The relationship between being bullied and becoming a bully is one of the strongest findings in the literature. "Bully-victims" \u2014 those who are both perpetrators and targets \u2014 have the worst mental health outcomes of any group. They need intervention, not just consequences.',
        myth: 'Myth: "Zero tolerance works." Truth: Zero-tolerance policies increase dropout rates and disproportionately affect students of color and students with disabilities without reducing bullying (APA Zero Tolerance Task Force, 2008). What works: restorative practices, social-emotional skill building, and addressing root causes.' },
      { id: 'bystander', icon: '\uD83D\uDE36', title: 'The Bystander', color: '#fde68a',
        feels: ['moral injury from inaction', 'social cost calculation', 'diffusion of responsibility', 'conformity pressure', 'cognitive dissonance'],
        truth: 'Hannah Arendt wrote about the "banality of evil" \u2014 how ordinary people enable harm through passivity and conformity. The bystander\u2019s silence isn\u2019t neutral. In a system where harm is occurring, inaction IS a choice. The question isn\u2019t whether you have the right to intervene. It\u2019s whether you can live with not doing so.',
        myth: 'Myth: "Speaking up will make me a target too." Truth: Sometimes it does. And that\u2019s a real cost. But the research also shows that peer intervention is the single most effective bullying deterrent \u2014 more effective than teacher intervention, school policy, or punishment.' }
    ]
  };

  // Upstander strategies
  var UPSTANDER_MOVES = {
    elementary: [
      { move: 'Stand Next To Them', icon: '\uD83E\uDDF1', desc: 'Just walk over and stand next to the person being bullied. You don\u2019t even have to say anything. Your presence says "they\u2019re not alone."', risk: 'low' },
      { move: 'Change the Subject', icon: '\uD83D\uDDE3\uFE0F', desc: '"Hey, did you hear about ___?" Interrupt the moment without directly confronting the bully. Sometimes distraction is the safest strategy.', risk: 'low' },
      { move: 'Invite Them Away', icon: '\uD83D\uDC4B', desc: '"Hey, want to come play with us?" Give the target an exit that doesn\u2019t require them to "escape" \u2014 it\u2019s just a better offer.', risk: 'low' },
      { move: 'Say Something', icon: '\uD83D\uDCAC', desc: '"That\u2019s not cool" or "Leave them alone." Simple, direct, not aggressive. You\u2019re not starting a fight \u2014 you\u2019re naming what\u2019s wrong.', risk: 'medium' },
      { move: 'Get an Adult', icon: '\uD83C\uDFEB', desc: 'Telling a trusted adult is NOT snitching. It\u2019s protecting someone. If someone was bleeding, you\u2019d get help. This is the same.', risk: 'low' },
      { move: 'Check In Later', icon: '\uD83D\uDC9B', desc: 'Even if you couldn\u2019t do anything in the moment, find the person later and say "Are you okay? That wasn\u2019t right." Delayed kindness still counts.', risk: 'low' },
    ],
    middle: [
      { move: 'The Proximity Move', icon: '\uD83E\uDDF1', desc: 'Physical presence disrupts the dynamic. Walk over. Sit nearby. Make eye contact with the target. You\u2019re signaling: the audience is shifting.', risk: 'low' },
      { move: 'The Redirect', icon: '\uD83D\uDDE3\uFE0F', desc: 'Create a diversion. "Hey, the teacher is looking." "Wasn\u2019t there a game starting?" You\u2019re not confronting \u2014 you\u2019re disrupting.', risk: 'low' },
      { move: 'Name It Publicly', icon: '\uD83D\uDCAC', desc: '"That\u2019s bullying." Sometimes the most powerful thing is to name what everyone can see but nobody is saying. Labels carry social weight.', risk: 'medium' },
      { move: 'Private Support', icon: '\uD83D\uDCF1', desc: 'DM or text the target: "I saw what happened. I\u2019m sorry. Want to talk?" Sometimes the support that matters most comes after the moment.', risk: 'low' },
      { move: 'Refuse the Audience', icon: '\uD83D\uDEB6', desc: 'Walk away visibly. If others follow, the bully loses their stage. Bullying requires an audience. Remove the audience, reduce the power.', risk: 'low' },
      { move: 'Report Strategically', icon: '\uD83D\uDCDD', desc: 'Document what you witnessed. Times, words, who was there. Give this to a trusted adult. Anonymous reporting works too. Evidence changes outcomes.', risk: 'low' },
    ],
    high: [
      { move: 'Strategic Presence', icon: '\uD83E\uDDF1', desc: 'In social dynamics, presence is power. Positioning yourself with the target signals alliance. It doesn\u2019t require words \u2014 proximity IS the message.', risk: 'low' },
      { move: 'The Direct Challenge', icon: '\uD83D\uDCAC', desc: '"What you\u2019re doing isn\u2019t okay." This requires courage and social capital. It works best when you have standing with the group. The risk is real but so is the impact.', risk: 'high' },
      { move: 'Coalition Building', icon: '\uD83E\uDD1D', desc: 'Talk to other bystanders privately. "Did you see that? It\u2019s not right. What if we all said something?" Collective action reduces individual risk.', risk: 'medium' },
      { move: 'The Humanizing Move', icon: '\u2764\uFE0F', desc: 'Sometimes the most radical act is humanizing the target publicly: "They\u2019re actually a really good person. You should get to know them." This challenges the dehumanization that bullying requires.', risk: 'medium' },
      { move: 'Systemic Advocacy', icon: '\uD83D\uDCE2', desc: 'Push for restorative practices at the school level. Advocate for anti-bullying policy that focuses on restoration, not just punishment. Change the system, not just the incident.', risk: 'low' },
      { move: 'After-the-Fact Connection', icon: '\uD83D\uDC9B', desc: '"I should have said something and I didn\u2019t. I\u2019m sorry. I\u2019m here now." Acknowledging your inaction honestly is more healing than performing bravery you didn\u2019t have in the moment.', risk: 'low' },
    ]
  };

  // Breaking the cycle — what actually works
  var CYCLE_BREAKERS = {
    elementary: [
      { title: 'Hurt People Hurt People', text: 'When someone is mean to you, your brain wants to be mean to someone else. That\u2019s normal \u2014 but it\u2019s a chain. You can be the one who breaks it by choosing kindness even when you\u2019re hurting.', icon: '\uD83D\uDD17' },
      { title: 'What Punishment Can\u2019t Do', text: 'Getting in trouble doesn\u2019t teach someone how to be kind. It teaches them not to get caught. Real change happens when someone helps the bully understand WHY their behavior hurts and gives them a different way to feel powerful.', icon: '\u2696\uFE0F' },
      { title: 'You Can Be All Three', text: 'Sometimes you\u2019re the one being hurt. Sometimes you watch it happen. Sometimes \u2014 and this is hard to admit \u2014 you might be the one doing the hurting. All of these are human. The question is what you do next.', icon: '\uD83C\uDF00' },
    ],
    middle: [
      { title: 'The Harm Cycle', text: 'A child is humiliated at home. At school, they humiliate someone smaller. That child goes home and kicks the dog. The dog bites the baby. Harm flows downhill \u2014 until someone absorbs it instead of passing it on. That person is the cycle breaker.', icon: '\uD83D\uDD17' },
      { title: 'Restorative vs. Punitive', text: 'Punishment asks: "What rule was broken?" Restoration asks: "Who was harmed, and what do they need?" One creates compliance through fear. The other creates accountability through empathy. Research shows restorative approaches reduce repeat offenses by 40-60%.', icon: '\u2696\uFE0F' },
      { title: 'The Courage Hierarchy', text: 'Level 1: Don\u2019t participate in bullying. Level 2: Walk away from it. Level 3: Support the target privately. Level 4: Intervene publicly. Level 5: Work to change the system. Every level matters. Start where you are.', icon: '\uD83E\uDDD7' },
    ],
    high: [
      { title: 'The Neuroscience of Cruelty', text: 'Dehumanization \u2014 the cognitive process that enables bullying \u2014 literally deactivates the medial prefrontal cortex, the brain region responsible for mentalizing (seeing others as having thoughts and feelings). Bullying doesn\u2019t just harm the target. It erodes the bully\u2019s own capacity for empathy.', icon: '\uD83E\uDDE0' },
      { title: 'Systems, Not Just Individuals', text: 'Bullying is not a character problem \u2014 it\u2019s an environmental one. Schools with hierarchical social structures, status-based reward systems, and inadequate supervision have more bullying regardless of the students in them (Espelage & Swearer, 2004). To end bullying, change the system that incentivizes it.', icon: '\uD83C\uDFDB\uFE0F' },
      { title: 'Moral Courage as Practice', text: 'Moral courage isn\u2019t a trait you have or don\u2019t have. It\u2019s a skill you practice. Every time you speak up about something small, you build the neural pathways that make it easier to speak up about something big. Start with micro-courage. The muscles grow.', icon: '\uD83E\uDDD7' },
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('upstander', {
    icon: '\uD83E\uDDF1',
    label: 'Upstander Workshop',
    desc: 'Understand bullying from every angle \u2014 target, bystander, and the one doing the hurting \u2014 and find the courage to break the cycle.',
    color: 'blue',
    category: 'social-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      var d = (ctx.toolData && ctx.toolData.upstander) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('upstander', key); }
        else { if (ctx.update) ctx.update('upstander', key, val); }
      };

      var activeTab   = d.activeTab || 'roles';
      var soundOn     = d.soundOn != null ? d.soundOn : true;
      var roleIdx     = d.roleIdx || 0;
      var moveIdx     = d.moveIdx || 0;
      var cycleIdx    = d.cycleIdx || 0;
      var coachInput  = d.coachInput || '';
      var coachHist   = d.coachHist || [];
      var coachLoad   = d.coachLoad || false;
      var pledge      = d.pledge || '';
      var pledgeSaved = d.pledgeSaved || false;

      var BLUE = '#2563eb'; var BL = '#eff6ff'; var BD = '#1e3a8a';

      var TABS = [
        { id: 'roles',  icon: '\uD83D\uDC65', label: 'Three Roles' },
        { id: 'moves',  icon: '\uD83E\uDDF1', label: 'Upstander Moves' },
        { id: 'cycle',  icon: '\uD83D\uDD17', label: 'Break the Cycle' },
        { id: 'pledge', icon: '\u270D\uFE0F', label: 'My Pledge' },
        { id: 'coach',  icon: '\uD83E\uDD16', label: 'Safe Space' },
      ];

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #bfdbfe', background: 'linear-gradient(180deg, #eff6ff, #dbeafe)', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + BLUE + ', #3b82f6)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' },
          role: 'tablist', 'aria-label': 'Upstander sections'
        },
          TABS.map(function(t) {
            var a = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', { key: t.id, role: 'tab', className: 'sel-tab' + (a ? ' sel-tab-active' : ''), 'aria-selected': a ? 'true' : 'false', onClick: function() { upd('activeTab', t.id); if (soundOn) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: a ? 'none' : '1px solid ' + (explored ? '#bfdbfe' : 'transparent'), background: a ? 'linear-gradient(135deg, ' + BLUE + ', #1d4ed8)' : explored ? 'rgba(37,99,235,0.06)' : 'transparent', color: a ? '#fff' : explored ? '#1e3a8a' : '#94a3b8', fontWeight: a ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: a ? '0 3px 12px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: a ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !a ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#60a5fa', marginLeft: '2px' } }) : null
            );
          }),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: BLUE, fontWeight: 700, whiteSpace: 'nowrap', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundOn', !soundOn); }, className: 'sel-btn', 'aria-label': soundOn ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Three Roles ──
      var rolesContent = null;
      if (activeTab === 'roles') {
        var roles = ROLES[band] || ROLES.elementary;
        var cur = roles[roleIdx % roles.length];
        rolesContent = h('div', { style: { padding: '20px', maxWidth: '620px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83D\uDC65'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Understanding the Three Roles'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Every bullying situation has three roles. Understanding all three is how we break the pattern.')
          ),
          // Role selector
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' } },
            roles.map(function(r, i) {
              var active = i === roleIdx % roles.length;
              return h('button', { key: r.id, 'aria-label': r.title, onClick: function() { upd('roleIdx', i); if (soundOn) sfxClick(); },
                style: { flex: 1, padding: '14px 8px', borderRadius: '14px', border: active ? '3px solid ' + r.color : '2px solid #e5e7eb', background: active ? r.color + '20' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', maxWidth: '180px' }
              },
                h('div', { style: { fontSize: '28px', marginBottom: '4px' } }, r.icon),
                h('div', { style: { fontSize: '12px', fontWeight: 700, color: active ? BD : '#374151' } }, r.title)
              );
            })
          ),
          // Role detail
          h('div', { style: { background: cur.color + '15', borderRadius: '16px', padding: '20px', border: '2px solid ' + cur.color + '44' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
              h('span', { style: { fontSize: '32px' } }, cur.icon),
              h('h4', { style: { fontSize: '16px', fontWeight: 800, color: BD, margin: 0 } }, cur.title)
            ),
            // What they feel
            h('div', { style: { marginBottom: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' } }, 'What they might feel:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                cur.feels.map(function(f) {
                  return h('span', { key: f, style: { padding: '3px 10px', background: '#fff', border: '1px solid ' + cur.color + '66', borderRadius: '20px', fontSize: '11px', color: '#374151' } }, f);
                })
              )
            ),
            // The truth
            h('div', { style: { background: '#fff', borderRadius: '10px', padding: '12px', borderLeft: '4px solid ' + BLUE, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: BLUE, marginBottom: '2px' } }, 'The truth:'),
              h('p', { style: { fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 } }, cur.truth)
            ),
            // Myth vs truth
            h('div', { style: { background: '#fef3c7', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.6 } }, cur.myth)
            )
          )
        );
      }

      // ── Upstander Moves ──
      var movesContent = null;
      if (activeTab === 'moves') {
        var moves = UPSTANDER_MOVES[band] || UPSTANDER_MOVES.elementary;
        var curM = moves[moveIdx % moves.length];
        var riskColor = curM.risk === 'high' ? '#dc2626' : curM.risk === 'medium' ? '#d97706' : '#16a34a';
        movesContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83E\uDDF1'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Upstander Moves'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Concrete actions you can take. Each one has a different level of risk \u2014 start where you feel safe.')
          ),
          // Move card
          h('div', { style: { background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                h('span', { style: { fontSize: '28px' } }, curM.icon),
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: '#1f2937', margin: 0 } }, curM.move)
              ),
              h('span', { style: { fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: riskColor + '18', color: riskColor, border: '1px solid ' + riskColor + '44' } }, curM.risk + ' risk')
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#374151', margin: 0 } }, curM.desc)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('moveIdx', (moveIdx - 1 + moves.length) % moves.length); }, 'aria-label': 'Previous move', style: { padding: '8px 16px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#374151' } }, '\u2190 Prev'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#94a3b8' } }, (moveIdx % moves.length + 1) + ' / ' + moves.length),
            h('button', { onClick: function() { upd('moveIdx', (moveIdx + 1) % moves.length); if (soundOn) sfxClick(); }, 'aria-label': 'Next move', style: { padding: '8px 16px', background: BLUE, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' } }, 'Next \u2192')
          )
        );
      }

      // ── Break the Cycle ──
      var cycleContent = null;
      if (activeTab === 'cycle') {
        var breakers = CYCLE_BREAKERS[band] || CYCLE_BREAKERS.elementary;
        cycleContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83D\uDD17'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Breaking the Cycle'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'How harm flows, why punishment fails, and what actually works.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            breakers.map(function(b, i) {
              var active = i === cycleIdx;
              return h('div', { key: i, role: 'button', tabIndex: 0, 'aria-label': b.title, onClick: function() { upd('cycleIdx', i); if (soundOn) sfxClick(); }, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('cycleIdx', i); if (soundOn) sfxClick(); } },
                style: { background: active ? BL : '#fff', border: active ? '2px solid #93c5fd' : '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: active ? '8px' : '0' } },
                  h('span', { style: { fontSize: '24px' } }, b.icon),
                  h('h4', { style: { fontSize: '14px', fontWeight: 700, color: active ? BD : '#374151', margin: 0 } }, b.title)
                ),
                active && h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#374151', margin: '0', paddingLeft: '34px' } }, b.text)
              );
            })
          )
        );
      }

      // ── My Pledge ──
      var pledgeContent = null;
      if (activeTab === 'pledge') {
        pledgeContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\u270D\uFE0F'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'My Upstander Pledge'),
            h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } },
              band === 'elementary' ? 'Write a promise to yourself about how you\u2019ll act when you see bullying.'
              : 'Define who you want to be in the face of cruelty. Not who you think you should be \u2014 who you choose to be.')
          ),
          !pledgeSaved
            ? h('div', { style: { background: BL, borderRadius: '16px', padding: '20px', border: '2px solid #93c5fd' } },
                h('div', { style: { fontSize: '13px', color: BD, fontStyle: 'italic', marginBottom: '10px' } }, 'I pledge to...'),
                h('textarea', { value: pledge, onChange: function(ev) { upd('pledge', ev.target.value); }, 'aria-label': 'Write your upstander pledge',
                  placeholder: band === 'elementary' ? 'When I see someone being bullied, I will...' : 'The kind of person I choose to be when I witness harm...',
                  style: { width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontFamily: 'Georgia, serif', lineHeight: 1.8, color: '#1f2937', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box', outline: 'none' }
                }),
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
                  h('button', { onClick: function() { if (pledge.trim()) { upd('pledgeSaved', true); if (soundOn) sfxBrave(); if (awardXP) awardXP(20, 'Made an Upstander Pledge!'); } }, disabled: !pledge.trim(),
                    style: { padding: '10px 24px', background: pledge.trim() ? BLUE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: pledge.trim() ? 'pointer' : 'not-allowed' }
                  }, '\uD83E\uDDF1 Seal My Pledge')
                )
              )
            : h('div', { style: { background: 'linear-gradient(135deg, ' + BL + ' 0%, #dbeafe 100%)', borderRadius: '16px', padding: '24px', border: '2px solid #93c5fd', textAlign: 'center' } },
                h('div', { style: { fontSize: '32px', marginBottom: '10px' } }, '\uD83E\uDDF1'),
                h('div', { style: { fontSize: '13px', fontStyle: 'italic', color: BD, marginBottom: '6px' } }, 'I pledge to...'),
                h('p', { style: { fontSize: '16px', fontWeight: 600, color: '#1f2937', lineHeight: 1.7, fontFamily: 'Georgia, serif', margin: '0 0 16px' } }, pledge),
                h('div', { style: { fontSize: '12px', color: '#94a3b8' } }, 'Signed by you. Witnessed by your courage.'),
                h('button', { onClick: function() { upd('pledgeSaved', false); }, style: { marginTop: '12px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' } }, 'Edit pledge')
              )
        );
      }

      // ── Safe Space Coach ──
      var coachContent = null;
      if (activeTab === 'coach') {
        // ── Safety Layer: require informed consent before coach access ──
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;

        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now()); // force re-render
          });
        } else {
          // ── Safe Coach send function (uses triangulated safety assessment) ──
          var sendSafeMessage = function(msg) {
            var hist = (coachHist || []).concat([{ role: 'user', text: msg }]);
            upd({ coachHist: hist, coachInput: '', coachLoad: true });

            var coachPrompt = 'You are a safe, trauma-informed support coach for a ' + band + ' school student discussing a bullying experience. They may be the target, the bystander, or even the person who bullied. The student said: "' + msg + '"\n\nRespond with:\n1. Validate without judgment (1 sentence)\n2. Normalize the complexity of feelings (1 sentence)\n3. A gentle next step or reflection question (1 sentence)\n\nNEVER minimize. NEVER blame the target. If they describe being the bully, hold compassion AND accountability. Max 3-4 sentences.';

            // Use safety-wrapped coach if available, otherwise fall back to direct
            var sendFn = (window.SelHub && window.SelHub.safeCoach)
              ? function() {
                  return window.SelHub.safeCoach({
                    studentMessage: msg,
                    coachPrompt: coachPrompt,
                    toolId: 'upstander',
                    band: band,
                    callGemini: callGemini,
                    codename: ctx.studentCodename || 'student',
                    conversationHistory: coachHist || [],
                    onSafetyFlag: onSafetyFlag
                  });
                }
              : function() {
                  return callGemini(coachPrompt, true).then(function(r) { return { response: r, tier: 0, showCrisis: false }; });
                };

            sendFn().then(function(result) {
              var newHist = hist.concat([{ role: 'coach', text: result.response }]);
              upd({ coachHist: newHist, coachLoad: false, _lastTier: result.tier });
              if (awardXP) awardXP(5, 'Used the Safe Space');
            }).catch(function() {
              upd({ coachHist: hist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting. But your courage in talking about this is real. You don\u2019t have to carry it alone.' }]), coachLoad: false });
            });
          };

          coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', marginBottom: '16px' } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.3))' } }, '\uD83E\uDD16'),
              h('h3', { style: { fontSize: '18px', fontWeight: 800, color: BD, margin: '0 0 4px' } }, 'Safe Space'),
              h('p', { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Talk about a bullying experience \u2014 from any role. This space is monitored for your safety.'),
              h('p', { style: { fontSize: '11px', color: '#dc2626', margin: '6px 0 0', fontWeight: 600 } }, '\u26A0\uFE0F If you are in danger, please talk to a trusted adult or call 988.')
            ),
            // Show crisis resources if last message was flagged Tier 3
            (d._lastTier >= 3 && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
            coachHist.length > 0 && h('div', { role: 'log', 'aria-label': 'Safe space conversation', 'aria-live': 'polite', 'aria-busy': coachLoad ? 'true' : 'false', style: { maxHeight: '280px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
              coachHist.map(function(m, i) {
                var u = m.role === 'user';
                return h('div', { key: i, style: { display: 'flex', justifyContent: u ? 'flex-end' : 'flex-start' } },
                  h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: u ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: u ? '#f1f5f9' : BL, border: '1px solid ' + (u ? '#e2e8f0' : '#bfdbfe'), fontSize: '13px', lineHeight: 1.6, color: '#1f2937', whiteSpace: 'pre-wrap' } },
                    !u && h('div', { style: { fontSize: '10px', fontWeight: 700, color: BLUE, marginBottom: '4px' } }, '\uD83E\uDDF1 Safe Space'),
                    m.text
                  )
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: '8px' } },
              h('input', { type: 'text', value: coachInput, onChange: function(ev) { upd('coachInput', ev.target.value); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' && coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !callGemini,
                placeholder: coachLoad ? 'Listening...' : 'Share what happened or how you feel...',
                'aria-label': 'Share your experience',
                style: { flex: 1, border: '2px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                onClick: function() { if (coachInput.trim() && !coachLoad && callGemini) sendSafeMessage(coachInput.trim()); },
                disabled: coachLoad || !coachInput.trim() || !callGemini,
                style: { padding: '10px 16px', background: coachInput.trim() && !coachLoad ? BLUE : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoad ? 'pointer' : 'not-allowed', fontSize: '13px' }
              }, coachLoad ? '\u23F3' : '\uD83E\uDDF1')
            ),
            coachHist.length === 0 && h('div', { style: { marginTop: '16px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' } }, 'You might share:'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                ['Someone is being mean to me at school', 'I watched it happen and didn\u2019t do anything', 'I think I might have been the bully', 'I don\u2019t know what role I played but it still hurts'].map(function(p) {
                  return h('button', { key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                    style: { padding: '5px 10px', background: BL, border: '1px solid #bfdbfe', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: BD, fontWeight: 500 }
                  }, p);
                })
              )
            )
          );
        }
      }

      var content = rolesContent || movesContent || cycleContent || pledgeContent || coachContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, tabBar, h('div', { style: { flex: 1, overflow: 'auto' } }, content));
    }
  });
})();
