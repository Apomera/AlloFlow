// ═══════════════════════════════════════════════════════════════
// sel_tool_quietquestions.js — Quiet Questions: Inner Inquiry Practice
// A weekly contemplative practice tool. Each week the student receives
// one open-ended question to sit with for seven days. Inspired by the
// Quaker query tradition and secular contemplative inquiry; designed
// to be non-religious and to work for students who resist diary-style
// journaling.
// Registered tool ID: "quietQuestions"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('quietQuestions'))) {
(function() {
  'use strict';

  // WCAG 4.1.3: live region
  (function() {
    if (document.getElementById('allo-live-quietquestions')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-quietquestions';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ═══════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════
  // 20 open-ended questions across 5 themes. Each is meant to be sat
  // with for a week, not answered quickly. Order is intentional: lighter
  // themes early in each theme, harder ones later.
  var QUERIES = [
    // Attention & Presence
    { id: 'q01', theme: 'attention', themeLabel: 'Attention and Presence', themeColor: '#0ea5e9', text: 'What did you really notice this week? What did you only half-notice?' },
    { id: 'q02', theme: 'attention', themeLabel: 'Attention and Presence', themeColor: '#0ea5e9', text: 'Where does your attention go when nothing is asking for it?' },
    { id: 'q03', theme: 'attention', themeLabel: 'Attention and Presence', themeColor: '#0ea5e9', text: 'What have you been doing on autopilot? What would it be like to do it on purpose instead?' },
    { id: 'q04', theme: 'attention', themeLabel: 'Attention and Presence', themeColor: '#0ea5e9', text: 'What is here, right now, that you are not actually looking at?' },

    // Longing and Desire
    { id: 'q05', theme: 'longing', themeLabel: 'Longing and Desire', themeColor: '#a855f7', text: 'What is something small you would do every day if no one were watching?' },
    { id: 'q06', theme: 'longing', themeLabel: 'Longing and Desire', themeColor: '#a855f7', text: 'What do you want that you do not let yourself want?' },
    { id: 'q07', theme: 'longing', themeLabel: 'Longing and Desire', themeColor: '#a855f7', text: 'Whose life have you been told to want? Whose life would you want if you had to choose for yourself?' },
    { id: 'q08', theme: 'longing', themeLabel: 'Longing and Desire', themeColor: '#a855f7', text: 'What are you waiting for? What if it does not come?' },

    // Difficulty and Grief
    { id: 'q09', theme: 'difficulty', themeLabel: 'Difficulty and Grief', themeColor: '#f59e0b', text: 'What is hard right now that you are pretending is not hard?' },
    { id: 'q10', theme: 'difficulty', themeLabel: 'Difficulty and Grief', themeColor: '#f59e0b', text: 'Where in your life are you tired? Tired of what?' },
    { id: 'q11', theme: 'difficulty', themeLabel: 'Difficulty and Grief', themeColor: '#f59e0b', text: 'What have you lost this year, or this season, that you have not let yourself fully feel?' },
    { id: 'q12', theme: 'difficulty', themeLabel: 'Difficulty and Grief', themeColor: '#f59e0b', text: 'What would it be like to be honest about this with one person who could hold it?' },

    // Connection and Care
    { id: 'q13', theme: 'connection', themeLabel: 'Connection and Care', themeColor: '#16a34a', text: 'When is the last time someone really listened to you? When did you really listen to someone?' },
    { id: 'q14', theme: 'connection', themeLabel: 'Connection and Care', themeColor: '#16a34a', text: 'Who are you to the people who love you? Who are you to the people who do not?' },
    { id: 'q15', theme: 'connection', themeLabel: 'Connection and Care', themeColor: '#16a34a', text: 'Whose name comes up when you think about who you owe care to? Whose name should?' },
    { id: 'q16', theme: 'connection', themeLabel: 'Connection and Care', themeColor: '#16a34a', text: 'What is the smallest kindness you can offer this week?' },

    // Growth and Becoming
    { id: 'q17', theme: 'growth', themeLabel: 'Growth and Becoming', themeColor: '#ec4899', text: 'Who were you a year ago? In what ways are you the same? In what ways are you different?' },
    { id: 'q18', theme: 'growth', themeLabel: 'Growth and Becoming', themeColor: '#ec4899', text: 'What is a story about yourself that you have started to outgrow?' },
    { id: 'q19', theme: 'growth', themeLabel: 'Growth and Becoming', themeColor: '#ec4899', text: 'What is something you do well that feels easy enough that you do not count it? Count it.' },
    { id: 'q20', theme: 'growth', themeLabel: 'Growth and Becoming', themeColor: '#ec4899', text: 'What scares you about becoming an adult? What about that fear sounds true?' }
  ];

  // ─── Gentle response prompts (rotate; not required) ───
  var RESPONSE_PROMPTS = [
    'What I notice when I sit with this...',
    'If I am honest with myself...',
    'What this question is asking me to look at...',
    'The first thing that comes up is...',
    'I have been avoiding this question because...',
    'What surprises me about this is...'
  ];

  // ─── Compute current week's query (based on date) ───
  function currentWeekIndex(now) {
    now = now || new Date();
    // Days since a fixed reference date, divided by 7
    var ref = new Date(2025, 0, 1);    // Jan 1 2025
    var diffDays = Math.floor((now - ref) / 86400000);
    var weekNum = Math.floor(diffDays / 7);
    return ((weekNum % QUERIES.length) + QUERIES.length) % QUERIES.length;
  }

  function defaultState() {
    return {
      view: 'this-week',                  // 'this-week' | 'all' | 'practice' | 'about'
      manualOverride: null,               // if set, overrides auto-by-date selection
      responses: [],                      // [{ date, queryId, text, shareWithCrew, crewVersion }]
      browseId: null                      // which query is being viewed in 'all' mode
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ─── Tool registration ───
  window.SelHub.registerTool('quietQuestions', {
    icon: '🌒',
    label: 'Quiet Questions',
    desc: 'Weekly inner inquiry practice: sit with one open-ended question for a full week. Twenty rotating queries across themes of attention, longing, difficulty, connection, and becoming. Inspired by Quaker query practice; secular and non-prescriptive.',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.quietQuestions || defaultState();
      function setQQ(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.quietQuestions) || defaultState();
          return Object.assign({}, prev, { quietQuestions: Object.assign({}, prior, patch) });
        });
      }
      var view = d.view || 'this-week';
      function goto(v) { setQQ({ view: v }); }

      // Resolve current query
      var currentIdx = d.manualOverride != null ? d.manualOverride : currentWeekIndex();
      var currentQuery = QUERIES[currentIdx];

      // ─── Header ───
      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#c4b5fd', fontSize: 22, fontWeight: 900 } }, '🌒 Quiet Questions'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A weekly inner inquiry practice. One question, seven days.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'this-week', label: 'This week', icon: '🌒' },
          { id: 'all', label: 'All questions', icon: '📚' },
          { id: 'practice', label: 'My practice', icon: '📝' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Quiet Questions sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : '#334155'),
                background: active ? 'rgba(167,139,250,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This is a reflective practice, not therapy. If a question stirs something heavy, that is information; bring it to a counselor, school psych, or trusted adult. Crisis Text Line: text HOME to 741741. Crisis Companion is in this same SEL Hub.'
        );
      }

      // ═══════════════════════════════════════════════════════
      // THIS WEEK
      // ═══════════════════════════════════════════════════════
      function renderThisWeek() {
        var q = currentQuery;
        // What has the student already written on THIS query?
        var existing = (d.responses || []).filter(function(r) { return r.queryId === q.id; });
        var draftId = 'qq-draft-' + q.id;

        function saveResponse() {
          var ta = document.getElementById(draftId);
          if (!ta || !ta.value.trim()) return;
          var crewCheck = document.getElementById('qq-share-crew');
          var crewText = document.getElementById('qq-crew-version');
          var entry = {
            date: todayISO(), queryId: q.id, text: ta.value.trim(),
            shareWithCrew: crewCheck ? !!crewCheck.checked : false,
            crewVersion: (crewCheck && crewCheck.checked && crewText) ? crewText.value.trim() : ''
          };
          setQQ({ responses: (d.responses || []).concat([entry]) });
          ta.value = '';
          if (crewText) crewText.value = '';
          if (crewCheck) crewCheck.checked = false;
          if (announceToSR) announceToSR('Response saved.');
          if (addToast) addToast('Saved.', 'success');
        }

        function tryDifferent() {
          // Pick a random different query, store override
          var pool = [];
          for (var i = 0; i < QUERIES.length; i++) if (i !== currentIdx) pool.push(i);
          var pick = pool[Math.floor(Math.random() * pool.length)];
          setQQ({ manualOverride: pick });
        }
        function resetAuto() { setQQ({ manualOverride: null }); }

        return h('div', null,
          // The query itself, big
          h('div', { style: { padding: 28, borderRadius: 14, marginBottom: 16, background: 'linear-gradient(135deg, ' + q.themeColor + '20 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + q.themeColor + '88', borderLeft: '4px solid ' + q.themeColor, textAlign: 'center' } },
            h('div', { style: { fontSize: 11, color: q.themeColor, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 } }, q.themeLabel),
            h('p', { style: { margin: 0, color: '#fff', fontSize: 22, lineHeight: 1.6, fontWeight: 500, fontStyle: 'italic' } }, q.text),
            h('div', { style: { marginTop: 14, fontSize: 11, color: '#94a3b8' } },
              'Question ' + (currentIdx + 1) + ' of ' + QUERIES.length,
              d.manualOverride != null ? h('span', null, ' · ',
                h('button', { onClick: resetAuto, style: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' } }, 'reset to this week\'s automatic')
              ) : h('span', null, ' · ',
                h('button', { onClick: tryDifferent, style: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' } }, 'try a different question')
              )
            )
          ),

          // Guidance about the practice
          h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.6 } },
            h('strong', null, '🌒 How this practice works: '),
            'sit with this question for a week. No need to answer it. You can write what comes up at any point: once, three times, every day, or not at all. The point is to let the question work on you, not to dispatch it.'
          ),

          // Response area
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('label', { htmlFor: draftId, style: { display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'Write what comes up (optional)'),
            h('div', { style: { fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' } }, 'Try a starter if it helps: "' + RESPONSE_PROMPTS[currentIdx % RESPONSE_PROMPTS.length] + '"'),
            h('textarea', { id: draftId,
              placeholder: 'What is here?',
              style: { width: '100%', minHeight: 130, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' }
            }),

            // Crew share opt-in
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 6, background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' } },
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: '#bbf7d0' } },
                h('input', { type: 'checkbox', id: 'qq-share-crew', 'aria-label': 'I want to share a version of this with my Crew' }),
                h('span', null, 'I want to share a shorter version of this with my Crew')
              ),
              h('textarea', { id: 'qq-crew-version',
                placeholder: 'A shorter version, only what you would actually want shared. Saved separately from your private response.',
                style: { width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginTop: 8 }
              })
            ),

            h('button', { onClick: saveResponse, 'aria-label': 'Save response',
              style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#a78bfa', color: '#fff', fontWeight: 700, fontSize: 13 } }, '+ Save'),
            h('span', { style: { marginLeft: 8, fontSize: 11, color: '#64748b' } }, 'Your responses are private to this device unless you choose to share.')
          ),

          // Existing responses for this query
          existing.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, existing.length + ' previous response' + (existing.length === 1 ? '' : 's') + ' to this question'),
            existing.slice().reverse().map(function(r, ri) {
              return h('div', { key: ri, style: { padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 6, borderLeft: '2px solid ' + q.themeColor + '88' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', marginBottom: 4 } }, r.date),
                h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, r.text),
                r.shareWithCrew && r.crewVersion ? h('div', { style: { marginTop: 8, padding: 6, background: 'rgba(22,163,74,0.10)', borderLeft: '2px solid #22c55e', borderRadius: 4, fontSize: 11.5, color: '#bbf7d0' } },
                  h('strong', { style: { color: '#22c55e' } }, '🤝 Crew version: '), r.crewVersion
                ) : null
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // ALL QUESTIONS — browse the full set
      // ═══════════════════════════════════════════════════════
      function renderAll() {
        var browseId = d.browseId || null;
        var browsed = QUERIES.find(function(q) { return q.id === browseId; });

        if (browsed) {
          // Detail view
          var responses = (d.responses || []).filter(function(r) { return r.queryId === browsed.id; });
          return h('div', null,
            h('button', { onClick: function() { setQQ({ browseId: null }); }, 'aria-label': 'Back to all questions',
              style: { marginBottom: 12, background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 } }, '← All questions'),
            h('div', { style: { padding: 24, borderRadius: 14, background: 'linear-gradient(135deg, ' + browsed.themeColor + '20 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + browsed.themeColor + '88', borderLeft: '4px solid ' + browsed.themeColor, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: browsed.themeColor, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 } }, browsed.themeLabel),
              h('p', { style: { margin: 0, color: '#fff', fontSize: 18, lineHeight: 1.6, fontStyle: 'italic' } }, browsed.text)
            ),
            h('button', { onClick: function() {
              var idx = QUERIES.findIndex(function(q) { return q.id === browsed.id; });
              setQQ({ manualOverride: idx, browseId: null, view: 'this-week' });
            }, 'aria-label': 'Make this my current question',
              style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #a78bfa', background: 'rgba(167,139,250,0.18)', color: '#e9d5ff', cursor: 'pointer', fontWeight: 700, fontSize: 13, marginBottom: 14 } }, '→ Make this my current question'),
            responses.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Your past responses to this question'),
              responses.slice().reverse().map(function(r, ri) {
                return h('div', { key: ri, style: { padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 6 } },
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', marginBottom: 4 } }, r.date),
                  h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, r.text)
                );
              })
            ) : h('div', { style: { padding: 10, fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, 'No past responses to this question yet.'),
            softPointer()
          );
        }

        // Grid view
        var themes = {};
        QUERIES.forEach(function(q) {
          themes[q.theme] = themes[q.theme] || { label: q.themeLabel, color: q.themeColor, queries: [] };
          themes[q.theme].queries.push(q);
        });

        return h('div', null,
          h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.55 } },
            '📚 All 20 questions. Browse by theme. Click any question to read it or make it your current week\'s focus.'
          ),
          Object.keys(themes).map(function(tkey) {
            var t = themes[tkey];
            return h('div', { key: tkey, style: { marginBottom: 18 } },
              h('div', { style: { fontSize: 12, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, t.label),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 } },
                t.queries.map(function(q) {
                  var hasResponse = (d.responses || []).some(function(r) { return r.queryId === q.id; });
                  return h('button', { key: q.id, onClick: function() { setQQ({ browseId: q.id }); },
                    style: { padding: 12, borderRadius: 8, border: '1px solid ' + t.color + '44', background: '#0f172a', cursor: 'pointer', textAlign: 'left', color: '#e2e8f0' } },
                    h('div', { style: { fontSize: 10, color: t.color, fontWeight: 700, marginBottom: 4 } }, hasResponse ? '✓ Visited' : 'Unvisited'),
                    h('div', { style: { fontSize: 12.5, lineHeight: 1.55, fontStyle: 'italic' } }, q.text)
                  );
                })
              )
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════
      // MY PRACTICE — all past responses, dated, deletable
      // ═══════════════════════════════════════════════════════
      function renderPractice() {
        var responses = (d.responses || []).slice();
        if (responses.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 24, borderRadius: 10, background: '#0f172a', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '🌒'),
              h('div', { style: { color: '#94a3b8', fontSize: 14, marginBottom: 4 } }, 'No saved responses yet.'),
              h('div', { style: { color: '#64748b', fontSize: 12 } }, 'Sit with this week\'s question. Write when something arrives.')
            )
          );
        }
        // Sort newest first
        responses.sort(function(a, b) { return a.date < b.date ? 1 : -1; });

        function deleteResp(idx) {
          var all = d.responses.slice();
          // Find original index based on date+text+queryId match
          var target = responses[idx];
          var origIdx = all.findIndex(function(r) { return r.date === target.date && r.text === target.text && r.queryId === target.queryId; });
          if (origIdx >= 0) all.splice(origIdx, 1);
          setQQ({ responses: all });
        }

        return h('div', null,
          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, responses.length + ' response' + (responses.length === 1 ? '' : 's')),
          responses.map(function(r, ri) {
            var q = QUERIES.find(function(qq) { return qq.id === r.queryId; }) || { themeLabel: '', themeColor: '#64748b', text: '(question not found)' };
            return h('div', { key: ri, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + q.themeColor, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 10, color: q.themeColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, q.themeLabel),
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' } }, r.date),
                h('button', { onClick: function() { deleteResp(ri); }, 'aria-label': 'Delete response',
                  style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              ),
              h('p', { style: { margin: '0 0 8px', color: '#e9d5ff', fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.5 } }, '“' + q.text + '”'),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, r.text),
              r.shareWithCrew && r.crewVersion ? h('div', { style: { marginTop: 8, padding: 6, background: 'rgba(22,163,74,0.10)', borderLeft: '2px solid #22c55e', borderRadius: 4, fontSize: 11.5, color: '#bbf7d0' } },
                h('strong', { style: { color: '#22c55e' } }, '🤝 Crew version: '), r.crewVersion
              ) : null
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════
      // ABOUT — frame the practice + lineage
      // ═══════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'What this practice is'),
            h('p', { style: { margin: '0 0 8px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A single open-ended question, sat with for a week. You can write about it. You can talk to a friend about it. You can let it follow you around without doing anything in particular with it. The point is that good questions work on us slowly. Trying to answer them quickly is the opposite of the practice.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'There are no right answers. You will probably notice that the same question lands differently in different weeks, depending on what is going on in your life. That is the practice working.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'What this practice is NOT'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.8 } },
              h('li', null, 'It is not a journaling assignment. You can skip writing entirely if you want.'),
              h('li', null, 'It is not therapy. If a question stirs something heavy, that is information; bring it to a counselor or trusted adult.'),
              h('li', null, 'It is not religious. The lineage of "queries" is Quaker, but the practice has been adapted across many secular traditions.'),
              h('li', null, 'It is not graded. There are no right answers; even a "no thanks, not today" is a valid response to a question.')
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#c4b5fd', fontSize: 16 } }, 'Lineage of the practice'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The "query" form comes from the Religious Society of Friends (Quakers), where queries are open-ended questions read aloud in worship as prompts for reflection rather than as items to be answered. The practice of sitting with one question across a stretch of time appears across many wisdom traditions: Zen koans, Sufi questioning, Indigenous storywork, secular contemplative inquiry (Mary Oliver, Rilke, Wendell Berry, bell hooks). This tool draws on the FORM of the practice without claiming a specific religious or cultural authority.'
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Quaker queries are typically used in Crew-time and faculty meetings as conversation prompts. A simple Crew protocol: read the week\'s query aloud, three minutes of silent reflection, then pair-share for 90 seconds, then opening to the full Crew with a "no fixing, no judging" norm. Students who shared a Crew-version of their response in the tool can offer it; students who did not should not be asked to.'
          ),

          softPointer()
        );
      }

      // ── Root ──
      var body;
      if (view === 'all') body = renderAll();
      else if (view === 'practice') body = renderPractice();
      else if (view === 'about') body = renderAbout();
      else body = renderThisWeek();

      return h('div', { style: { maxWidth: 820, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Quiet Questions' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
