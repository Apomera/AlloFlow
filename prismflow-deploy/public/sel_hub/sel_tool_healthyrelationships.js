// ═══════════════════════════════════════════════════════════════
// sel_tool_healthyrelationships.js — Healthy Relationships
// Adolescent relationship education built on the Loveisrespect /
// NDVH (National Domestic Violence Hotline) framework: the
// spectrum of healthy / unhealthy / abusive, consent, boundaries,
// communication patterns, and dating-violence prevention.
//
// Inclusive of queer relationships, neurodivergent and disabled
// relational patterns, racialized dynamics. Strong safety framing
// pointing to Loveisrespect.org and RAINN.
//
// Covers FRIENDSHIPS as well as romantic relationships, since the
// patterns apply across both and most students engage with this
// content earlier through friendship.
//
// Registered tool ID: "healthyRelationships"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('healthyRelationships'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-relationships')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-relationships';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The Loveisrespect spectrum: 8 categories, each rated healthy / unhealthy / abusive
  var DIMENSIONS = [
    { id: 'communication', label: 'Communication', icon: '💬', color: '#0ea5e9',
      healthy: 'You can tell each other what you think and feel without fear. Disagreements happen, but you can work through them. You listen as much as you talk.',
      unhealthy: 'Silent treatment, sarcasm as a weapon, manipulation, walking on eggshells, never bringing up real feelings.',
      abusive: 'Yelling, name-calling, threats, public humiliation, demands you account for every minute, pressure to perform a certain version of yourself.' },
    { id: 'trust', label: 'Trust', icon: '🤝', color: '#22c55e',
      healthy: 'You trust each other to be honest. When something feels off, you can ask without it becoming a fight.',
      unhealthy: 'Constant checking up, accusations without evidence, repeated lies, jealousy that you have to manage all the time.',
      abusive: 'Demands for passwords, monitoring of location and texts, accusations as a control tactic, isolating you from people who would notice.' },
    { id: 'respect', label: 'Respect', icon: '🌟', color: '#a855f7',
      healthy: 'Your interests, hobbies, friends, family, and opinions are seen as valid even when different. You feel respected as a whole person.',
      unhealthy: 'Dismissing what matters to you. Making fun of your interests or opinions. Treating your time as less important than theirs.',
      abusive: 'Calling you stupid, ugly, worthless. Mocking your identity (race, gender, disability, sexuality). Treating you as property.' },
    { id: 'consent', label: 'Consent (any physical contact)', icon: '✋', color: '#ec4899',
      healthy: 'Everything physical is consensual. Both people freely choose, both can pause or stop at any time, neither is pressured. Yes is enthusiastic, not just absence of no.',
      unhealthy: 'Wearing someone down, guilt-tripping, "just this once," repeatedly asking after a no, treating reluctance as a hurdle.',
      abusive: 'Coercion through threats or manipulation. Continuing after no. Acts while impaired (alcohol, drugs, asleep). Sexual contact without consent IS sexual assault.' },
    { id: 'support', label: 'Support', icon: '🌱', color: '#16a34a',
      healthy: 'You\'re each other\'s cheerleader for things you care about. You show up when it\'s hard. You celebrate each other\'s wins without competing.',
      unhealthy: 'Conditional support ("I\'ll be there IF you do X"). Resenting your successes. Withdrawing when you need them.',
      abusive: 'Actively undermining your goals, friendships, school, family. Sabotaging your independence.' },
    { id: 'independence', label: 'Independence', icon: '🦋', color: '#f59e0b',
      healthy: 'You have other people, interests, and parts of your life that don\'t involve them. Spending time apart is normal. The relationship adds to your life, doesn\'t replace it.',
      unhealthy: 'Pressure to spend all your time together. Guilt when you see other friends or family. Losing yourself in the relationship.',
      abusive: 'Isolation from family, friends, school, work. Demands for constant contact. Punishments (silent treatment, anger, threats) when you have time away.' },
    { id: 'conflict', label: 'Conflict & repair', icon: '⚖️', color: '#6366f1',
      healthy: 'You disagree, you fight sometimes, AND you can come back together, repair, apologize when wrong. Conflict doesn\'t end the relationship.',
      unhealthy: 'Fights that go on for days. Bringing up old hurts every time. Apologies that aren\'t followed by changes. Stonewalling.',
      abusive: 'Conflict involves violence (hitting, throwing things, breaking your stuff). Threats. Apologies followed by repeat behavior (the cycle of abuse).' },
    { id: 'safety', label: 'Physical & emotional safety', icon: '🛡️', color: '#ef4444',
      healthy: 'You feel physically safe. You feel emotionally safe — you can be your real self. You don\'t fear consequences for honest feelings.',
      unhealthy: 'You walk on eggshells. You hide parts of yourself. You\'re afraid of their reactions to small things.',
      abusive: 'Hitting, pushing, choking, restraining, sexual coercion, threats with weapons. You change your behavior to avoid violence. THIS IS DOMESTIC VIOLENCE. It is not your fault. Help: 1-800-799-7233 (NDVH), text "START" to 88788, loveisrespect.org.' }
  ];

  // Consent specifics
  var CONSENT_PRINCIPLES = [
    { id: 'freely', label: 'Freely given', what: 'Not pressured, not manipulated, not bargained for, not after wearing someone down.' },
    { id: 'enthusiastic', label: 'Enthusiastic (not just absence of no)', what: 'A real yes, not a tired "fine" or silence. "Maybe" is not yes. "I don\'t know" is not yes.' },
    { id: 'ongoing', label: 'Ongoing', what: 'Consent for kissing is not consent for more. Consent yesterday is not consent today. You can withdraw at any moment for any reason.' },
    { id: 'specific', label: 'Specific', what: 'Consent for this specific act, not for a category. Consent for a kiss is not consent for sex.' },
    { id: 'informed', label: 'Informed', what: 'Both people know what they\'re agreeing to. Lying about birth control, STI status, or recording someone violates this.' },
    { id: 'capacity', label: 'Capacity to consent', what: 'Drunk, high, asleep, unconscious — no capacity. Younger than the age of consent in your state — no capacity. Power imbalance (teacher, coach, boss, much older partner) — questioned capacity.' },
    { id: 'reversible', label: 'Reversible', what: 'Saying yes once does not commit you to forever. You can change your mind mid-act. "Stop" means stop, no questions.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      // Self-check: per dimension, healthy / unhealthy / abusive / mixed
      check: {},          // dimensionId -> 'healthy' | 'unhealthy' | 'abusive' | 'mixed'
      checkContext: '',   // who/what relationship is being assessed (private)
      // Notes
      notes: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('healthyRelationships', {
    icon: '💞',
    label: 'Healthy Relationships',
    desc: 'The spectrum of healthy / unhealthy / abusive across 8 dimensions of relationships (friendship or romantic). Plus consent education and dating-violence prevention. Built on the Loveisrespect / NDVH framework. Inclusive of queer, neurodivergent, and disabled folks. Strong safety referral framing.',
    color: 'pink',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.healthyRelationships || defaultState();
      function setHR(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.healthyRelationships) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { healthyRelationships: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setHR({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#f9a8d4', fontSize: 22, fontWeight: 900 } }, '💞 Healthy Relationships'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'The spectrum, the consent basics, the safety map.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'The spectrum', icon: '💞' },
          { id: 'check', label: 'Check a relationship', icon: '🔍' },
          { id: 'consent', label: 'Consent', icon: '✋' },
          { id: 'safety', label: 'Safety + help', icon: '🆘' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Healthy Relationships sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#ec4899' : '#334155'),
                background: active ? 'rgba(236,72,153,0.18)' : '#1e293b',
                color: active ? '#fbcfe8' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🆘 If you are in a relationship that is hurting you: '),
          'help exists. ',
          h('a', { href: 'https://www.loveisrespect.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'loveisrespect.org ↗'),
          ' (text LOVEIS to 22522, or call 1-866-331-9474) is for teens. ',
          h('a', { href: 'https://www.thehotline.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'thehotline.org ↗'),
          ' is the National Domestic Violence Hotline: 1-800-799-7233 or text START to 88788. ',
          h('a', { href: 'https://www.rainn.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'rainn.org ↗'),
          ' is for sexual assault: 1-800-656-4673. All are free, confidential, 24/7.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is education, not therapy. For specific help with a relationship: see Loveisrespect (teens), NDVH (adults), or talk to a school counselor or therapist.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — the spectrum
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(236,72,153,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(236,72,153,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbcfe8', marginBottom: 4 } }, 'Relationships exist on a spectrum.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Most relationships have HEALTHY parts, UNHEALTHY parts, and (sometimes) ABUSIVE parts. No relationship is perfect. The point of this tool is not to find a perfect one; it is to know the difference between "we\'re working on stuff" and "this is hurting me."'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'The framework below works for ANY relationship — friend, partner, family member, coach. It comes from Loveisrespect, the leading youth dating-violence prevention program in the US.'
            )
          ),

          // The 3 zones
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '4px solid #22c55e' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 6 } }, '✓ HEALTHY'),
              h('p', { style: { margin: 0, color: '#dcfce7', fontSize: 12.5, lineHeight: 1.65 } },
                'Mutual respect, communication, trust, support, independence, fairness, consent, safety. Not perfect, but the pattern is good.')
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '4px solid #f59e0b' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 6 } }, '~ UNHEALTHY'),
              h('p', { style: { margin: 0, color: '#fef3c7', fontSize: 12.5, lineHeight: 1.65 } },
                'Imbalance: one person controls more, one gives more, communication breaks down. Not abuse, but the pattern is wearing you down. Can often be repaired with effort from both people.')
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '✕ ABUSIVE'),
              h('p', { style: { margin: 0, color: '#fee2e2', fontSize: 12.5, lineHeight: 1.65 } },
                'One person controls or harms the other through fear, manipulation, threats, isolation, physical or sexual violence. Cannot be fixed by the person being harmed. NOT your fault. Help exists.')
            )
          ),

          // 8 dimensions overview
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 10 } }, '🔍 The 8 dimensions every relationship has'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 } },
              DIMENSIONS.map(function(dim) {
                return h('div', { key: dim.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid ' + dim.color, display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { fontSize: 16 } }, dim.icon),
                  h('span', { style: { fontSize: 12, fontWeight: 700, color: dim.color } }, dim.label)
                );
              })
            )
          ),

          // Inclusive note
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.65 } },
            h('strong', null, '🌐 Applies across all kinds of relationships. '),
            'These principles work the same for friend / romantic, queer / straight, monogamous / non-monogamous, neurotypical / neurodivergent. Disabled folks have higher rates of being abused; this is structural, not their fault. Trans youth face specific dating-violence risks; the Trevor Project (1-866-488-7386) has identity-specific resources.'
          ),

          // Roadmap
          stepCard('🔍 Check a relationship', 'Run a specific relationship through the 8 dimensions. Private, no shared data. For a friendship, a romance, a family relationship — any of them.', function() { goto('check'); }, '#0ea5e9'),
          stepCard('✋ Consent in detail', 'The 7 principles of meaningful consent. Specific. Applies to physical contact of any kind.', function() { goto('consent'); }, '#ec4899'),
          stepCard('🆘 Safety + help', 'Specific resources, what to do if you or a friend is being hurt, leaving plans, and a list of helplines.', function() { goto('safety'); }, '#ef4444'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHECK — relationship spectrum
      // ═══════════════════════════════════════════════════════════
      function renderCheck() {
        function setDim(id, value) {
          var ch = Object.assign({}, (d.check || {}));
          ch[id] = value;
          setHR({ check: ch });
        }

        var check = d.check || {};
        var abuseCount = Object.keys(check).filter(function(k) { return check[k] === 'abusive'; }).length;
        var unhealthyCount = Object.keys(check).filter(function(k) { return check[k] === 'unhealthy'; }).length;

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.7 } },
            h('strong', null, '🔍 Run a specific relationship through the 8 dimensions. '),
            'Be honest. This is private. The point is clarity, not judgment of the other person. You can think about a friend, a partner, a family member, a coach — any close relationship.'
          ),

          // Context
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 12 } },
            h('label', { htmlFor: 'hr-context', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Which relationship am I checking? (optional, private)'),
            h('input', { id: 'hr-context', type: 'text', value: d.checkContext || '',
              placeholder: 'e.g. me and Sam (friend), me and my partner, me and my mom',
              onChange: function(e) { setHR({ checkContext: e.target.value }); },
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
          ),

          // Each dimension
          DIMENSIONS.map(function(dim) {
            var current = check[dim.id];
            return h('div', { key: dim.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + dim.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                h('span', { style: { fontSize: 20 } }, dim.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: dim.color } }, dim.label)
              ),

              // Three descriptions
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6, marginBottom: 10 } },
                h('button', { onClick: function() { setDim(dim.id, 'healthy'); }, 'aria-pressed': current === 'healthy',
                  style: { textAlign: 'left', padding: 10, borderRadius: 6, border: '2px solid ' + (current === 'healthy' ? '#22c55e' : '#1e293b'), background: current === 'healthy' ? 'rgba(34,197,94,0.10)' : '#1e293b', cursor: 'pointer', color: '#e2e8f0' } },
                  h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, marginBottom: 4 } }, '✓ HEALTHY'),
                  h('div', { style: { fontSize: 11.5, color: '#dcfce7', lineHeight: 1.6 } }, dim.healthy)
                ),
                h('button', { onClick: function() { setDim(dim.id, 'unhealthy'); }, 'aria-pressed': current === 'unhealthy',
                  style: { textAlign: 'left', padding: 10, borderRadius: 6, border: '2px solid ' + (current === 'unhealthy' ? '#f59e0b' : '#1e293b'), background: current === 'unhealthy' ? 'rgba(245,158,11,0.10)' : '#1e293b', cursor: 'pointer', color: '#e2e8f0' } },
                  h('div', { style: { fontSize: 11, color: '#fde68a', fontWeight: 800, marginBottom: 4 } }, '~ UNHEALTHY'),
                  h('div', { style: { fontSize: 11.5, color: '#fef3c7', lineHeight: 1.6 } }, dim.unhealthy)
                ),
                h('button', { onClick: function() { setDim(dim.id, 'abusive'); }, 'aria-pressed': current === 'abusive',
                  style: { textAlign: 'left', padding: 10, borderRadius: 6, border: '2px solid ' + (current === 'abusive' ? '#ef4444' : '#1e293b'), background: current === 'abusive' ? 'rgba(239,68,68,0.10)' : '#1e293b', cursor: 'pointer', color: '#e2e8f0' } },
                  h('div', { style: { fontSize: 11, color: '#fca5a5', fontWeight: 800, marginBottom: 4 } }, '✕ ABUSIVE'),
                  h('div', { style: { fontSize: 11.5, color: '#fee2e2', lineHeight: 1.6 } }, dim.abusive)
                )
              )
            );
          }),

          // Summary
          Object.keys(check).length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginTop: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 8 } }, '📊 What this is showing'),
            abuseCount >= 1 ? h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(239,68,68,0.10)', borderLeft: '3px solid #ef4444', marginBottom: 8, fontSize: 13, color: '#fecaca', lineHeight: 1.7 } },
              h('strong', null, '⚠️ ' + abuseCount + ' dimension' + (abuseCount === 1 ? '' : 's') + ' marked abusive. '),
              'This is not "working through stuff." This is harm. Please reach out: loveisrespect.org (text LOVEIS to 22522), NDVH (1-800-799-7233), or a school counselor. It is NOT your fault.'
            ) : null,
            unhealthyCount >= 3 && abuseCount === 0 ? h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(245,158,11,0.10)', borderLeft: '3px solid #f59e0b', marginBottom: 8, fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
              h('strong', null, '⚖️ Multiple unhealthy dimensions. '),
              'The relationship is wearing you down. Two paths: have a real conversation with the other person and see if both of you can work on it, or step back. A counselor or therapist can help you think it through.'
            ) : null
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CONSENT
      // ═══════════════════════════════════════════════════════════
      function renderConsent() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(236,72,153,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(236,72,153,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbcfe8', marginBottom: 4 } }, 'Consent is not the absence of no.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Consent is a clear, enthusiastic, ongoing yes. It can be withdrawn. It is specific. It cannot be given by someone who lacks capacity (drunk, asleep, underage). Sex without consent is sexual assault, regardless of relationship status.'
            )
          ),

          CONSENT_PRINCIPLES.map(function(p) {
            return h('div', { key: p.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 4 } }, p.label),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } }, p.what)
            );
          }),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginTop: 14, fontSize: 13, color: '#fecaca', lineHeight: 1.7 } },
            h('strong', null, '⚠️ Coercion is not consent. '),
            'If someone wears you down, threatens to break up with you, threatens to spread photos or rumors, threatens self-harm if you don\'t — that is coercion, and consent under coercion is not consent. If someone has sex with you while you are drunk, high, or asleep, that is sexual assault. If you are not sure: RAINN has trained advocates 24/7 at 1-800-656-4673 or ',
            h('a', { href: 'https://www.rainn.org/', target: '_blank', rel: 'noopener noreferrer',
              style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'rainn.org ↗'),
            '.'
          ),

          // Age of consent reminder
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginTop: 10, fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
            h('strong', null, '⚖️ Age of consent varies by state. '),
            'In Maine, the age of consent is 16. In some states it is 17 or 18. Power-imbalance laws often apply when one person is much older or in a position of authority (teacher, coach, supervisor) regardless of age. A relationship with significant age gap may not be legal even if you both feel like you want it. This is structural, not about your feelings.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SAFETY
      // ═══════════════════════════════════════════════════════════
      function renderSafety() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(239,68,68,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fecaca', marginBottom: 4 } }, 'If a relationship is hurting you — please read this.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Being in an unhealthy or abusive relationship is NOT a sign of weakness or stupidity. Abusers are often charming, often start subtly, and the relationship escalates over months. By the time the harm is clear, you are often isolated from people who would help you see it. It is not your fault.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Leaving an abusive relationship is genuinely dangerous (the most dangerous time for survivors is the period right around leaving). DO NOT leave without a plan. The hotlines below can help you plan safely.'
            )
          ),

          // How abuse builds — grooming as a process
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f97316', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fdba74', marginBottom: 6 } }, '🧩 How abuse builds: grooming as a process'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
              'Grooming is not just a checklist of warning signs. It is a sequence. Naming the stage you might be in is often the only way to recognize the pattern from the inside, because each stage by itself can look like care, attention, or love. This is true for adult predators AND for peer perpetrators (older partners, older siblings, friends).'
            ),
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#fed7aa', fontSize: 13, lineHeight: 1.8 } },
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Targeting. '), 'Someone notices a vulnerability: family conflict, isolation, recent loss, low self-worth, an identity that feels unseen at home. The vulnerability is not the survivor\'s fault; it is what is being exploited.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Trust and access. '), 'They build trust with you AND often with the adults around you. Teachers, parents, friends say "they seem so nice." That is part of the access.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Filling a need. '), 'Attention, validation, mentorship, gifts, money, drugs, a sense of belonging, sexual attention, "you are mature for your age." The unmet need is real; the way it is being met has strings.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Isolating. '), 'Slowly, your other supports get cut off. The relationship feels exclusive ("we get each other in a way no one else does"). Friends and family drift away or get framed as the problem.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Desensitizing. '), 'Physical, emotional, or sexual lines get crossed, slowly. Secrecy becomes normal. "This is just between us." Each crossing makes the next one feel smaller than it is.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Maintaining. '), 'Shame, blackmail, gaslighting, threats, or trauma bonds (see below) keep the situation hidden. By this point, the survivor often feels they cannot leave even when they want to.')
            ),
            h('div', { style: { marginTop: 10, padding: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, fontSize: 11.5, color: '#fed7aa', lineHeight: 1.55 } },
              h('strong', null, 'If you recognize a stage you are in: '),
              'that recognition is the work. Call a hotline before you decide what to do. They can help you plan safely.'
            )
          ),

          // The cycle of abuse — Walker (1979)
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, '🔄 The cycle of abuse'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
              'Lenore Walker described this in 1979 and it is still the standard frame in intimate-partner-violence training. The reason "but they apologized and things were good for a while" feels true is because reconciliation is part of the cycle, not evidence the cycle is over.'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 } },
              [
                { name: '1. Tension building', desc: 'Small incidents. Walking on eggshells. You sense an explosion is coming.' },
                { name: '2. Incident', desc: 'The verbal, emotional, physical, or sexual incident itself.' },
                { name: '3. Reconciliation', desc: 'Apologies. Promises to change. Gifts. Intense intimacy. Sometimes called the "honeymoon" phase.' },
                { name: '4. Calm', desc: 'Things feel okay again. The relationship feels worth saving. Then tension begins to build.' }
              ].map(function(p, i) {
                return h('div', { key: i, style: { padding: 8, background: 'rgba(168,85,247,0.08)', borderRadius: 6, border: '1px solid rgba(168,85,247,0.25)' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#d8b4fe', marginBottom: 3 } }, p.name),
                  h('div', { style: { fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.5 } }, p.desc)
                );
              })
            ),
            h('div', { style: { marginTop: 10, padding: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.55 } },
              h('strong', null, 'Important: '),
              'incidents tend to escalate over time, and the reconciliation/calm phase tends to shrink. "They were so good after the last fight" is not safety. It is the cycle.'
            )
          ),

          // Coercive control — Stark (2007)
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #0891b2', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#67e8f9', marginBottom: 6 } }, '🕸️ Coercive control: the umbrella pattern'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
              'Evan Stark, 2007, argued that the core dynamic of intimate-partner abuse is not isolated violent incidents but an ongoing pattern of domination. This is now criminalized in the UK, Ireland, France, and several US states (CA, CT, HI). Most teen abuse is coercive-control-shaped, not punch-shaped, which is why it can be invisible to outside observers, parents, friends, even to the survivor.'
            ),
            h('p', { style: { margin: '0 0 6px', color: '#cffafe', fontSize: 12.5, lineHeight: 1.65 } }, 'The four tactics that show up together:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#cffafe', fontSize: 12.5, lineHeight: 1.7 } },
              h('li', null, h('strong', null, 'Violence: '), 'physical, sexual, or threats of either.'),
              h('li', null, h('strong', null, 'Intimidation: '), 'tone, anger displays, punching walls, harming pets, "look what you made me do."'),
              h('li', null, h('strong', null, 'Isolation: '), 'cutting off friends, family, school, work; demanding all your time and attention.'),
              h('li', null, h('strong', null, 'Control: '), 'monitoring phone, location, money, clothes, food, sleep, who you talk to; managing your daily life in ways framed as care.')
            ),
            h('div', { style: { marginTop: 10, padding: 8, background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.3)', borderRadius: 6, fontSize: 11.5, color: '#cffafe', lineHeight: 1.55 } },
              h('strong', null, 'Each individual control act can look like love. '),
              'The pattern across many small acts is what makes it coercive control. If you find yourself explaining away ten small things, that is information.'
            )
          ),

          // Names for the patterns — psychoeducation
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #6366f1', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 6 } }, '📖 Names for the patterns'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
              'These are common patterns that show up across abusive relationships. Having a name for what is happening is power: you can google it, find others who have experienced it, and stop blaming yourself for not seeing it sooner.'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              [
                { name: 'Love bombing', what: 'Overwhelming attention, gifts, intensity, declarations in the first weeks. Establishes "amazing" as the baseline, so later withdrawal feels like something you did wrong. Often paired with rapid commitment escalation ("soulmates," "move in," "I have never felt this way").' },
                { name: 'Gaslighting', what: 'Making you doubt your own memory, perception, or sanity. "That never happened." "You are remembering it wrong." "You are too sensitive." The goal is to erode your trust in yourself so you trust their version of reality more.' },
                { name: 'DARVO', what: 'A predictable response when you call out their behavior: Deny ("I never did that"), Attack ("How dare you accuse me"), Reverse Victim and Offender ("I am the one being hurt here"). Naming the pattern, from Jennifer Freyd, helps you not internalize the reversal.' },
                { name: 'Trauma bonding', what: 'Why staying makes sense to a survivor and "why didn\'t you just leave?" is the wrong question. Intermittent reinforcement (bad mixed with good) creates a stronger attachment than steady good treatment. The same neuroscience that makes gambling addictive. Missing them after you leave is the trauma bond breaking, not evidence the relationship was good.' },
                { name: 'Future faking', what: 'Detailed promises about a shared future used to maintain the relationship during bad periods. "When we move in," "next summer when we travel." The promises are not lies in the usual sense; they are tools.' },
                { name: 'Hoovering', what: 'After a breakup or pull-back, sudden return with intense affection, a crisis ("I am suicidal because of you"), or a gesture meant to pull you back in. Named for the vacuum that sucks you back.' }
              ].map(function(p, i) {
                return h('div', { key: i, style: { padding: 8, background: 'rgba(99,102,241,0.08)', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)' } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#c7d2fe', marginBottom: 3 } }, p.name),
                  h('div', { style: { fontSize: 12, color: '#e0e7ff', lineHeight: 1.55 } }, p.what)
                );
              })
            )
          ),

          // Identity-specific control tactics
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #14b8a6', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 6 } }, '🌈 Identity-specific control tactics'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } },
              'Abusers exploit whatever leverage your identity gives them. None of these mean the abuse is your fault. All of them are recognized in domestic-violence training. Help exists that understands these specifics; the hotlines below will not out you, will not call ICE, will not call the police without your consent.'
            ),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#a7f3d0', fontSize: 12.5, lineHeight: 1.75 } },
              h('li', null, h('strong', null, 'LGBTQ+: '), 'threatening to out you to family, school, sports team, work. Saying "no one else will accept you." Weaponizing community gatekeeping. Trevor Project (1-866-488-7386) and Loveisrespect both have LGBTQ+-affirming staff.'),
              h('li', null, h('strong', null, 'Disability: '), 'controlling medications, mobility aids, transportation, or financial access. Withholding care or PCA hours. Using "I am your caregiver" as a control tactic. The National Domestic Violence Hotline has disability-specific resources.'),
              h('li', null, h('strong', null, 'Immigration status: '), 'threatening to call ICE, withholding documents, using your status as leverage. There are protections (VAWA, U-visas) for survivors of intimate-partner violence regardless of status. Tahirih Justice Center (1-571-282-6161) specializes in immigrant survivors.'),
              h('li', null, h('strong', null, 'Race: '), 'weaponizing the criminal justice system; calling police as a threat against a partner of color knowing the risks. Some hotlines partner with culturally-specific advocates; ask when you call.'),
              h('li', null, h('strong', null, 'Religion: '), 'using shared faith community against you ("the elders will side with me," "you cannot leave a covenant marriage"). FaithTrust Institute supports survivors navigating religious contexts.')
            )
          ),

          // Red flags
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 10 } }, '🚩 Red flags (early warning signs)'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#fee2e2', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Pressuring you for sex or pictures'),
              h('li', null, 'Wanting your passwords, location, social media'),
              h('li', null, 'Telling you who you can hang out with, talk to, see'),
              h('li', null, 'Putting you down ("just joking"), in private or in public'),
              h('li', null, 'Showing up uninvited / repeatedly when you wanted space'),
              h('li', null, 'Threats — to break up, to spread photos, to hurt themselves, to hurt you, to hurt your pet'),
              h('li', null, 'Anger that scares you, even if "they didn\'t mean it"'),
              h('li', null, 'Apologies followed by the same behavior again'),
              h('li', null, 'Making you feel crazy, like the problem is yours'),
              h('li', null, 'Anything physical: pushing, grabbing, hitting, throwing things, breaking your stuff'),
              h('li', null, 'Anything sexual without enthusiastic consent')
            )
          ),

          // What to do
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '✓ What to do (in this order)'),
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#dcfce7', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Tell someone. '), 'A trusted adult — parent, school counselor, school psych, coach, aunt, family friend. Isolation is part of how abuse works; breaking it is the first step.'),
              h('li', null, h('strong', null, 'Call or text a hotline. '), 'Loveisrespect (teens): text LOVEIS to 22522 or call 1-866-331-9474. NDVH: 1-800-799-7233. Free, confidential, 24/7. They can help you plan.'),
              h('li', null, h('strong', null, 'Do NOT confront the abuser. '), 'Especially if they have been physical. The most dangerous time is right before / during leaving. A plan, ideally with adults involved, comes first.'),
              h('li', null, h('strong', null, 'Document. '), 'If safe, screenshot threats, photos of injuries, dates of incidents. Keep them somewhere they can\'t access (a friend\'s phone, a hidden cloud account).'),
              h('li', null, h('strong', null, 'Safety plan. '), 'If you might need to leave fast: pack a bag (somewhere not at home), have emergency cash, keep your phone charged, know who you can stay with.'),
              h('li', null, h('strong', null, 'Get support. '), 'Even after you\'re safe. A therapist who specializes in trauma can help process what happened. You are not alone.')
            )
          ),

          // Helplines
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 10 } }, '📞 Free, confidential, 24/7'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              helplineCard('Loveisrespect (teens, dating violence)', 'Text LOVEIS to 22522', 'Call 1-866-331-9474', 'https://www.loveisrespect.org/'),
              helplineCard('National Domestic Violence Hotline', 'Text START to 88788', 'Call 1-800-799-7233', 'https://www.thehotline.org/'),
              helplineCard('RAINN (sexual assault)', 'Online chat at rainn.org', 'Call 1-800-656-4673', 'https://www.rainn.org/'),
              helplineCard('988 Suicide and Crisis Lifeline', 'Text or call 988', 'Online chat at 988lifeline.org', 'https://988lifeline.org/'),
              helplineCard('Crisis Text Line', 'Text HOME to 741741', '', 'https://www.crisistextline.org/'),
              helplineCard('Trevor Project (LGBTQ+ youth)', 'Text START to 678-678', 'Call 1-866-488-7386', 'https://www.thetrevorproject.org/')
            )
          ),

          softPointer()
        );
      }

      function helplineCard(name, line1, line2, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', borderLeft: '3px solid #ec4899' } },
          h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
            style: { fontSize: 12.5, color: '#fbcfe8', fontWeight: 800, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, name + ' ↗'),
          h('div', { style: { fontSize: 12, color: '#e2e8f0' } }, line1),
          line2 ? h('div', { style: { fontSize: 12, color: '#cbd5e1' } }, line2) : null
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('healthyRelationships', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#f9a8d4', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Adolescent relationship education across friendship and romantic relationships, built on the Loveisrespect / National Domestic Violence Hotline framework. The spectrum (healthy / unhealthy / abusive) is widely used in evidence-based teen dating violence prevention. The consent material is current best-practice in sexual education.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is educational, not therapeutic. For students in or leaving abusive relationships, please use the hotlines (which are staffed by trained advocates) and a school counselor, not just this tool.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#f9a8d4', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Loveisrespect', 'loveisrespect.org', 'Project of NDVH; the leading youth dating violence prevention resource. 24/7 hotline, online chat, text line.', 'https://www.loveisrespect.org/'),
            sourceCard('National Domestic Violence Hotline', 'thehotline.org', 'Adult-focused but serves youth too. Free, confidential, 24/7.', 'https://www.thehotline.org/'),
            sourceCard('RAINN (Rape, Abuse & Incest National Network)', 'rainn.org', 'Largest US anti-sexual-violence organization. Free hotline and online support.', 'https://www.rainn.org/'),
            sourceCard('Futures Without Violence', 'futureswithoutviolence.org', 'Research and prevention. The Family Violence Prevention Fund\'s successor.', 'https://www.futureswithoutviolence.org/'),
            sourceCard('Centers for Disease Control', 'Dating Matters program', 'CDC\'s evidence-based teen dating violence prevention curriculum.', 'https://www.cdc.gov/violenceprevention/intimatepartnerviolence/datingmatters/index.html'),
            sourceCard('The Trevor Project', 'thetrevorproject.org', 'LGBTQ+ youth crisis and education. Critical resource for queer and trans youth.', 'https://www.thetrevorproject.org/'),
            sourceCard('Vera House', 'verahouse.org', 'Comprehensive sexual and domestic violence services. Good adult survivor resources.', 'https://www.verahouse.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Teen dating violence rates are roughly 1 in 3 high schoolers (CDC data). This is common; many students reading this are in or have been in unhealthy relationships. Stigma keeps it hidden.'),
              h('li', null, 'LGBTQ+ youth experience dating violence at similar or higher rates than straight youth; trans youth especially. The Trevor Project has identity-specific resources.'),
              h('li', null, 'Disabled youth experience dating violence at higher rates (research is clear). Reduced privacy, dependence on caregivers, and ableist assumptions make this both more common and harder to disclose.'),
              h('li', null, 'For students in abusive relationships in families (parents abusing each other, sibling abuse): the same patterns apply. CPS (Child Protective Services) and school counselors are mandatory reporters and can help.'),
              h('li', null, 'This tool is US-framed. Specific laws, hotlines, and cultural norms differ in other countries.'),
              h('li', null, 'For ALL relationships, including the ones that look like a model from the outside: nobody is at 100% healthy across all 8 dimensions all the time. The point is the PATTERN, not the worst day.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', fontSize: 12.5, color: '#fbcfe8', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Teen dating violence is one of the most-missed adolescent health issues. Educators are the most common adults to first hear about it. Listen, believe, don\'t pressure (the student knows their situation better than you do), and connect them to a counselor or hotline. Loveisrespect has free educator training and curriculum at loveisrespect.org/for-professionals. For sexual assault disclosures: most states make educators mandatory reporters; know your state\'s laws. Have hotline numbers visible in your classroom.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#f9a8d4', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fbcfe8', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fbcfe8', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      function renderPrintView() {
        var check = d.check || {};
        var any = Object.keys(check).length > 0;
        var ratingColor = { healthy: '#16a34a', mixed: '#d97706', unhealthy: '#dc2626', abusive: '#7f1d1d' };
        var ratingLabel = { healthy: 'Healthy', mixed: 'Mixed', unhealthy: 'Unhealthy', abusive: 'Abusive' };

        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.4)', borderLeft: '3px solid #ec4899', marginBottom: 12, fontSize: 12.5, color: '#fbcfe8', lineHeight: 1.65 } },
            h('strong', null, '🖨 Print my relationship-check artifact. '),
            'This is private. Print only for yourself or to bring to a counselor / school psych you trust. The 8-dimension Loveisrespect spectrum + your ratings + safety contacts. Nothing is saved or shared anywhere.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),

          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#hr-print-region, #hr-print-region * { visibility: visible !important; } ' +
            '#hr-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#hr-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),

          h('div', { id: 'hr-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'Relationship Check'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'Loveisrespect / NDVH spectrum')
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, 'Confidential. '),
              'This artifact is for the person who filled it out. If you are in a dating relationship that is hurting you, help: loveisrespect.org (text LOVEIS to 22522 or 1-866-331-9474). 24/7: NDVH 1-800-799-7233 (text START to 88788). Sexual violence: RAINN 1-800-656-4673.'
            ),

            d.checkContext ? h('div', { style: { padding: 10, border: '2px solid #0f172a', borderRadius: 8, marginBottom: 12 } },
              h('div', { style: { fontSize: 10.5, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Who / what relationship'),
              h('div', { style: { fontSize: 13, color: '#0f172a' } }, d.checkContext)
            ) : null,

            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'My ratings across the 8 dimensions'),
              !any ? h('div', { style: { fontSize: 13, fontStyle: 'italic', color: '#475569' } }, '(no ratings yet — open the Check tab and answer for each dimension)') : null,
              DIMENSIONS.map(function(dim) {
                var r = check[dim.id];
                return h('div', { key: dim.id, style: { padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 6, pageBreakInside: 'avoid' } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a' } }, dim.label),
                    r ? h('div', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: '1px solid ' + (ratingColor[r] || '#475569'), color: ratingColor[r] || '#475569' } }, ratingLabel[r] || r) : h('div', { style: { fontSize: 10.5, color: '#94a3b8' } }, 'not rated')
                  ),
                  r ? h('div', { style: { fontSize: 11.5, color: '#475569', lineHeight: 1.55 } }, dim[r] || '') : null
                );
              })
            ),

            d.notes ? h('div', { style: { padding: 10, border: '2px solid #0f172a', borderRadius: 8, marginBottom: 12 } },
              h('div', { style: { fontSize: 10.5, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'My private notes'),
              h('div', { style: { fontSize: 12.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.55 } }, d.notes)
            ) : null,

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12 } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Help, available 24/7'),
              h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.7 } },
                'Loveisrespect (teens): 1-866-331-9474, text LOVEIS to 22522, loveisrespect.org', h('br'),
                'National Domestic Violence Hotline: 1-800-799-7233, text START to 88788', h('br'),
                'RAINN (sexual violence): 1-800-656-4673, online.rainn.org', h('br'),
                'Crisis Text Line: text HOME to 741741', h('br'),
                '988 Suicide & Crisis Lifeline: call or text 988'
              )
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5, textAlign: 'center' } },
              'A relationship check is information for you, not a final verdict. Bring this to a school counselor, school psych, trusted adult, or hotline if any rating leans unhealthy or abusive. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      var body;
      if (view === 'check') body = renderCheck();
      else if (view === 'consent') body = renderConsent();
      else if (view === 'safety') body = renderSafety();
      else if (view === 'about') body = renderAbout();
      else if (view === 'print') body = renderPrintView();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Healthy Relationships' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
