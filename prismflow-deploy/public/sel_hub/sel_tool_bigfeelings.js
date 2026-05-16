// ═══════════════════════════════════════════════════════════════
// sel_tool_bigfeelings.js — Big Feelings (Anger Toolkit)
// Anger-specific psychoeducation and skill-building, built on
// Lochman's Coping Power tradition for adolescents plus the
// general CBT-for-anger evidence base. Frames anger as a SIGNAL
// (often pointing to something real that needs attention) and
// distinguishes it from REACTIVE AGGRESSION (the impulsive action
// people often regret).
//
// Tools:
//   - Anger psychoeducation (what anger is, when it's right)
//   - The hassle log (track what triggers your anger and what you did)
//   - The choice point (the moment between feeling and action)
//   - Trigger inventory (specific people / situations / body states)
//   - Cool-down skills
//   - Healthy expression vs reactive aggression
//
// Registered tool ID: "bigFeelings"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('bigFeelings'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-bigfeelings')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-bigfeelings';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  function defaultState() {
    return {
      view: 'home',
      // Hassle log: array of incidents
      hassleLog: [],         // [{date, trigger, body, didDo, wouldHaveBeen, intensity}]
      // Triggers I know about
      myTriggers: [],
      myBodySigns: [],
      myEarlyWarnings: [],
      // Cool-down toolkit (personalized)
      myCoolDowns: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  var TRIGGER_STARTERS = [
    'Being criticized in front of others',
    'Feeling disrespected',
    'Being interrupted',
    'Unfair treatment (real or perceived)',
    'Sibling pushing my buttons',
    'A specific friend or peer',
    'A specific teacher\'s tone',
    'Being told no',
    'Feeling stupid in class',
    'Sensory overload (loud, crowded, hot)',
    'Being hungry / sleep-deprived',
    'Phone notifications / specific messages',
    'Plans changing without warning',
    'Losing in a game or competition'
  ];
  var BODY_STARTERS = [
    'Tight jaw / clenched teeth',
    'Hot face',
    'Tight chest',
    'Fast breathing',
    'Fists clench',
    'Stomach knots',
    'Vision narrows',
    'Voice gets loud',
    'Heart pounding',
    'Sweating',
    'Standing taller / leaning in',
    'Tunnel focus on the person'
  ];
  var COOLDOWN_STARTERS = [
    'Walk away for 5 minutes (state it: "I need a minute")',
    'Cold water on my face',
    'Count down from 10 slowly',
    'Paced breathing: 4 in, 6-8 out',
    'Push against a wall hard for 30 sec (heavy work)',
    'Step outside, look at the sky',
    'Text a specific person who calms me',
    'Listen to a specific song that grounds me',
    'Do 20 pushups, jumping jacks, or sprints',
    'Squeeze something soft / fidget hard',
    'Name 5 things I can see',
    'Drink a glass of cold water'
  ];

  window.SelHub.registerTool('bigFeelings', {
    icon: '🔥',
    label: 'Big Feelings (Anger)',
    desc: 'Anger-specific psychoeducation and skill-building. Anger is information, not the problem; reactive aggression is. Built on Lochman\'s Coping Power tradition (adolescent CBT for anger) plus the wider CBT-for-anger evidence base. Hassle log, trigger inventory, the choice point, and personalized cool-down skills.',
    color: 'orange',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;

      var d = labToolData.bigFeelings || defaultState();
      function setBF(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.bigFeelings) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { bigFeelings: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setBF({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fdba74', fontSize: 22, fontWeight: 900 } }, '🔥 Big Feelings'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Anger as information. Reactive aggression as the trap.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What anger is', icon: '🔥' },
          { id: 'choice', label: 'The choice point', icon: '🚦' },
          { id: 'hassle', label: 'Hassle log', icon: '📓' },
          { id: 'triggers', label: 'My triggers', icon: '⚡' },
          { id: 'cooldown', label: 'My cool-downs', icon: '❄️' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Big Feelings sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#f97316' : '#334155'),
                background: active ? 'rgba(249,115,22,0.18)' : '#1e293b',
                color: active ? '#fed7aa' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'If your anger is leading to violence (toward yourself, others, or things), please get a counselor or therapist involved. There are effective treatments. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — psychoeducation
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(249,115,22,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fed7aa', marginBottom: 4 } }, 'Anger is not the enemy.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Anger is one of the most useful emotions. It is the signal that something is wrong: a line crossed, an injustice, harm done, a need ignored. Without anger, people would not stand up for themselves, would not protect the people they love, would not fight unfair things. Anger that points at injustice is healthy and necessary.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'The problem is not anger. The problem is REACTIVE AGGRESSION — acting on anger before the prefrontal cortex comes back online. The thing you did in the heat of the moment that you wish you had done differently. The work is not to feel less anger. It is to put space between FEELING anger and ACTING on anger. That space is the choice point.'
            )
          ),

          // Anger vs aggression
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f97316', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fdba74', marginBottom: 10 } }, '🔍 Anger vs. aggression vs. assertion'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Anger '), 'is a FEELING. You cannot directly choose to feel it or not feel it. It just shows up when the body senses a threat or violation.'),
              h('li', null, h('strong', { style: { color: '#fca5a5' } }, 'Aggression '), 'is the ACTION of hurting someone (or something) with your behavior — yelling, hitting, name-calling, destroying property, intimidating. This is the part you can change.'),
              h('li', null, h('strong', { style: { color: '#bbf7d0' } }, 'Assertion '), 'is the SKILL of expressing anger and what you need in a way that does not hurt. Clear words, firm voice, no attacks. The DEAR MAN tool in this SEL Hub builds this skill.')
            ),
            h('p', { style: { margin: '10px 0 0', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              'The goal: feel anger, USE its information, choose assertion (or another skill) instead of aggression.'
            )
          ),

          // What happens in the body
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🧠 Why "just calm down" never works'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'When you\'re angry, your amygdala is firing alarms, adrenaline is flooding your body, your heart rate is up, your prefrontal cortex (the part that does considered thinking) is offline. Telling yourself "just calm down" or "think clearly" does not work because the thinking brain is literally unavailable. What works: get the body to come back FIRST (cool-down skills), then the brain comes back, then you can choose. Body first, brain second. This is why all the techniques in this tool involve the body.'
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Skills in this kit'),
          stepCard('🚦 The choice point', 'The single most important concept: the moment between feeling anger and acting on it. You can learn to widen this window from milliseconds to minutes.', function() { goto('choice'); }, '#22c55e'),
          stepCard('📓 Hassle log', 'Track angry incidents over time: trigger, body signs, what you did, what would have been better. Patterns get visible quickly.', function() { goto('hassle'); }, '#0ea5e9'),
          stepCard('⚡ My triggers', 'Build your personal trigger inventory: specific people, situations, body states, thoughts. Knowing yours is half the battle.', function() { goto('triggers'); }, '#f59e0b'),
          stepCard('❄️ My cool-downs', 'Build your personal toolkit of cool-down moves. The body-first techniques that actually work for YOU.', function() { goto('cooldown'); }, '#0ea5e9'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHOICE POINT
      // ═══════════════════════════════════════════════════════════
      function renderChoice() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '🚦 The choice point '),
            'is the gap between TRIGGER and ACTION. When you\'re young, the gap is often milliseconds — something happens and you\'re already mid-react. The whole work of anger management is widening this gap: making the moment between feeling and acting LONGER, so you can choose what to do instead of just doing it.'
          ),

          // The diagram
          h('div', { style: { padding: 18, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid #22c55e', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 14, textAlign: 'center' } }, 'The classic flow'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('div', { style: { padding: 12, borderRadius: 8, background: '#1e293b', borderLeft: '4px solid #ef4444', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 1'),
                h('div', { style: { fontSize: 14, color: '#fecaca', fontWeight: 800 } }, '⚡ Trigger'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Something happens or is said')
              ),
              h('div', { style: { textAlign: 'center', color: '#475569', fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 12, borderRadius: 8, background: '#1e293b', borderLeft: '4px solid #f59e0b', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 2'),
                h('div', { style: { fontSize: 14, color: '#fde68a', fontWeight: 800 } }, '🔥 Body responds (anger builds)'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Heart up, jaw tight, vision narrows')
              ),
              h('div', { style: { textAlign: 'center', color: '#475569', fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 14, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '2px solid #22c55e', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '★ Step 3: THE CHOICE POINT'),
                h('div', { style: { fontSize: 15, color: '#86efac', fontWeight: 900 } }, '🚦 You pause'),
                h('div', { style: { fontSize: 12, color: '#bbf7d0', marginTop: 2, lineHeight: 1.5 } }, 'Even a half-second is something.\nUse a cool-down skill.\nThe goal: widen this gap.')
              ),
              h('div', { style: { textAlign: 'center', color: '#475569', fontSize: 20 } }, '↓'),
              h('div', { style: { padding: 12, borderRadius: 8, background: '#1e293b', borderLeft: '4px solid #0ea5e9', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Step 4'),
                h('div', { style: { fontSize: 14, color: '#bae6fd', fontWeight: 800 } }, '✓ You choose (instead of react)'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Walk away · breathe · use DEAR MAN · address it later when calm')
              )
            )
          ),

          // What widens the gap
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '🔧 What widens the choice point window'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Knowing your body signs early. '), 'If you can catch the jaw clench or the hot face EARLY, you have more time than if you only notice the rage after you\'ve already started yelling.'),
              h('li', null, h('strong', null, 'Practicing cool-downs when calm. '), 'You cannot learn a new skill mid-rage. Practice paced breathing or "walk away" when you are not angry; then the move is available when you need it.'),
              h('li', null, h('strong', null, 'Knowing your triggers. '), 'When you can SEE the trigger coming, you have more time to prepare than if it ambushes you. The trigger inventory builds this.'),
              h('li', null, h('strong', null, 'Sleep, food, regulation. '), 'A tired, hungry, dysregulated body has NO choice-point window. Take care of the foundation.'),
              h('li', null, h('strong', null, 'A trusted person to text. '), 'Just texting someone "I\'m really mad right now" can create a 30-second pause and shift things.')
            )
          ),

          // When anger IS the right response
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
            h('strong', null, '⚖️ When anger IS the right response: '),
            'sometimes the problem is not your reaction; it\'s the situation. Anger at being abused, anger at injustice, anger at being treated as less than human — these are healthy responses to harmful environments. The work in these cases is not to stop being angry; it\'s to channel the anger into action that protects you and changes the situation. The Self-Advocacy and Civic Action tools in this SEL Hub are built for this.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HASSLE LOG
      // ═══════════════════════════════════════════════════════════
      function renderHassle() {
        function addEntry() {
          var trigger = document.getElementById('bf-trigger').value;
          var body = document.getElementById('bf-body').value;
          var didDo = document.getElementById('bf-did').value;
          var betterDo = document.getElementById('bf-better').value;
          var intensity = parseInt(document.getElementById('bf-intensity').value, 10);
          if (!trigger || !trigger.trim()) return;
          var entry = { date: todayISO(), trigger: trigger.trim(), body: body, didDo: didDo, wouldHaveBeen: betterDo, intensity: intensity };
          setBF({ hassleLog: (d.hassleLog || []).concat([entry]) });
          ['bf-trigger', 'bf-body', 'bf-did', 'bf-better'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
          if (addToast) addToast('Logged.', 'success');
        }
        function removeEntry(i) {
          var nx = (d.hassleLog || []).slice();
          nx.splice(i, 1);
          setBF({ hassleLog: nx });
        }

        var log = (d.hassleLog || []).slice().reverse();

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.7 } },
            h('strong', null, '📓 The hassle log '),
            'is a core CBT-for-anger tool (Lochman, Beck). After each angry incident, log what happened: trigger, body, what you did, what would have been better. The pattern emerges within 5-10 entries. You discover you don\'t actually have "an anger problem" — you have 2 specific people and 3 specific situations that set you off, and once you know that, you can prepare.'
          ),

          // Form
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bae6fd', marginBottom: 10 } }, '+ Log an incident'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 8 } },
              h('div', null,
                h('label', { htmlFor: 'bf-trigger', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Trigger (what happened)'),
                h('input', { id: 'bf-trigger', type: 'text', placeholder: 'Be specific',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'bf-intensity', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Intensity 0-10'),
                h('input', { id: 'bf-intensity', type: 'number', min: 0, max: 10, defaultValue: 6,
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              )
            ),
            h('label', { htmlFor: 'bf-body', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'What did my body do?'),
            h('input', { id: 'bf-body', type: 'text', placeholder: 'Heart racing, jaw tight, etc.',
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, marginBottom: 8 } }),
            h('label', { htmlFor: 'bf-did', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'What did I actually do?'),
            h('textarea', { id: 'bf-did', placeholder: 'Honest. No judgment.',
              style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginBottom: 8 } }),
            h('label', { htmlFor: 'bf-better', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'What would have worked better?'),
            h('textarea', { id: 'bf-better', placeholder: 'In hindsight. Specific.',
              style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginBottom: 10 } }),
            h('button', { onClick: addEntry, 'aria-label': 'Log this incident',
              style: { padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13 } }, '+ Log incident')
          ),

          // Log
          log.length > 0 ? h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, log.length + ' entries'),
            log.map(function(e, i) {
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' } }, e.date),
                  e.intensity !== undefined && !isNaN(e.intensity) ? h('span', { style: { fontSize: 11, color: e.intensity >= 7 ? '#fca5a5' : e.intensity >= 4 ? '#fde68a' : '#bbf7d0', fontWeight: 700 } }, 'Intensity: ' + e.intensity + '/10') : null,
                  h('button', { onClick: function() { removeEntry(log.length - 1 - i); }, 'aria-label': 'Remove',
                    style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                ),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 4 } }, h('strong', { style: { color: '#bae6fd' } }, 'Trigger: '), e.trigger),
                e.body ? h('div', { style: { fontSize: 12.5, color: '#cbd5e1', marginBottom: 4 } }, h('strong', { style: { color: '#fde68a' } }, 'Body: '), e.body) : null,
                e.didDo ? h('div', { style: { fontSize: 12.5, color: '#cbd5e1', marginBottom: 4 } }, h('strong', { style: { color: '#fca5a5' } }, 'What I did: '), e.didDo) : null,
                e.wouldHaveBeen ? h('div', { style: { fontSize: 12.5, color: '#cbd5e1' } }, h('strong', { style: { color: '#bbf7d0' } }, 'Better: '), e.wouldHaveBeen) : null
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TRIGGERS
      // ═══════════════════════════════════════════════════════════
      function renderTriggers() {
        function listEditor(key, title, color, starters, blurb) {
          var items = d[key] || [];
          function addItem(value) {
            if (!value || !value.trim()) return;
            var list = items.slice();
            if (list.indexOf(value.trim()) === -1) list.push(value.trim());
            var patch = {}; patch[key] = list;
            setBF(patch);
          }
          function removeItem(i) {
            var list = items.slice();
            list.splice(i, 1);
            var patch = {}; patch[key] = list;
            setBF(patch);
          }
          var inputId = 'bf-trig-' + key;
          function submit() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) return;
            addItem(el.value);
            el.value = '';
          }

          return h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: color, fontWeight: 800, marginBottom: 6 } }, title),
            h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),
            items.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              items.map(function(s, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: '#1e293b', border: '1px solid ' + color + '44', fontSize: 12, color: '#e2e8f0' } },
                  h('span', null, s),
                  h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
              h('input', { id: inputId, type: 'text', placeholder: 'Type and Enter to add...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8' } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '⚡ Knowing YOUR triggers is half the work. '),
            'The more specific, the more useful. "School" is not a trigger. "When Mr. X corrects me in front of the class" is. Build the list slowly over time.'
          ),

          listEditor('myTriggers', '⚡ My triggers', '#f59e0b', TRIGGER_STARTERS,
            'What sets you off? Specific people, situations, words, contexts.'),
          listEditor('myBodySigns', '🔥 My body signs (early warning)', '#ef4444', BODY_STARTERS,
            'How does anger show up in YOUR body? The earlier you catch these, the more time you have.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // COOL-DOWNS
      // ═══════════════════════════════════════════════════════════
      function renderCooldown() {
        var items = d.myCoolDowns || [];
        function addItem(value) {
          if (!value || !value.trim()) return;
          var list = items.slice();
          if (list.indexOf(value.trim()) === -1) list.push(value.trim());
          setBF({ myCoolDowns: list });
        }
        function removeItem(i) {
          var list = items.slice();
          list.splice(i, 1);
          setBF({ myCoolDowns: list });
        }
        function submit() {
          var el = document.getElementById('bf-cd-input');
          if (!el || !el.value.trim()) return;
          addItem(el.value);
          el.value = '';
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.7 } },
            h('strong', null, '❄️ Cool-down skills are body-first. '),
            'They work on the physiology, which has to come back down before the thinking brain comes back online. Build YOUR list — what actually works for YOU. Practice them WHEN CALM so they\'re available when you need them.'
          ),

          // My list
          items.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#bae6fd', fontWeight: 800, marginBottom: 8 } }, 'My cool-downs (' + items.length + ')'),
            items.map(function(s, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, '❄️ ' + s),
                h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#bae6fd', fontWeight: 800, marginBottom: 8 } }, '+ Add a cool-down'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'bf-cd-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add cool-down'),
              h('input', { id: 'bf-cd-input', type: 'text', placeholder: 'A specific move you know works for you',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Starters
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10 } }, 'Common cool-down moves (tap to add)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              COOLDOWN_STARTERS.map(function(s, i) {
                var already = items.indexOf(s) !== -1;
                return h('button', { key: i, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add: ' + s,
                  style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #0ea5e966', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                  (already ? '✓ ' : '+ ') + s);
              })
            )
          ),

          // Cross-link
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginTop: 14, fontSize: 12.5, color: '#fecaca', lineHeight: 1.6 } },
            h('strong', null, '🆘 For acute high-intensity anger: '),
            'see the TIPP tool in this SEL Hub. Cold water, intense exercise, paced breathing, paired muscle relaxation. These are the same skills used in pediatric crisis psych.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('bigFeelings', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fdba74', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Anger-specific psychoeducation and skill-building, designed for adolescents. The core frame: anger is information, NOT a problem. The problem is reactive aggression — the impulsive action people often regret. The work is widening the gap between feeling and acting.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The tool is reflective and skill-based, not behavioral control. It does NOT pathologize anger; it treats the user as a person trying to choose better, not as a "behavior problem." The hassle log, trigger inventory, and choice-point framing all come from the CBT-for-anger evidence base. The Lochman Coping Power program for adolescents is the closest research-based parallel.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fdba74', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Lochman, J. E., Wells, K. C., and Lenhart, L. A. (2008)', 'Coping Power: Child Group Program, Oxford University Press', 'The leading evidence-based adolescent anger and aggression program. Strongly researched.', null),
            sourceCard('Beck, A. T. (1999)', 'Prisoners of Hate: The Cognitive Basis of Anger, Hostility, and Violence, Harper Perennial', 'Beck\'s book on CBT for anger and hostility.', null),
            sourceCard('Novaco, R. W. (1975)', 'Anger Control: The Development and Evaluation of an Experimental Treatment, Lexington Books', 'Foundational text in CBT-for-anger.', null),
            sourceCard('Deffenbacher, J. L. (2011)', '"Cognitive-Behavioral Conceptualization and Treatment of Anger," Cognitive and Behavioral Practice, 18(2), 212-221', 'Modern review of CBT approaches.', null),
            sourceCard('AACAP', 'aacap.org / Disruptive Behavior Disorders Resource Center', 'When persistent aggression warrants clinical attention.', 'https://www.aacap.org/AACAP/Families_and_Youth/Resource_Centers/Disruptive_Behavior/Home.aspx')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'This tool helps with everyday anger and regulation skill-building. For persistent aggression that leads to violence (toward yourself, others, or things), clinical care is the right path.'),
              h('li', null, 'For adolescents whose anger is appropriate to genuinely abusive environments: the work is partly the situation, not the anger. Reactive aggression in response to abuse is still risky for YOU (school discipline, escalation), so the choice-point skills are still useful. But the framing of "your anger is a problem" is wrong when the situation is the actual problem.'),
              h('li', null, 'Some communities and cultures have specific anger-display norms (masculinity expectations, cultural patterns of expression). This tool aims to be respectful without endorsing aggression; it is not asking anyone to suppress legitimate anger.'),
              h('li', null, 'Persistent anger + sadness + sleep disruption can be depression in young people, especially boys, where anger is often the primary visible symptom. If anger is the loudest feeling for weeks: a clinician should be involved.'),
              h('li', null, 'Anger that follows a traumatic event is often layered with trauma; trauma-informed treatment may be more useful than pure CBT-for-anger.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(249,115,22,0.10)', borderTop: '1px solid rgba(249,115,22,0.3)', borderRight: '1px solid rgba(249,115,22,0.3)', borderBottom: '1px solid rgba(249,115,22,0.3)', borderLeft: '3px solid #f97316', fontSize: 12.5, color: '#fed7aa', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'A hassle-log assignment for 2 weeks (logging EVERY angry incident, even small ones) is one of the highest-yield self-regulation interventions in school psych practice. Pair with cool-down skill teaching during calm times. For students with persistent disruptive behavior, the Lochman Coping Power program (10-30 sessions, group-based) is the gold-standard intervention; many districts can train counselors in it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fdba74', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fed7aa', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fed7aa', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — hassle log + patterns, clinician-friendly
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var log = (d.hassleLog || []).slice().reverse();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(249,115,22,0.10)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fed7aa', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Hassle log + patterns inventory — useful for a counselor, therapist, or IEP/behavior plan conversation.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'bf-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#bf-print-region, #bf-print-region * { visibility: visible !important; } ' +
              '#bf-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #ea580c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Big Feelings · Hassle Log + Patterns'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My anger pattern log'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Patterns: triggers, body signs, cool-downs
            (d.myTriggers || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '⚡ My triggers'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.8 } },
                d.myTriggers.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myBodySigns || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#ef4444', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🔥 My body signs (early warning)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.8 } },
                d.myBodySigns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myCoolDowns || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '❄️ My cool-downs that work'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.8 } },
                d.myCoolDowns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            // Hassle log
            log.length > 0 ? h('div', { style: { marginBottom: 14 } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📓 Hassle log (' + log.length + ' entries)'),
              log.map(function(e, i) {
                return h('div', { key: i, style: { marginBottom: 10, pageBreakInside: 'avoid', padding: '8px 0', borderTop: '1px solid #e2e8f0' } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 } },
                    h('strong', { style: { fontSize: 11, color: '#475569', fontFamily: 'ui-monospace, monospace' } }, e.date),
                    e.intensity !== undefined && !isNaN(e.intensity) ? h('span', { style: { fontSize: 11, color: '#475569' } }, '· Intensity: ' + e.intensity + '/10') : null
                  ),
                  h('div', { style: { fontSize: 12.5, color: '#0f172a', marginBottom: 2 } }, h('strong', null, 'Trigger: '), e.trigger),
                  e.body ? h('div', { style: { fontSize: 12, color: '#0f172a', marginBottom: 2 } }, h('strong', null, 'Body: '), e.body) : null,
                  e.didDo ? h('div', { style: { fontSize: 12, color: '#0f172a', marginBottom: 2 } }, h('strong', null, 'What I did: '), e.didDo) : null,
                  e.wouldHaveBeen ? h('div', { style: { fontSize: 12, color: '#0f172a' } }, h('strong', null, 'Better: '), e.wouldHaveBeen) : null
                );
              })
            ) : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No hassle log entries yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Hassle log from Lochman Coping Power (Lochman, Wells, & Lenhart). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'choice') body = renderChoice();
      else if (view === 'hassle') body = renderHassle();
      else if (view === 'triggers') body = renderTriggers();
      else if (view === 'cooldown') body = renderCooldown();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Big Feelings' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
