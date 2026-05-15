// ═══════════════════════════════════════════════════════════════
// sel_tool_valuescommittedaction.js — Values & Committed Action
// An ACT (Acceptance and Commitment Therapy) tool. Three steps:
//   1. Sort values cards (broad life directions, not goals)
//   2. Pick top 5-10 that feel most central
//   3. Define committed actions: small concrete things that move
//      you in the direction of those values
//
// Uses Hayes/Strosahl/Wilson ACT framework, with DNA-V adolescent
// framing (Discoverer, Noticer, Advisor, Values) from Hayes,
// Ciarrochi, and Bailey where useful.
//
// Registered tool ID: "valuesCommittedAction"
// Category: self-direction
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('valuesCommittedAction'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-valuescommitted')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-valuescommitted';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The values deck: ~50 broad life directions grouped by domain.
  // ACT values are VERBS/ADVERBS describing how you want to be, not
  // achievements. We use noun phrases for readability but each
  // implies a way of being.
  var VALUE_CARDS = [
    // Connection
    { id: 'family',     domain: 'Connection', label: 'Family closeness',     blurb: 'Being present and connected to the people I live with.' },
    { id: 'friendship', domain: 'Connection', label: 'Deep friendship',      blurb: 'Real bonds where I am known and I know them back.' },
    { id: 'romance',    domain: 'Connection', label: 'Romantic partnership', blurb: 'Loving and being loved as a partner.' },
    { id: 'community',  domain: 'Connection', label: 'Belonging in community', blurb: 'Being part of a group bigger than me.' },
    { id: 'mentorship', domain: 'Connection', label: 'Mentoring or being mentored', blurb: 'Teaching others, learning from someone wiser.' },
    { id: 'animals',    domain: 'Connection', label: 'Connection with animals', blurb: 'My relationship with pets, wildlife, the non-human world.' },

    // Growth & Learning
    { id: 'learning',   domain: 'Growth', label: 'Lifelong learning',     blurb: 'Always being curious; reading, asking, exploring.' },
    { id: 'mastery',    domain: 'Growth', label: 'Mastery of a craft',    blurb: 'Getting really good at something I care about.' },
    { id: 'challenge',  domain: 'Growth', label: 'Embracing challenge',   blurb: 'Doing hard things on purpose.' },
    { id: 'creativity', domain: 'Growth', label: 'Creativity',            blurb: 'Making things; expressing through art, writing, music, code.' },
    { id: 'discovery',  domain: 'Growth', label: 'Discovery and adventure', blurb: 'Going where I have not been; trying new things.' },
    { id: 'wisdom',     domain: 'Growth', label: 'Wisdom',                blurb: 'Building understanding that lasts.' },

    // Health & Body
    { id: 'fitness',    domain: 'Health', label: 'Physical fitness',     blurb: 'A body that can do what I ask of it.' },
    { id: 'rest',       domain: 'Health', label: 'Rest and recovery',    blurb: 'Real sleep; downtime; refilling the well.' },
    { id: 'nourish',    domain: 'Health', label: 'Nourishment',          blurb: 'Eating in a way that takes care of me.' },
    { id: 'nature',     domain: 'Health', label: 'Time in nature',       blurb: 'Outside; the air, water, trees, sky.' },

    // Service & Contribution
    { id: 'helping',    domain: 'Service', label: 'Helping people',      blurb: 'Being useful to others.' },
    { id: 'justice',    domain: 'Service', label: 'Working for justice', blurb: 'Standing against unfair things.' },
    { id: 'care',       domain: 'Service', label: 'Caretaking',          blurb: 'Looking after people who need it.' },
    { id: 'teaching',   domain: 'Service', label: 'Teaching others',     blurb: 'Sharing what I know.' },
    { id: 'protect',    domain: 'Service', label: 'Protecting',          blurb: 'Keeping safe the people, places, and things I love.' },
    { id: 'planet',     domain: 'Service', label: 'Caring for the planet', blurb: 'Stewardship of the earth and its creatures.' },

    // Character & Self
    { id: 'honesty',    domain: 'Character', label: 'Honesty',           blurb: 'Telling the truth, including when it is hard.' },
    { id: 'courage',    domain: 'Character', label: 'Courage',           blurb: 'Acting despite fear when it matters.' },
    { id: 'kindness',   domain: 'Character', label: 'Kindness',          blurb: 'Treating people with care, including strangers.' },
    { id: 'humility',   domain: 'Character', label: 'Humility',          blurb: 'Not needing to be the smartest one in the room.' },
    { id: 'integrity',  domain: 'Character', label: 'Integrity',         blurb: 'Doing what I said I would do.' },
    { id: 'persistence',domain: 'Character', label: 'Persistence',       blurb: 'Sticking with things; finishing what I start.' },
    { id: 'flexibility',domain: 'Character', label: 'Flexibility',       blurb: 'Adjusting when the plan changes.' },
    { id: 'forgive',    domain: 'Character', label: 'Forgiveness',       blurb: 'Letting go of grudges; allowing repair.' },

    // Expression & Spirit
    { id: 'humor',      domain: 'Expression', label: 'Humor',           blurb: 'Bringing laughter; not taking myself too seriously.' },
    { id: 'beauty',     domain: 'Expression', label: 'Beauty',          blurb: 'Noticing what is beautiful; making things beautiful.' },
    { id: 'play',       domain: 'Expression', label: 'Play',            blurb: 'Time that is for joy, not productivity.' },
    { id: 'spirit',     domain: 'Expression', label: 'Spirituality / faith', blurb: 'My relationship with something bigger than me.' },
    { id: 'culture',    domain: 'Expression', label: 'My culture / heritage', blurb: 'Living in connection to where my people come from.' },
    { id: 'meaning',    domain: 'Expression', label: 'Meaning',          blurb: 'A sense that what I do matters.' },

    // Independence & Voice
    { id: 'autonomy',   domain: 'Independence', label: 'Autonomy',       blurb: 'Making my own choices about my own life.' },
    { id: 'voice',      domain: 'Independence', label: 'Speaking up',    blurb: 'Saying what I think, including when others disagree.' },
    { id: 'security',   domain: 'Independence', label: 'Security',       blurb: 'Stability; knowing what comes next.' },
    { id: 'freedom',    domain: 'Independence', label: 'Freedom',        blurb: 'Time and space that are mine to use.' },

    // Future
    { id: 'leadership', domain: 'Future', label: 'Leadership',           blurb: 'Bringing others toward something good.' },
    { id: 'innovation', domain: 'Future', label: 'Innovation',           blurb: 'Building things that did not exist before.' },
    { id: 'legacy',     domain: 'Future', label: 'Leaving a legacy',     blurb: 'Doing something that lasts after me.' },
    { id: 'craft_work', domain: 'Future', label: 'Meaningful work',      blurb: 'A job or vocation that matters to me.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      ratings: {},          // valueId -> 'core' | 'meaningful' | 'not_me'
      topValues: [],        // chosen top values (in order)
      actions: {},          // valueId -> [{text, done}]
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('valuesCommittedAction', {
    icon: '🧭',
    label: 'Values & Action',
    desc: 'Sort what actually matters to you, name your top values, and turn each into a small concrete action you will do this week. From Acceptance and Commitment Therapy (ACT), with DNA-V adolescent framing. The ACT distinction between values (directions) and goals (destinations) is what makes this useful.',
    color: 'indigo',
    category: 'self-direction',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.valuesCommittedAction || defaultState();
      function setVCA(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.valuesCommittedAction) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.ratings || patch.topValues || patch.actions) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { valuesCommittedAction: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setVCA({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '🧭 Values & Action'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Name what matters, then move toward it on purpose.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🧭' },
          { id: 'sort', label: 'Sort values', icon: '🃏' },
          { id: 'top', label: 'My top values', icon: '⭐' },
          { id: 'actions', label: 'Committed actions', icon: '✓' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Values and Action sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#818cf8' : '#334155'),
                background: active ? 'rgba(129,140,248,0.18)' : '#1e293b',
                color: active ? '#e0e7ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Values work is about direction, not destination. There is no failure in this tool, only direction. Crisis Text Line: text HOME to 741741 if you need support.'
        );
      }

      function rated(id) { return (d.ratings || {})[id]; }
      function coreCount() { return Object.keys(d.ratings || {}).filter(function(k) { return d.ratings[k] === 'core'; }).length; }
      function actionCount() {
        var total = 0;
        Object.keys(d.actions || {}).forEach(function(k) { total += (d.actions[k] || []).length; });
        return total;
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — overview + 3-step roadmap
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        var rc = Object.keys(d.ratings || {}).length;
        var topCount = (d.topValues || []).length;
        var acts = actionCount();

        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e0e7ff', marginBottom: 4 } }, 'Values direct your action.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'A value is not a goal. A goal is a destination you can reach and check off. A value is a direction you keep moving in. "Be a kind person" is a value. "Apologize to my sister tomorrow" is a goal that points in the direction of that value.'
            )
          ),

          // Three-step roadmap
          stepCard(1, 'Sort the values', 'Look at ~45 values. Mark each one core to you, meaningful, or not really me.', rc + ' / ' + VALUE_CARDS.length + ' sorted', function() { goto('sort'); }, '#0ea5e9'),
          stepCard(2, 'Pick your top values', 'From your core values, choose 3-5 that feel most central right now.', topCount + ' chosen', function() { goto('top'); }, '#a855f7'),
          stepCard(3, 'Commit to small actions', 'For each top value, list 1-3 concrete things you will do this week.', acts + ' action' + (acts === 1 ? '' : 's'), function() { goto('actions'); }, '#22c55e'),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6, marginTop: 12 } },
            h('strong', null, '🧠 The ACT shift: '),
            'When you cannot reach a goal (it gets blocked, life changes, you fail), you can still LIVE the value. If "kindness" is a value, you can do kindness today regardless of whether anyone notices. Values keep working when goals stop.'
          ),

          softPointer()
        );
      }

      function stepCard(stepNum, title, blurb, status, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': 'Go to step ' + stepNum + ': ' + title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 10, color: '#e2e8f0' } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
            h('span', { style: { fontSize: 18, fontWeight: 900, color: color } }, 'Step ' + stepNum),
            h('span', { style: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', flex: 1 } }, title),
            h('span', { style: { fontSize: 11, color: color, fontWeight: 700 } }, status)
          ),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SORT — rate each value as core / meaningful / not me
      // ═══════════════════════════════════════════════════════════
      function renderSort() {
        function setRating(id, v) {
          var r = Object.assign({}, (d.ratings || {}));
          if (r[id] === v) delete r[id]; else r[id] = v;
          setVCA({ ratings: r });
        }

        var domains = {};
        VALUE_CARDS.forEach(function(c) {
          domains[c.domain] = domains[c.domain] || [];
          domains[c.domain].push(c);
        });

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', marginBottom: 14, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.65 } },
            h('strong', null, '🃏 Sort each value. '),
            'For each card, pick: ',
            h('span', { style: { color: '#22c55e', fontWeight: 700 } }, 'CORE'), ' (essential to me), ',
            h('span', { style: { color: '#f59e0b', fontWeight: 700 } }, 'MEANINGFUL'), ' (matters but not central), or ',
            h('span', { style: { color: '#94a3b8', fontWeight: 700 } }, 'NOT ME'), ' (not really my thing). You can change later.'
          ),

          Object.keys(domains).map(function(domain) {
            return h('div', { key: domain, style: { marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, domain),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 } },
                domains[domain].map(function(c) {
                  var r = rated(c.id);
                  return h('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid ' + (r === 'core' ? '#22c55e' : r === 'meaningful' ? '#f59e0b' : '#1e293b') } },
                    h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, c.label),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 } }, c.blurb),
                    h('div', { style: { display: 'flex', gap: 4 } },
                      h('button', { onClick: function() { setRating(c.id, 'core'); }, 'aria-label': 'Mark core', 'aria-pressed': r === 'core',
                        style: { flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (r === 'core' ? '#22c55e' : '#475569'), background: r === 'core' ? '#22c55e' : 'transparent', color: r === 'core' ? '#fff' : '#22c55e', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'CORE'),
                      h('button', { onClick: function() { setRating(c.id, 'meaningful'); }, 'aria-label': 'Mark meaningful', 'aria-pressed': r === 'meaningful',
                        style: { flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (r === 'meaningful' ? '#f59e0b' : '#475569'), background: r === 'meaningful' ? '#f59e0b' : 'transparent', color: r === 'meaningful' ? '#fff' : '#f59e0b', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'MEANINGFUL'),
                      h('button', { onClick: function() { setRating(c.id, 'not_me'); }, 'aria-label': 'Mark not me', 'aria-pressed': r === 'not_me',
                        style: { flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (r === 'not_me' ? '#94a3b8' : '#475569'), background: r === 'not_me' ? '#475569' : 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'NOT ME')
                    )
                  );
                })
              )
            );
          }),

          h('button', { onClick: function() { goto('top'); }, 'aria-label': 'Continue to top values',
            style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14, marginTop: 8 } },
            '→ Continue to top values'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TOP — pick top 3-5 from core
      // ═══════════════════════════════════════════════════════════
      function renderTop() {
        var coreList = VALUE_CARDS.filter(function(c) { return rated(c.id) === 'core'; });

        function toggleTop(id) {
          var top = (d.topValues || []).slice();
          var idx = top.indexOf(id);
          if (idx >= 0) {
            top.splice(idx, 1);
          } else if (top.length < 7) {
            top.push(id);
          } else {
            if (addToast) addToast('Cap at 7 top values. Remove one to add another.', 'info');
            return;
          }
          setVCA({ topValues: top });
        }

        if (coreList.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '🃏'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Sort the values first'),
              h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Mark some values as CORE before picking your top ones.'),
              h('button', { onClick: function() { goto('sort'); }, 'aria-label': 'Go sort',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Sort values')
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', marginBottom: 14, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.65 } },
            h('strong', null, '⭐ Pick 3-5 that feel most central right now. '),
            'You can star up to 7. These are the values that, if your week ended and you looked back, you would most want to have lived in the direction of.'
          ),

          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Your core values (' + coreList.length + ')'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
            coreList.map(function(c) {
              var isTop = (d.topValues || []).indexOf(c.id) !== -1;
              return h('button', { key: c.id, onClick: function() { toggleTop(c.id); }, 'aria-label': isTop ? 'Remove from top' : 'Add to top', 'aria-pressed': isTop,
                style: { textAlign: 'left', padding: 10, borderRadius: 8, border: '2px solid ' + (isTop ? '#a855f7' : '#334155'), background: isTop ? 'rgba(168,85,247,0.18)' : '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { fontSize: 18 } }, isTop ? '⭐' : '☆'),
                  h('span', { style: { fontSize: 13, fontWeight: 700, flex: 1 } }, c.label),
                  h('span', { style: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, c.domain)
                ),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginTop: 4 } }, c.blurb)
              );
            })
          ),

          (d.topValues || []).length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginTop: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e9d5ff', marginBottom: 6 } }, '⭐ Your top values'),
            h('div', { style: { fontSize: 14, color: '#fff', lineHeight: 1.7 } },
              (d.topValues || []).map(function(id) {
                var c = VALUE_CARDS.find(function(x) { return x.id === id; });
                return c ? c.label : null;
              }).filter(Boolean).join('  ·  ')
            ),
            h('button', { onClick: function() { goto('actions'); }, 'aria-label': 'Continue to actions',
              style: { marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#a855f7', color: '#fff', fontWeight: 800, fontSize: 13 } }, '→ Define committed actions')
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ACTIONS — committed action per top value
      // ═══════════════════════════════════════════════════════════
      function renderActions() {
        var top = d.topValues || [];
        if (top.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '⭐'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Pick your top values first'),
              h('button', { onClick: function() { goto('top'); }, 'aria-label': 'Pick top',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #a855f7', background: 'rgba(168,85,247,0.18)', color: '#e9d5ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Pick top values')
            )
          );
        }

        function addAction(valueId) {
          var input = document.getElementById('vca-action-' + valueId);
          if (!input || !input.value.trim()) return;
          var actions = Object.assign({}, (d.actions || {}));
          actions[valueId] = (actions[valueId] || []).concat([{ text: input.value.trim(), done: false }]);
          setVCA({ actions: actions });
          input.value = '';
        }
        function removeAction(valueId, idx) {
          var actions = Object.assign({}, (d.actions || {}));
          actions[valueId] = (actions[valueId] || []).slice();
          actions[valueId].splice(idx, 1);
          setVCA({ actions: actions });
        }
        function toggleDone(valueId, idx) {
          var actions = Object.assign({}, (d.actions || {}));
          actions[valueId] = (actions[valueId] || []).slice();
          actions[valueId][idx] = Object.assign({}, actions[valueId][idx], { done: !actions[valueId][idx].done });
          setVCA({ actions: actions });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 12.5, color: '#bbf7d0', lineHeight: 1.65 } },
            h('strong', null, '✓ Committed action means small and concrete. '),
            'For each top value, name 1-3 things you will DO this week that move in the direction of that value. "Be more kind" is too vague. "Text my sister and ask how her week is" is a committed action.'
          ),

          top.map(function(id) {
            var c = VALUE_CARDS.find(function(x) { return x.id === id; });
            if (!c) return null;
            var actions = (d.actions || {})[id] || [];
            return h('div', { key: id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 20 } }, '⭐'),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e9d5ff' } }, c.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, c.blurb)
                )
              ),

              actions.length > 0 ? h('div', { style: { marginBottom: 10 } },
                actions.map(function(a, i) {
                  return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 6, borderRadius: 4, background: a.done ? 'rgba(34,197,94,0.10)' : '#1e293b', marginBottom: 4 } },
                    h('button', { onClick: function() { toggleDone(id, i); }, 'aria-label': a.done ? 'Mark not done' : 'Mark done', 'aria-pressed': a.done,
                      style: { padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (a.done ? '#22c55e' : '#475569'), background: a.done ? '#22c55e' : 'transparent', color: a.done ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 700, minWidth: 28 } }, a.done ? '✓' : '○'),
                    h('span', { style: { flex: 1, fontSize: 13, color: a.done ? '#94a3b8' : '#e2e8f0', textDecoration: a.done ? 'line-through' : 'none' } }, a.text),
                    h('button', { onClick: function() { removeAction(id, i); }, 'aria-label': 'Remove action',
                      style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10 } }, '✕')
                  );
                })
              ) : null,

              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('label', { htmlFor: 'vca-action-' + id, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add an action for ' + c.label),
                h('input', { id: 'vca-action-' + id, type: 'text', placeholder: 'A concrete thing you will do this week...',
                  onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addAction(id); } },
                  style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
                h('button', { onClick: function() { addAction(id); }, 'aria-label': 'Add action',
                  style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
              )
            );
          }),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print my values and actions',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var top = d.topValues || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(129,140,248,0.10)', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'vca-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#vca-print-region, #vca-print-region * { visibility: visible !important; } ' +
              '#vca-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Values and Committed Action'),
              h('h1', { style: { margin: 0, fontSize: 26, fontWeight: 900 } }, 'My Values'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            top.length > 0
              ? top.map(function(id) {
                  var c = VALUE_CARDS.find(function(x) { return x.id === id; });
                  if (!c) return null;
                  var actions = (d.actions || {})[id] || [];
                  return h('div', { key: id, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 6, background: '#4f46e5', color: '#fff' } },
                      h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '⭐ ' + c.label),
                      h('span', { style: { fontSize: 10, marginLeft: 'auto', opacity: 0.85 } }, c.domain)
                    ),
                    h('div', { style: { padding: '4px 8px', fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 6 } }, c.blurb),
                    actions.length > 0
                      ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.7 } },
                          actions.map(function(a, i) {
                            return h('li', { key: i, style: { marginBottom: 3, textDecoration: a.done ? 'line-through' : 'none', color: a.done ? '#94a3b8' : '#0f172a' } }, (a.done ? '✓ ' : '☐ ') + a.text);
                          }))
                      : h('div', { style: { padding: 6, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(no committed actions yet)')
                  );
                })
              : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No top values picked yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Values and Committed Action from Acceptance and Commitment Therapy (Hayes, Strosahl, Wilson). ',
              'Adolescent framing draws on DNA-V (Hayes, Ciarrochi, Bailey). Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('valuesCommittedAction', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'Values vs. goals'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The single most important distinction in ACT: values are directions, goals are destinations. Goals can be reached and checked off; values cannot. "Honesty" is a value; "tell the truth in this specific conversation" is a goal that points in that direction. When the goal succeeds, the value lives on; when the goal fails, the value still lives on. Goals are how values become real, but they are not the same as values.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The shift this opens up: when you fail to reach a goal, you have not failed your values. You can keep moving in the same direction with a different goal.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'Where ACT comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Acceptance and Commitment Therapy (ACT, pronounced as the word "act") was developed primarily by Steven C. Hayes starting in the 1980s. ACT sits in the third wave of CBT alongside DBT, mindfulness-based therapies, and others. Its central move is to relate differently to thoughts and feelings (acceptance, defusion) rather than trying to change them, and to commit to actions guided by values. ACT has been extensively evaluated; meta-analyses find efficacy across depression, anxiety, chronic pain, and many other conditions.'
            ),
            h('p', { style: { margin: '10px 0 0', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'For adolescents specifically, DNA-V (Discoverer, Noticer, Advisor, Values) was developed by Hayes, Joseph Ciarrochi, and Louise Hayes as a developmentally appropriate ACT framework. DNA-V is now taught in many schools and youth mental health programs as the adolescent-facing version of ACT.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for ACT and DNA-V.'),
            sourceCard('Hayes, S. C., Strosahl, K. D., and Wilson, K. G. (2011)', 'Acceptance and Commitment Therapy: The Process and Practice of Mindful Change (2nd ed.), Guilford Press', 'The foundational ACT treatment manual.', null),
            sourceCard('Harris, R. (2019)', 'ACT Made Simple (2nd ed.), New Harbinger', 'Accessible practitioner introduction to ACT, widely used in training.', null),
            sourceCard('Hayes, L. L. and Ciarrochi, J. (2015)', 'The Thriving Adolescent: Using Acceptance and Commitment Therapy and Positive Psychology to Help Teens Manage Emotions, Achieve Goals, and Build Connection, New Harbinger', 'The DNA-V adolescent framework. Used widely in schools.', null),
            sourceCard('Ciarrochi, J., Hayes, L., and Bailey, A. (2012)', 'Get Out of Your Mind and Into Your Life for Teens, New Harbinger', 'Workbook version of ACT for adolescents.', null),
            sourceCard('Association for Contextual Behavioral Science', 'contextualscience.org', 'The professional organization for ACT and ACT-adjacent practitioners. Open-access research and training.', 'https://contextualscience.org/'),
            sourceCard('A-Tjak, J. G. L. et al. (2015)', '"A Meta-Analysis of the Efficacy of ACT for Clinically Relevant Mental and Physical Health Problems," Psychotherapy and Psychosomatics, 84(1), 30-36', 'Meta-analytic review of ACT outcomes across conditions.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'ACT was developed in a Western therapeutic tradition. The values list is broad but reflects cultural assumptions; if a core value of yours is not on the list, add it in your own words.'),
              h('li', null, 'The values vs goals distinction is conceptually useful but can be over-applied. For some students with executive function challenges, "concrete goal" is what makes action possible; do not let the ACT framing get in the way of taking the next step.'),
              h('li', null, 'ACT acceptance work assumes you have basic safety. For a student in an actively unsafe situation, "accept your thoughts and act on values" is not the right move; safety first, ACT later.'),
              h('li', null, 'Committed action without resources is unfair to ask of students. If a student\'s value is "creativity" and they have no art supplies, no time, and no quiet space, the structural barrier matters more than the individual commitment.'),
              h('li', null, 'Like all reflective tools, this is not therapy. If values work surfaces something heavy, bring it to a counselor.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Values and Committed Action pairs naturally with Goal Setter (concrete SMART goals) and HOWL Tracker (Effective Effort persistence). A productive Crew protocol: each student picks one value, names one committed action for the week, then reports back next Crew on what they did and what got in the way. The "what got in the way" piece often surfaces structural barriers that adults can help address.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'sort') body = renderSort();
      else if (view === 'top') body = renderTop();
      else if (view === 'actions') body = renderActions();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Values and Committed Action' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
