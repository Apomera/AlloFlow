// ═══════════════════════════════════════════════════════════════
// sel_tool_perma.js — PERMA Wellbeing Profile
// Martin Seligman's PERMA model of human flourishing: Positive
// emotion, Engagement, Relationships, Meaning, Accomplishment
// (plus Health, in the PERMA-H expansion). A 24-item self-check
// across the six domains, with bar-chart visualization and per-
// domain reflection prompts.
//
// Companion tool to VIA Strengths (same author, same tradition).
// Registered tool ID: "perma"
// Category: self-awareness
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('perma'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-perma')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-perma';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // PERMA-H domains
  var DOMAINS = {
    P: { id: 'P', label: 'Positive Emotion', icon: '😊', color: '#f59e0b',
         summary: 'Feeling good — joy, contentment, hope, gratitude.',
         atLow: 'Low Positive Emotion is not a moral failure; it is often a signal. Maybe burnout, maybe grief, maybe a season. The Behavioral Activation tool in this SEL Hub is built for this; it works.',
         atHigh: 'Genuine positive emotion is rare and worth noticing. Not forced cheerfulness; actual moments of "I feel okay right now." If you have them, name what is producing them.',
         reflection: 'What is one specific thing that genuinely lifts your mood, that you have NOT been doing enough of?'
       },
    E: { id: 'E', label: 'Engagement',  icon: '🌊', color: '#0ea5e9',
         summary: 'Flow — being absorbed in something you care about, losing track of time.',
         atLow: 'Low engagement often means you have not yet found the activity where you can lose yourself. It is rarely about "trying harder"; it is about finding the thing.',
         atHigh: 'When you have an activity that absorbs you, protect it. Flow is one of the most reliable predictors of long-term wellbeing.',
         reflection: 'When was the last time you lost track of time doing something? What were you doing?'
       },
    R: { id: 'R', label: 'Relationships', icon: '🤝', color: '#22c55e',
         summary: 'Connection — people in your life who matter, who know you, who you can be real with.',
         atLow: 'Thin relationships score is hard. It is also often a season, not a forever. The Care Constellations and Circles of Support tools in this SEL Hub are built for mapping and growing this.',
         atHigh: 'Strong relationships are the single strongest predictor of human flourishing across every study ever done. If you have them, they are not luck; you are building them.',
         reflection: 'Who is one person who is in your life by mutual choice, not by circumstance?'
       },
    M: { id: 'M', label: 'Meaning',     icon: '🌱', color: '#a855f7',
         summary: 'Purpose — feeling that what you do matters, connected to something bigger than yourself.',
         atLow: 'Meaning is often the last domain to develop, especially in adolescence. Low meaning does not mean your life is meaningless; it often means you are still finding the work, the cause, or the community that holds your purpose.',
         atHigh: 'A sense of meaning carries you through hard times in ways that nothing else does. The Values and Committed Action tool can help you make meaning visible.',
         reflection: 'What is one thing you do that matters to someone besides you?'
       },
    A: { id: 'A', label: 'Accomplishment', icon: '🏆', color: '#ef4444',
         summary: 'Mastery and progress — feeling competent, finishing things, growing in skill.',
         atLow: 'Low accomplishment can be a self-perception problem rather than a reality problem. People often achieve real things and discount them. Try the VIA Strengths tool, which is built to notice what you are good at.',
         atHigh: 'Accomplishment compounds. The small things you finish make the bigger things possible.',
         reflection: 'What is one specific thing you have completed in the last month that you have not given yourself credit for?'
       },
    H: { id: 'H', label: 'Health',      icon: '💪', color: '#10b981',
         summary: 'Physical wellbeing — energy, sleep, movement, nourishment.',
         atLow: 'Health affects everything else in PERMA. If you are not sleeping, not eating well, not moving, the other domains get harder mechanically. This is not a moral judgment; it is biology.',
         atHigh: 'Physical wellbeing is foundational. If you have it, the work of building meaning and relationships gets easier.',
         reflection: 'Which of these is most depleting you right now: sleep, food, movement, screens? What is one small move you would commit to?'
       }
  };

  // 24 items: 4 per domain
  var ITEMS = [
    // Positive Emotion
    { id: 'p1', domain: 'P', text: 'In the past two weeks, how often have you felt cheerful?', type: 'frequency' },
    { id: 'p2', domain: 'P', text: 'In general, how content do you feel with your life right now?', type: 'general' },
    { id: 'p3', domain: 'P', text: 'In the past two weeks, how often have you had moments of real joy or delight?', type: 'frequency' },
    { id: 'p4', domain: 'P', text: 'How hopeful do you feel about the next six months of your life?', type: 'general' },

    // Engagement
    { id: 'e1', domain: 'E', text: 'In the past two weeks, how often have you been absorbed deeply in what you were doing?', type: 'frequency' },
    { id: 'e2', domain: 'E', text: 'How often do you do an activity that you do not have to force yourself to do?', type: 'frequency' },
    { id: 'e3', domain: 'E', text: 'How interested are you in your daily activities, on the whole?', type: 'general' },
    { id: 'e4', domain: 'E', text: 'When you do something you enjoy, how easy is it to bring your full attention?', type: 'general' },

    // Relationships
    { id: 'r1', domain: 'R', text: 'To what extent do you feel loved by people in your life?', type: 'general' },
    { id: 'r2', domain: 'R', text: 'Is there at least one person you can be fully honest with about what is going on?', type: 'general' },
    { id: 'r3', domain: 'R', text: 'When you need support, how easy is it to find it?', type: 'general' },
    { id: 'r4', domain: 'R', text: 'How much do you feel like you belong somewhere?', type: 'general' },

    // Meaning
    { id: 'm1', domain: 'M', text: 'How much do you feel your life has a purpose?', type: 'general' },
    { id: 'm2', domain: 'M', text: 'To what extent do you feel that what you do matters?', type: 'general' },
    { id: 'm3', domain: 'M', text: 'How connected do you feel to something bigger than yourself (cause, community, faith, nature)?', type: 'general' },
    { id: 'm4', domain: 'M', text: 'How clear is your sense of direction in your life right now?', type: 'general' },

    // Accomplishment
    { id: 'a1', domain: 'A', text: 'How proud do you feel of things you have done recently?', type: 'general' },
    { id: 'a2', domain: 'A', text: 'How competent do you feel in something that matters to you?', type: 'general' },
    { id: 'a3', domain: 'A', text: 'How much progress do you feel you are making toward things you care about?', type: 'general' },
    { id: 'a4', domain: 'A', text: 'When you set a goal, how often do you actually follow through?', type: 'frequency' },

    // Health
    { id: 'h1', domain: 'H', text: 'How physically energetic do you feel most days?', type: 'general' },
    { id: 'h2', domain: 'H', text: 'In the past two weeks, how well have you been sleeping?', type: 'frequency' },
    { id: 'h3', domain: 'H', text: 'How well do you feel you have been taking care of your body?', type: 'general' },
    { id: 'h4', domain: 'H', text: 'How would you rate your overall physical health right now?', type: 'general' }
  ];

  function defaultState() {
    return {
      view: 'home',
      ratings: {},          // itemId -> 0-10
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function domainScore(ratings, domainId) {
    var items = ITEMS.filter(function(i) { return i.domain === domainId; });
    var rated = items.filter(function(i) { return ratings[i.id] !== undefined && ratings[i.id] !== null; });
    if (rated.length === 0) return null;
    var sum = rated.reduce(function(s, i) { return s + ratings[i.id]; }, 0);
    return Math.round((sum / rated.length) * 10) / 10;
  }

  function ratedItemCount(ratings) {
    return Object.keys(ratings || {}).filter(function(k) { return ratings[k] !== undefined && ratings[k] !== null; }).length;
  }

  function isComplete(ratings) {
    return ratedItemCount(ratings) === ITEMS.length;
  }

  window.SelHub.registerTool('perma', {
    icon: '🌻',
    label: 'PERMA Wellbeing',
    desc: 'Self-check on the five (six with Health) domains of human flourishing: Positive emotion, Engagement, Relationships, Meaning, Accomplishment, Health. 24 items, bar-chart result, per-domain reflection. From Seligman\'s wellbeing theory; pairs with VIA Strengths.',
    color: 'amber',
    category: 'self-awareness',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.perma || defaultState();
      function setP(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.perma) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.ratings) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { perma: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setP({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      var complete = isComplete(d.ratings);

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fcd34d', fontSize: 22, fontWeight: 900 } }, '🌻 PERMA Wellbeing'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Six domains of human flourishing. A snapshot of where life is full and where it is thin.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🌻' },
          { id: 'check', label: complete ? 'Re-check' : 'Self-check', icon: '✏️' },
          { id: 'profile', label: 'My profile', icon: '📊' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'PERMA Wellbeing sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#f59e0b' : '#334155'),
                background: active ? 'rgba(245,158,11,0.18)' : '#1e293b',
                color: active ? '#fde68a' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'PERMA is a wellbeing model, not a diagnostic tool. Persistent low scores across multiple domains can be a signal worth bringing to a counselor or therapist. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — overview
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        var rated = ratedItemCount(d.ratings);

        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fde68a', marginBottom: 4 } }, 'PERMA: how full is the picture right now?'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'PERMA is Martin Seligman\'s model of human flourishing. Five domains (plus one): Positive emotion, Engagement, Relationships, Meaning, Accomplishment, and Health. The point is NOT to score high on all of them; people are typically richer in some and thinner in others. The point is honesty about what is true right now.'
            )
          ),

          // Quick stats
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            statCard('Items rated', rated + ' / ' + ITEMS.length, '#f59e0b'),
            complete ? statCard('Average', (averageScore(d.ratings)).toFixed(1) + ' / 10', '#22c55e') : null,
            d.lastUpdated ? statCard('Updated', d.lastUpdated, '#94a3b8') : null
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 8 } }, '✏️ Take the self-check'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5 } }, '24 items, 0-10 scale, ~5 minutes. You can stop and come back.'),
            h('button', { onClick: function() { goto('check'); }, 'aria-label': 'Take self-check',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } },
              complete ? '✏️ Re-take' : '+ Start')
          ),

          complete ? h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 8 } }, '📊 See your profile'),
            h('button', { onClick: function() { goto('profile'); }, 'aria-label': 'See profile',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 13 } }, '→ My profile')
          ) : null,

          // Cross-link to VIA Strengths
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '🔗 Pair this with VIA Strengths. '),
            'PERMA and VIA were developed by the same author (Martin Seligman). Using your signature strengths in new ways tends to raise PERMA scores across domains. Both tools are in the SEL Hub.'
          ),

          softPointer()
        );
      }

      function averageScore(ratings) {
        var rated = ITEMS.filter(function(i) { return ratings[i.id] !== undefined && ratings[i.id] !== null; });
        if (rated.length === 0) return 0;
        return rated.reduce(function(s, i) { return s + ratings[i.id]; }, 0) / rated.length;
      }

      function statCard(label, value, color) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color } },
          h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
          h('div', { style: { fontSize: 18, color: color, fontWeight: 900 } }, value)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHECK — 24 items
      // ═══════════════════════════════════════════════════════════
      function renderCheck() {
        function setRating(itemId, value) {
          var r = Object.assign({}, (d.ratings || {}));
          r[itemId] = value;
          setP({ ratings: r });
        }

        var rated = ratedItemCount(d.ratings);
        var pct = Math.round((rated / ITEMS.length) * 100);

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '✏️ Rate each on 0-10. '),
            '0 = "not at all true for me right now," 10 = "very true for me right now." Use your honest first impression; do not overthink it.'
          ),

          // Progress
          h('div', { style: { marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } }, rated + ' of ' + ITEMS.length + ' rated'),
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct },
              h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #d97706, #f59e0b)' } })
            )
          ),

          // Items grouped by domain
          ['P', 'E', 'R', 'M', 'A', 'H'].map(function(domainId) {
            var dom = DOMAINS[domainId];
            var items = ITEMS.filter(function(i) { return i.domain === domainId; });
            return h('div', { key: domainId, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + dom.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 20 } }, dom.icon),
                h('span', { style: { fontSize: 13, fontWeight: 800, color: dom.color } }, dom.label)
              ),
              items.map(function(item) {
                var v = (d.ratings || {})[item.id];
                var hasRating = v !== undefined && v !== null;
                return h('div', { key: item.id, style: { padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 6 } },
                  h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.5 } }, item.text),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                    h('input', { type: 'range', min: 0, max: 10, value: hasRating ? v : 5,
                      onChange: function(e) { setRating(item.id, parseInt(e.target.value, 10)); },
                      style: { flex: 1, minWidth: 180 },
                      'aria-label': 'Rate: ' + item.text }),
                    h('span', { style: { fontSize: 14, fontWeight: 800, color: hasRating ? dom.color : '#475569', minWidth: 40, textAlign: 'right' } }, hasRating ? v + '/10' : '–'),
                    !hasRating ? h('button', { onClick: function() { setRating(item.id, 5); }, 'aria-label': 'Set this rating',
                      style: { padding: '4px 8px', borderRadius: 4, border: '1px solid ' + dom.color, background: 'transparent', color: dom.color, cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'Set') : null
                  )
                );
              })
            );
          }),

          complete ? h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('profile'); }, 'aria-label': 'See profile',
              style: { padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '📊 See my profile')
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PROFILE — bar chart visualization
      // ═══════════════════════════════════════════════════════════
      function renderProfile() {
        if (ratedItemCount(d.ratings) < 6) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📊'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Need more items rated first'),
              h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Rate at least 6 items (1 per domain) to see your profile.'),
              h('button', { onClick: function() { goto('check'); }, 'aria-label': 'Self-check',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: '#fde68a', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Self-check')
            )
          );
        }

        var scores = {};
        ['P', 'E', 'R', 'M', 'A', 'H'].forEach(function(id) { scores[id] = domainScore(d.ratings, id); });
        var ratedScores = Object.keys(scores).filter(function(k) { return scores[k] !== null; }).map(function(k) { return scores[k]; });
        var avg = ratedScores.length > 0 ? (ratedScores.reduce(function(s, v) { return s + v; }, 0) / ratedScores.length) : 0;
        // Find highest and lowest
        var ranked = ['P', 'E', 'R', 'M', 'A', 'H'].filter(function(k) { return scores[k] !== null; }).sort(function(a, b) { return scores[b] - scores[a]; });
        var highest = ranked[0];
        var lowest = ranked[ranked.length - 1];

        // Accessibility description
        var svgDesc = 'PERMA wellbeing profile. ' + ranked.map(function(k) { return DOMAINS[k].label + ': ' + scores[k]; }).join('; ') + '. Average: ' + avg.toFixed(1) + ' out of 10.';

        return h('div', null,
          // Summary card
          h('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fde68a', marginBottom: 4 } }, 'Overall ' + avg.toFixed(1) + ' / 10'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } },
              'Strongest: ',
              h('strong', { style: { color: DOMAINS[highest].color } }, DOMAINS[highest].label + ' (' + scores[highest] + ')'),
              '  ·  Thinnest: ',
              h('strong', { style: { color: DOMAINS[lowest].color } }, DOMAINS[lowest].label + ' (' + scores[lowest] + ')'),
              '. Below: the bar for each domain.'
            )
          ),

          // SVG bar chart with accessibility
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0b1220', border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto' } },
            h('svg', { width: '100%', viewBox: '0 0 720 360', style: { maxWidth: 720 }, 'aria-labelledby': 'perma-title perma-desc', role: 'img' },
              h('title', { id: 'perma-title' }, 'PERMA wellbeing bar chart'),
              h('desc', { id: 'perma-desc' }, svgDesc),
              ['P', 'E', 'R', 'M', 'A', 'H'].map(function(domainId, i) {
                var dom = DOMAINS[domainId];
                var s = scores[domainId];
                if (s === null) return null;
                var barW = (s / 10) * 540;
                var y = 30 + i * 52;
                return h('g', { key: domainId },
                  h('text', { x: 16, y: y + 16, fontSize: 13, fill: dom.color, style: { fontWeight: 800 } }, dom.icon + ' ' + dom.label),
                  h('rect', { x: 160, y: y, width: 540, height: 24, fill: '#1e293b', stroke: '#334155', strokeWidth: 1, rx: 4 }),
                  h('rect', { x: 160, y: y, width: barW, height: 24, fill: dom.color, opacity: 0.85, rx: 4 }),
                  h('text', { x: 170 + barW, y: y + 16, fontSize: 13, fill: '#fff', style: { fontWeight: 800 } }, s.toFixed(1))
                );
              }),
              // 10 scale markers
              h('text', { x: 160, y: 350, fontSize: 9, fill: '#64748b' }, '0'),
              h('text', { x: 430, y: 350, fontSize: 9, fill: '#64748b' }, '5'),
              h('text', { x: 690, y: 350, fontSize: 9, fill: '#64748b' }, '10')
            )
          ),

          // Text-equivalent
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#fcd34d', fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b' } }, '🔤 Read this chart as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
                ranked.map(function(k) {
                  var dom = DOMAINS[k];
                  return h('li', { key: k },
                    h('strong', { style: { color: dom.color } }, dom.label),
                    ': ' + scores[k] + ' / 10'
                  );
                })
              )
            )
          ),

          // Per-domain interpretation cards
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'What each domain is telling you'),
          ranked.map(function(k) {
            var dom = DOMAINS[k];
            var s = scores[k];
            var note = s >= 7 ? dom.atHigh : s <= 4 ? dom.atLow : null;
            return h('div', { key: k, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + dom.color, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                h('span', { style: { fontSize: 18 } }, dom.icon),
                h('span', { style: { fontSize: 13, fontWeight: 800, color: dom.color, flex: 1 } }, dom.label),
                h('span', { style: { fontSize: 14, color: dom.color, fontWeight: 900 } }, s + '/10')
              ),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: note ? 6 : 0 } }, dom.summary),
              note ? h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontStyle: 'italic', paddingTop: 6, borderTop: '1px solid #1e293b' } }, note) : null
            );
          }),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect on this',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '💭 Reflect'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT — domain-specific prompts
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var scores = {};
        ['P', 'E', 'R', 'M', 'A', 'H'].forEach(function(id) { scores[id] = domainScore(d.ratings, id); });
        var ranked = ['P', 'E', 'R', 'M', 'A', 'H'].filter(function(k) { return scores[k] !== null; }).sort(function(a, b) { return scores[a] - scores[b]; });
        // Lowest first (most attention-worthy)

        if (ranked.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Take the self-check first'),
              h('button', { onClick: function() { goto('check'); }, 'aria-label': 'Self-check',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: '#fde68a', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Self-check')
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '💭 One domain at a time. '),
            'Below are reflection prompts for each PERMA domain. Pick one. Sit with it. You are not trying to "raise your score"; you are trying to see clearly.'
          ),

          ranked.map(function(k) {
            var dom = DOMAINS[k];
            var s = scores[k];
            return h('div', { key: k, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + dom.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 22 } }, dom.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: dom.color, flex: 1 } }, dom.label + ' · ' + s + '/10')
              ),
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, fontStyle: 'italic' } }, dom.reflection)
            );
          }),

          // Cross-tool pointers
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #818cf8', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e0e7ff', marginBottom: 8 } }, '🔗 Tools that work directly on each PERMA domain'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, h('strong', null, 'Positive Emotion / Engagement'), ' — Behavioral Activation, Mindfulness Corner'),
              h('li', null, h('strong', null, 'Relationships'), ' — Care Constellations, Circles of Support, DEAR MAN'),
              h('li', null, h('strong', null, 'Meaning'), ' — Values & Committed Action, Orientations, Quiet Questions'),
              h('li', null, h('strong', null, 'Accomplishment'), ' — VIA Strengths, Goal Setter, HOWL Tracker'),
              h('li', null, h('strong', null, 'Health'), ' — Stress Bucket, Coping Toolkit, TIPP for acute moments')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var scores = {};
        ['P', 'E', 'R', 'M', 'A', 'H'].forEach(function(id) { scores[id] = domainScore(d.ratings, id); });
        var ranked = ['P', 'E', 'R', 'M', 'A', 'H'].filter(function(k) { return scores[k] !== null; }).sort(function(a, b) { return scores[b] - scores[a]; });
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(245,158,11,0.10)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fde68a', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview.')),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'perma-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#perma-print-region, #perma-print-region * { visibility: visible !important; } ' +
              '#perma-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #d97706' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'PERMA Wellbeing Profile'),
              h('h1', { style: { margin: 0, fontSize: 26, fontWeight: 900 } }, 'My PERMA snapshot'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Domain scores
            ranked.length > 0 ? h('ul', { style: { margin: '0 0 18px', padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.85 } },
              ranked.map(function(k) {
                var dom = DOMAINS[k];
                return h('li', { key: k },
                  h('strong', null, dom.label),
                  ': ', scores[k] + ' / 10  — ', dom.summary
                );
              })
            ) : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'Self-check not complete yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'PERMA wellbeing model from Seligman, M. (2011), Flourish. ',
              'Created with AlloFlow SEL Hub.'
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('perma', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'What PERMA is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'PERMA is a model of human flourishing developed by Martin Seligman, the founder of Positive Psychology. The acronym stands for Positive emotion, Engagement, Relationships, Meaning, and Accomplishment. The PERMA-H version adds Health. The five (or six) domains together describe what wellbeing actually is in concrete terms.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The point of PERMA is that wellbeing is NOT just feeling good. Engagement (flow), Relationships, Meaning, and Accomplishment are real dimensions of a good life that are not captured by mood alone. A person can be high on Meaning and low on Positive Emotion (a hospice worker on a hard day) and still be doing well. The profile shows where life is rich and where it is thin.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'Where PERMA comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Martin Seligman published PERMA in 2011 (in his book Flourish) as a revision of his earlier "Authentic Happiness" model. Seligman is also the co-developer (with Christopher Peterson) of the VIA Character Strengths classification. PERMA and VIA Strengths are sister frameworks: PERMA describes the domains of wellbeing, VIA describes the character traits people use to inhabit those domains. The PERMA-Profiler (Butler & Kern, 2016) is the most-cited measurement tool; this Career Compass tool uses a similar item structure adapted for school context.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Seligman, M. E. P. (2011)', 'Flourish: A Visionary New Understanding of Happiness and Well-being, Free Press', 'The foundational book that introduced PERMA.', null),
            sourceCard('Butler, J. and Kern, M. L. (2016)', '"The PERMA-Profiler: A brief multidimensional measure of flourishing," International Journal of Wellbeing, 6(3), 1-48', 'The 23-item validated wellbeing measure widely used in research.', 'https://www.internationaljournalofwellbeing.org/index.php/ijow/article/view/526'),
            sourceCard('University of Pennsylvania Positive Psychology Center', 'ppc.sas.upenn.edu', 'Seligman\'s home institution. Free resources, research, and assessment links.', 'https://ppc.sas.upenn.edu/'),
            sourceCard('Goodman, F. R. et al. (2018)', '"Measuring Well-Being: A Comparison of Subjective Well-Being and PERMA," Journal of Positive Psychology, 13(4), 321-332', 'Comparative review of PERMA against other wellbeing measures.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'PERMA is a snapshot of right now. Scores will shift across weeks, months, and seasons. A low score is information about a season, not a permanent state.'),
              h('li', null, 'PERMA reflects mostly Western individualist wellbeing thinking. Some traditions (especially Buddhist, Indigenous, and African) frame wellbeing in more relational and less self-oriented ways. Use PERMA alongside, not instead of, other ways of understanding what a good life is.'),
              h('li', null, 'Positive psychology has been critiqued (Ehrenreich, Cabanas, Illouz) for sometimes obscuring structural causes of suffering with individualizing language. PERMA can be used badly to imply that wellbeing is just a personal mindset choice. It is not.'),
              h('li', null, 'A low Health domain often points toward sleep deprivation, food insecurity, chronic illness, or structural barriers. These are real, and not solved by trying harder.'),
              h('li', null, 'This is a reflective tool, not a diagnostic. Persistent low Positive Emotion + low Engagement + low Meaning over a long period can be a sign of depression that deserves a clinician.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 12.5, color: '#fde68a', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'PERMA works well as a beginning-of-quarter / mid-quarter / end-of-quarter check-in to see how a class is doing as a group (or how an individual student is shifting). Pair with VIA Strengths to add the "what traits am I using" lens. For Crew, a lighter version: each student names one PERMA domain that is going well and one that is going thin this week.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fcd34d', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fde68a', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fde68a', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'check') body = renderCheck();
      else if (view === 'profile') body = renderProfile();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'PERMA Wellbeing Profile' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
