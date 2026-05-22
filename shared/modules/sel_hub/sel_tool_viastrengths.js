// ═══════════════════════════════════════════════════════════════
// sel_tool_viastrengths.js — VIA Character Strengths Self-Sort
// A simplified reflection tool for the 24 Character Strengths in
// the VIA Classification (Peterson & Seligman, 2004). NOT the full
// VIA Survey — students are pointed to viacharacter.org for the
// authoritative free instrument. This tool lets students self-sort
// the 24 strengths, identify a top 5, and reflect on signature
// strengths.
// Registered tool ID: "viaStrengths"
// Category: self-awareness
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('viaStrengths'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-via')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-via';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The 24 character strengths organized under 6 virtue categories
  // (Peterson & Seligman 2004; VIA Institute classification).
  var STRENGTHS = [
    // Wisdom & Knowledge
    { id: 'creativity',  virtue: 'Wisdom and Knowledge', icon: '🎨', label: 'Creativity',
      desc: 'Thinking of new ways to do things; producing original ideas.' },
    { id: 'curiosity',   virtue: 'Wisdom and Knowledge', icon: '🔍', label: 'Curiosity',
      desc: 'Taking interest in ongoing experience; exploring and discovering.' },
    { id: 'openMinded',  virtue: 'Wisdom and Knowledge', icon: '🪟', label: 'Open-mindedness',
      desc: 'Thinking things through; willing to change your mind.' },
    { id: 'loveLearning', virtue: 'Wisdom and Knowledge', icon: '📚', label: 'Love of Learning',
      desc: 'Mastering new skills, topics, and bodies of knowledge.' },
    { id: 'perspective', virtue: 'Wisdom and Knowledge', icon: '🦉', label: 'Perspective',
      desc: 'Being able to give wise counsel to others; seeing the bigger picture.' },

    // Courage
    { id: 'bravery',     virtue: 'Courage', icon: '🦁', label: 'Bravery',
      desc: 'Acting despite fear; speaking up for what is right.' },
    { id: 'perseverance',virtue: 'Courage', icon: '🧗', label: 'Perseverance',
      desc: 'Finishing what you start; persisting through obstacles.' },
    { id: 'honesty',     virtue: 'Courage', icon: '🪞', label: 'Honesty',
      desc: 'Telling the truth; presenting yourself authentically.' },
    { id: 'zest',        virtue: 'Courage', icon: '⚡', label: 'Zest',
      desc: 'Approaching life with energy and excitement.' },

    // Humanity
    { id: 'love',        virtue: 'Humanity', icon: '💛', label: 'Love',
      desc: 'Valuing close relationships; being close to others.' },
    { id: 'kindness',    virtue: 'Humanity', icon: '🤗', label: 'Kindness',
      desc: 'Doing favors and good deeds for others; caring.' },
    { id: 'socialIntel', virtue: 'Humanity', icon: '👁️', label: 'Social Intelligence',
      desc: 'Knowing what makes other people tick; being aware of motives and feelings.' },

    // Justice
    { id: 'teamwork',    virtue: 'Justice', icon: '🤝', label: 'Teamwork',
      desc: 'Working well as a member of a group; being loyal to the group.' },
    { id: 'fairness',    virtue: 'Justice', icon: '⚖️', label: 'Fairness',
      desc: 'Treating all people fairly; giving everyone a fair chance.' },
    { id: 'leadership',  virtue: 'Justice', icon: '🚩', label: 'Leadership',
      desc: 'Encouraging a group to get things done; organizing group activities.' },

    // Temperance
    { id: 'forgiveness', virtue: 'Temperance', icon: '🕊️', label: 'Forgiveness',
      desc: 'Letting go of past hurts; giving people a second chance.' },
    { id: 'humility',    virtue: 'Temperance', icon: '🌱', label: 'Humility',
      desc: 'Letting your accomplishments speak for themselves; not seeking the spotlight.' },
    { id: 'prudence',    virtue: 'Temperance', icon: '🧭', label: 'Prudence',
      desc: 'Being careful about your choices; not saying or doing things you might regret.' },
    { id: 'selfReg',     virtue: 'Temperance', icon: '🎚️', label: 'Self-Regulation',
      desc: 'Managing your feelings and actions; being disciplined.' },

    // Transcendence
    { id: 'appBeauty',   virtue: 'Transcendence', icon: '🌅', label: 'Appreciation of Beauty',
      desc: 'Noticing and appreciating beauty, excellence, and skilled performance.' },
    { id: 'gratitude',   virtue: 'Transcendence', icon: '🙏', label: 'Gratitude',
      desc: 'Aware of and thankful for the good things that happen.' },
    { id: 'hope',        virtue: 'Transcendence', icon: '🌟', label: 'Hope',
      desc: 'Expecting the best; working to make it happen.' },
    { id: 'humor',       virtue: 'Transcendence', icon: '😄', label: 'Humor',
      desc: 'Liking to laugh and tease; bringing smiles to other people.' },
    { id: 'spirituality',virtue: 'Transcendence', icon: '🕯️', label: 'Spirituality',
      desc: 'Having a coherent picture of what life is about; meaning and purpose.' }
  ];

  function defaultState() {
    return {
      view: 'overview',
      ratings: {},       // strengthId -> 1-5
      topFive: [],       // [strengthId, ...] (up to 5)
      reflections: {},   // strengthId -> string
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('viaStrengths', {
    icon: '🌟',
    label: 'VIA Strengths',
    desc: 'A simplified self-reflection on the 24 VIA Character Strengths (Peterson and Seligman, 2004). Rate each, identify your top 5, and reflect on signature strengths. For the authoritative free survey, go to viacharacter.org. This tool is reflective practice, not a validated psychometric.',
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

      var d = labToolData.viaStrengths || defaultState();
      function setVS(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.viaStrengths) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.ratings || patch.topFive || patch.reflections) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { viaStrengths: next });
        });
      }
      var view = d.view || 'overview';
      function goto(v) { setVS({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fcd34d', fontSize: 22, fontWeight: 900 } }, '🌟 VIA Strengths'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A reflection on the 24 VIA Character Strengths.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'overview', label: 'Overview', icon: '🌟' },
          { id: 'sort', label: 'Self-Sort', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'VIA Strengths sections',
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

      function authoritativeBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.4)', borderRight: '1px solid rgba(245,158,11,0.4)', borderBottom: '1px solid rgba(245,158,11,0.4)', borderLeft: '3px solid #f59e0b', marginBottom: 12, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
          h('strong', null, '📚 The authoritative VIA Survey is free at '),
          h('a', { href: 'https://www.viacharacter.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fcd34d', textDecoration: 'underline', fontWeight: 800 } }, 'viacharacter.org'),
          '. The instrument has 96 or 120 items, is validated, and gives you a personalized ranking of all 24 strengths. This tool is reflective practice on the same 24 strengths, not a replacement for the survey.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Strengths-spotting is a reflective practice. It is not a psychological diagnosis and it does not replace counseling or therapy. Crisis Text Line: text HOME to 741741.'
        );
      }

      function ratingOf(id) { return (d.ratings || {})[id] || 0; }

      // ═══════════════════════════════════════════════════════════
      // OVERVIEW
      // ═══════════════════════════════════════════════════════════
      function renderOverview() {
        var rated = Object.keys(d.ratings || {}).filter(function(k) { return d.ratings[k] > 0; }).length;
        var topFive = d.topFive || [];

        return h('div', null,
          authoritativeBanner(),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fde68a' } }, 'My Strengths'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } },
              rated + ' of 24 rated',
              d.lastUpdated ? ' · updated ' + d.lastUpdated : '')
          ),

          topFive.length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fcd34d', marginBottom: 10 } }, '✨ My signature strengths'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
              topFive.map(function(id) {
                var s = STRENGTHS.find(function(x) { return x.id === id; });
                if (!s) return null;
                return h('div', { key: id, style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #f59e0b66' } },
                  h('div', { style: { fontSize: 26, marginBottom: 4 } }, s.icon),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a' } }, s.label),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.virtue)
                );
              })
            )
          ) : h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14, textAlign: 'center' } },
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'Rate the 24 strengths to identify your top 5 signature strengths.'),
            h('button', { onClick: function() { goto('sort'); }, 'aria-label': 'Start the self-sort',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '→ Start the self-sort')
          ),

          // Brief overview of all 24 by virtue
          renderVirtueGroups(),

          softPointer()
        );
      }

      function renderVirtueGroups() {
        var virtues = {};
        STRENGTHS.forEach(function(s) {
          virtues[s.virtue] = virtues[s.virtue] || [];
          virtues[s.virtue].push(s);
        });
        return h('div', null,
          Object.keys(virtues).map(function(v) {
            return h('div', { key: v, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, v),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 } },
                virtues[v].map(function(s) {
                  var r = ratingOf(s.id);
                  return h('div', { key: s.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6, background: '#1e293b' } },
                    h('span', { style: { fontSize: 18 } }, s.icon),
                    h('span', { style: { flex: 1, fontSize: 12, color: '#e2e8f0', fontWeight: 600 } }, s.label),
                    r > 0 ? h('span', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 800 } }, r) : null
                  );
                })
              )
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SELF-SORT — rate each strength 1-5
      // ═══════════════════════════════════════════════════════════
      function renderSort() {
        function rate(id, value) {
          var ratings = Object.assign({}, (d.ratings || {}));
          ratings[id] = value;
          setVS({ ratings: ratings });
        }
        function toggleTop(id) {
          var top = (d.topFive || []).slice();
          var idx = top.indexOf(id);
          if (idx >= 0) {
            top.splice(idx, 1);
          } else if (top.length < 5) {
            top.push(id);
          } else {
            if (addToast) addToast('You already have 5 signature strengths. Remove one to add another.', 'info');
            return;
          }
          setVS({ topFive: top });
        }

        var virtues = {};
        STRENGTHS.forEach(function(s) {
          virtues[s.virtue] = virtues[s.virtue] || [];
          virtues[s.virtue].push(s);
        });

        return h('div', null,
          authoritativeBanner(),
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '✏️ How this works: '),
            'For each of the 24 strengths, rate how much it sounds like you (1 = not really me, 5 = really me). Then click the star icon on up to 5 strengths to mark them as your signature strengths.'
          ),

          Object.keys(virtues).map(function(v) {
            return h('div', { key: v, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
              h('div', { style: { fontSize: 11, color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 } }, v),
              virtues[v].map(function(s) {
                var r = ratingOf(s.id);
                var isTop = (d.topFive || []).indexOf(s.id) !== -1;
                return h('div', { key: s.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 22 } }, s.icon),
                    h('div', { style: { flex: 1, minWidth: 180 } },
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' } }, s.label),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.desc)
                    ),
                    h('div', { style: { display: 'flex', gap: 2 }, role: 'radiogroup', 'aria-label': 'Rate ' + s.label },
                      [1, 2, 3, 4, 5].map(function(n) {
                        var active = r === n;
                        return h('button', { key: n, onClick: function() { rate(s.id, n); }, role: 'radio', 'aria-checked': active, 'aria-label': 'Rate ' + n,
                          style: { padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (active ? '#f59e0b' : '#475569'), background: active ? '#f59e0b' : 'transparent', color: active ? '#0f172a' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, n);
                      })
                    ),
                    h('button', { onClick: function() { toggleTop(s.id); }, 'aria-label': isTop ? 'Remove from top 5' : 'Add to top 5', 'aria-pressed': isTop,
                      style: { padding: '4px 8px', borderRadius: 4, border: '1px solid ' + (isTop ? '#fcd34d' : '#475569'), background: isTop ? 'rgba(252,211,77,0.18)' : 'transparent', color: isTop ? '#fcd34d' : '#94a3b8', cursor: 'pointer', fontSize: 14 } }, isTop ? '⭐' : '☆')
                  )
                );
              })
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT — write notes on top 5
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var topFive = d.topFive || [];
        if (topFive.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '⭐'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Pick your top 5 first'),
              h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'In the Self-Sort view, star up to 5 strengths to mark them as signature.'),
              h('button', { onClick: function() { goto('sort'); }, 'aria-label': 'Go to self-sort',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: '#fde68a', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Self-Sort')
            )
          );
        }

        function setReflection(id, val) {
          var ref = Object.assign({}, (d.reflections || {}));
          ref[id] = val;
          setVS({ reflections: ref });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '💭 Reflect on each signature strength. '),
            'A signature strength is one that feels essential to you, that energizes you when you use it. For each one: when did you most recently use it well? What would it look like to use it MORE on purpose this month?'
          ),

          topFive.map(function(id) {
            var s = STRENGTHS.find(function(x) { return x.id === id; });
            if (!s) return null;
            var ref = (d.reflections || {})[id] || '';
            var refId = 'via-ref-' + id;
            return h('div', { key: id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 28 } }, s.icon),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a' } }, s.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.desc)
                )
              ),
              h('label', { htmlFor: refId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Reflect on ' + s.label),
              h('textarea', { id: refId, value: ref,
                placeholder: 'When have you used this well? How will you use it more on purpose?',
                onChange: function(e) { setReflection(id, e.target.value); },
                style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' } })
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var topFive = d.topFive || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(245,158,11,0.10)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fde68a', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('overview'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'via-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#via-print-region, #via-print-region * { visibility: visible !important; } ' +
              '#via-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #d97706' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'VIA Character Strengths · Self-Reflection'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Signature Strengths'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            topFive.length > 0
              ? topFive.map(function(id) {
                  var s = STRENGTHS.find(function(x) { return x.id === id; });
                  if (!s) return null;
                  var ref = (d.reflections || {})[id] || '';
                  return h('div', { key: id, style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 8, background: '#d97706', color: '#fff' } },
                      h('span', { style: { fontSize: 18 } }, s.icon),
                      h('span', { style: { fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                      h('span', { style: { fontSize: 10, marginLeft: 'auto', opacity: 0.85 } }, s.virtue)
                    ),
                    h('div', { style: { padding: '0 8px', fontSize: 12, color: '#475569', marginBottom: 6, fontStyle: 'italic' } }, s.desc),
                    ref ? h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, ref) : null
                  );
                })
              : h('div', { style: { padding: 14, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No signature strengths selected yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Strengths from Peterson, C. and Seligman, M. E. P. (2004), Character Strengths and Virtues, Oxford University Press. ',
              'For the authoritative free survey: viacharacter.org. Created with AlloFlow SEL Hub.'
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('viaStrengths', h, ctx) : null),
          // Authoritative pointer
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.4)', borderRight: '1px solid rgba(245,158,11,0.4)', borderBottom: '1px solid rgba(245,158,11,0.4)', borderLeft: '4px solid #f59e0b', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fcd34d', fontSize: 16 } }, '📚 The authoritative VIA Survey'),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 13.5, lineHeight: 1.7 } },
              'The VIA Institute on Character offers the validated VIA Survey free at ',
              h('a', { href: 'https://www.viacharacter.org/', target: '_blank', rel: 'noopener noreferrer',
                style: { color: '#fcd34d', textDecoration: 'underline', fontWeight: 800 } }, 'viacharacter.org'),
              '. The instrument has 96 or 120 items (an adult version and a youth version), takes about 10-15 minutes, and gives you a personalized rank-ordering of all 24 strengths. If you want the actual psychometric answer, go there. This in-app tool is a simplified self-reflection on the same 24 strengths, useful for thinking about your signature strengths but not validated.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'What VIA Character Strengths is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'VIA (Values In Action) is a classification of 24 character strengths organized under 6 broader virtue categories (Wisdom, Courage, Humanity, Justice, Temperance, Transcendence). The 24 strengths were derived by Christopher Peterson and Martin Seligman through a multi-year project examining what major philosophical and religious traditions across human history considered virtuous. The strengths that appeared in nearly all traditions made the list.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The framework was published in 2004 as Character Strengths and Virtues, an 800-page handbook that has become one of the founding texts of positive psychology. The VIA Survey based on the framework has been taken by over 35 million people worldwide.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, 'Signature strengths'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Of the 24 strengths, the 5 that feel most central to who you are are called your "signature strengths." Signature strengths share three features: (1) you recognize yourself in them, (2) they energize you when you use them, and (3) using them makes you feel more like yourself. The interesting research finding is that consciously using a signature strength in a new way each day for a week reliably increases happiness and decreases depressive symptoms (Seligman et al., 2005).'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the VIA framework.'),
            sourceCard('Peterson, C. and Seligman, M. E. P. (2004)', 'Character Strengths and Virtues: A Handbook and Classification, Oxford University Press', 'The 800-page foundational handbook. Defines the 24 strengths, their cross-cultural basis, and the supporting evidence.', null),
            sourceCard('VIA Institute on Character', 'viacharacter.org', 'The home of the VIA Survey (free) and an extensive open library of research articles. Take the actual survey here.', 'https://www.viacharacter.org/'),
            sourceCard('Niemiec, R. M. (2018)', 'Character Strengths Interventions: A Field Guide for Practitioners, Hogrefe Publishing', 'Practitioner manual for using VIA strengths in coaching, therapy, and education.', null),
            sourceCard('Niemiec, R. M. and Pearce, R. (2021)', '"The Practice of Character Strengths" (open access), Frontiers in Psychology', 'Recent open-access review of where the field is.', null)
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The 24-strength list is the result of cross-cultural philosophical analysis. It is not a neutral, value-free measure; it reflects choices about what counts as a strength. Other classifications would yield other lists.'),
              h('li', null, 'Positive psychology has been critiqued (by Barbara Ehrenreich and others) for overemphasizing individual mindset in a way that can obscure structural causes of suffering. Your strengths matter; they do not fix unjust circumstances.'),
              h('li', null, 'The self-sort version in this tool is reflective practice, not psychometrics. Two students who rate themselves at different times of day or in different moods can get different rankings.'),
              h('li', null, 'A "weak" strength is not a deficit you need to fix. The whole point of focusing on signature strengths is to lean into what is already vibrant in you.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 12.5, color: '#fde68a', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For a class activity, point students to the free VIA Survey at viacharacter.org first; use this tool for follow-up reflection and ongoing reference. A productive Crew or advisory conversation: "Pick one of your signature strengths and tell us about one time you used it well in the last week." Strengths-spotting in other students is a powerful Crew practice if framed carefully.'
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
      if (view === 'sort') body = renderSort();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderOverview();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'VIA Character Strengths' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
