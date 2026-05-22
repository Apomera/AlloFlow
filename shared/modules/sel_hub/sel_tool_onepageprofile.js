// ═══════════════════════════════════════════════════════════════
// sel_tool_onepageprofile.js — One-Page Profile
// A portable, printable, person-centered planning artifact built on
// the Helen Sanderson Associates (UK) format. Three sections:
//   1. What people like and admire about me
//   2. What is important to me
//   3. How best to support me
// Used in IEPs, 504s, transition meetings, substitute-teacher
// handoffs, and Crew introductions. Designed to be printable as a
// single page that a student can carry, share, or hang in a binder.
// Registered tool ID: "onePageProfile"
// Category: self-direction
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('onePageProfile'))) {
(function() {
  'use strict';

  // WCAG 4.1.3: live region
  (function() {
    if (document.getElementById('allo-live-onepageprofile')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-onepageprofile';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ─── Emoji "photo" choices (privacy-friendly substitute for a photo) ───
  var PHOTO_EMOJIS = ['🧑', '👧', '👦', '🧒', '👩', '👨', '🧑‍🦰', '🧑‍🦱', '🧑‍🦲', '🧑‍🦳',
                      '🦊', '🐻', '🐼', '🦉', '🦅', '🐢', '🐙', '🌟', '🌙', '🌈',
                      '🎨', '🎸', '⚽', '🏀', '📚', '🎮', '🎭', '🚀', '🌲', '🌊'];

  // ─── Section starters (suggestions the student can use or ignore) ───
  var STARTERS = {
    likeAdmire: [
      'My sense of humor',
      'How loyal I am to people I care about',
      'I am a really good listener',
      'I show up for my friends',
      'I am curious about things most people do not notice',
      'I do not give up easily',
      'I am honest, even when it is hard',
      'I make people feel welcome',
      'I think about how things work',
      'I am kind to animals'
    ],
    important: [
      'My family and the people I live with',
      'My best friends and the time we spend together',
      'Time alone to recharge',
      'My pets',
      'Knowing what is going to happen ahead of time',
      'Being respected, not talked over',
      'Music, headphones, my own playlist',
      'A quiet place to go when things get loud',
      'My faith / my culture / my traditions',
      'Sports, art, gaming, the thing I love doing',
      'Food I actually like at lunch',
      'Being trusted to do things my own way'
    ],
    howToSupport: [
      'Give me clear directions, one step at a time',
      'Let me know about changes ahead of time when you can',
      'If I am quiet, I am thinking, not refusing',
      'Check in with me privately, not in front of the class',
      'Let me use my fidget / headphones / standing desk',
      'I do better with written instructions I can refer back to',
      'I need a few minutes to transition between activities',
      'If I am upset, give me space first, then talk',
      'Praise me quietly, not in front of everyone',
      'Trust me to ask for help when I need it',
      'If I am stuck, ask what I have tried, do not just tell me the answer'
    ]
  };

  function defaultState() {
    return {
      view: 'profile',                    // 'profile' | 'edit' | 'print' | 'about'
      name: '',
      photoEmoji: '🌟',
      likeAdmire: [],                     // array of strings
      important: [],
      howToSupport: [],
      gradeLevel: '',
      pronouns: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ─── Tool registration ───
  window.SelHub.registerTool('onePageProfile', {
    icon: '📄',
    label: 'One-Page Profile',
    desc: 'Person-centered profile that fits on one page. Three sections: what people like and admire about me, what is important to me, how best to support me. Printable artifact for IEP meetings, transitions, substitute teachers, or a Crew introduction. Based on the Helen Sanderson Associates format used across UK and US person-centered planning.',
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

      var d = labToolData.onePageProfile || defaultState();
      function setOPP(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.onePageProfile) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.likeAdmire || patch.important || patch.howToSupport ||
              patch.name !== undefined || patch.photoEmoji || patch.gradeLevel !== undefined || patch.pronouns !== undefined) {
            next.lastUpdated = todayISO();
          }
          return Object.assign({}, prev, { onePageProfile: next });
        });
      }
      var view = d.view || 'profile';
      function goto(v) { setOPP({ view: v }); }
      function printNow() { try { window.print(); } catch (e) { /* print not available */ } }

      // ── Header ──
      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '📄 One-Page Profile'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A portable, person-centered profile that fits on one page.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'profile', label: 'My profile', icon: '📄' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'One-Page Profile sections',
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
          'This is your profile. You decide what goes on it and who sees it. The Crisis Companion is in this same SEL Hub if you need it; Crisis Text Line: text HOME to 741741.'
        );
      }

      function isEmpty() {
        return (d.likeAdmire || []).length === 0 &&
               (d.important || []).length === 0 &&
               (d.howToSupport || []).length === 0;
      }

      // ═══════════════════════════════════════════════════════════
      // PROFILE — the assembled view (read-only summary)
      // ═══════════════════════════════════════════════════════════
      function renderProfile() {
        if (isEmpty() && !d.name) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(129,140,248,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '📄'),
              h('h3', { style: { margin: '0 0 8px', color: '#e0e7ff', fontSize: 18 } }, 'Your profile is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'A One-Page Profile is three things people who work with you should know in order to support you well. It is not a list of diagnoses, scores, or things wrong with you. It is what is right with you, what matters to you, and what helps you do your best.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start my profile',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start my profile')
            ),
            softPointer()
          );
        }

        return h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(129,140,248,0.14) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', marginBottom: 14, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 56, lineHeight: 1, padding: 8, borderRadius: 10, background: '#1e293b', border: '1px solid #334155' }, 'aria-label': 'Profile icon' }, d.photoEmoji || '🌟'),
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e0e7ff' } }, d.name || '(your name)'),
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } },
                d.gradeLevel ? ('Grade ' + d.gradeLevel) : '',
                d.gradeLevel && d.pronouns ? ' · ' : '',
                d.pronouns || ''
              ),
              d.lastUpdated ? h('div', { style: { fontSize: 10, color: '#64748b', marginTop: 4, fontFamily: 'ui-monospace, monospace' } }, 'Updated ' + d.lastUpdated) : null
            ),
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit profile',
              style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #818cf8', background: 'rgba(129,140,248,0.18)', color: '#e0e7ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Edit')
          ),

          // Three sections
          renderSection('💛 What people like and admire about me', d.likeAdmire, '#f59e0b'),
          renderSection('⭐ What is important to me', d.important, '#10b981'),
          renderSection('🤝 How best to support me', d.howToSupport, '#6366f1'),

          // Print + Edit
          h('div', { style: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Open printable view',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '🖨 Print or save as PDF'),
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit profile',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '✏️ Edit profile')
          ),

          softPointer()
        );
      }

      function renderSection(title, items, color) {
        return h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 12 } },
          h('div', { style: { fontSize: 12, color: color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 10 } }, title),
          (items && items.length > 0)
            ? h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 14, lineHeight: 1.75 } },
                items.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
              )
            : h('div', { style: { padding: 8, fontSize: 12.5, color: '#64748b', fontStyle: 'italic' } }, '(nothing here yet; click Edit to add)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT — fields + per-section item editors
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        function addItem(sectionKey, value) {
          if (!value || !value.trim()) return;
          var current = (d[sectionKey] || []).slice();
          current.push(value.trim());
          var patch = {};
          patch[sectionKey] = current;
          setOPP(patch);
        }
        function removeItem(sectionKey, idx) {
          var current = (d[sectionKey] || []).slice();
          current.splice(idx, 1);
          var patch = {};
          patch[sectionKey] = current;
          setOPP(patch);
        }
        function moveItem(sectionKey, idx, dir) {
          var current = (d[sectionKey] || []).slice();
          var newIdx = idx + dir;
          if (newIdx < 0 || newIdx >= current.length) return;
          var tmp = current[idx];
          current[idx] = current[newIdx];
          current[newIdx] = tmp;
          var patch = {};
          patch[sectionKey] = current;
          setOPP(patch);
        }

        function sectionEditor(sectionKey, title, color, starters) {
          var inputId = 'opp-input-' + sectionKey;
          var items = d[sectionKey] || [];
          function submitInput() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) return;
            addItem(sectionKey, el.value);
            el.value = '';
            if (announceToSR) announceToSR('Added.');
          }
          function useStarter(s) { addItem(sectionKey, s); if (announceToSR) announceToSR('Added: ' + s); }

          return h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 14 } },
            h('div', { style: { fontSize: 13, color: color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 10 } }, title),
            // Existing items
            items.length > 0 ? h('div', { style: { marginBottom: 12 } },
              items.map(function(item, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4 } },
                  h('span', { style: { flex: 1, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.55 } }, item),
                  h('button', { onClick: function() { moveItem(sectionKey, i, -1); }, 'aria-label': 'Move up', disabled: i === 0,
                    style: { background: 'transparent', border: '1px solid #475569', color: i === 0 ? '#475569' : '#94a3b8', borderRadius: 4, padding: '2px 6px', cursor: i === 0 ? 'not-allowed' : 'pointer', fontSize: 11 } }, '↑'),
                  h('button', { onClick: function() { moveItem(sectionKey, i, 1); }, 'aria-label': 'Move down', disabled: i === items.length - 1,
                    style: { background: 'transparent', border: '1px solid #475569', color: i === items.length - 1 ? '#475569' : '#94a3b8', borderRadius: 4, padding: '2px 6px', cursor: i === items.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11 } }, '↓'),
                  h('button', { onClick: function() { removeItem(sectionKey, i); }, 'aria-label': 'Remove item',
                    style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 } }, '✕')
                );
              })
            ) : null,
            // Add input
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to ' + title),
              h('input', { id: inputId, type: 'text',
                placeholder: 'Type and press Enter, or pick a starter below...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submitInput(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: submitInput, 'aria-label': 'Add item',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            // Starters
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8', userSelect: 'none' } }, 'Need ideas? Tap a starter to add it (you can edit after)'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { useStarter(s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          // Identity block
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 10 } }, '✏️ Who I am'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              h('div', null,
                h('label', { htmlFor: 'opp-name', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'My name'),
                h('input', { id: 'opp-name', type: 'text', value: d.name || '',
                  onChange: function(e) { setOPP({ name: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'opp-grade', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Grade (optional)'),
                h('input', { id: 'opp-grade', type: 'text', value: d.gradeLevel || '',
                  placeholder: 'e.g. 7',
                  onChange: function(e) { setOPP({ gradeLevel: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'opp-pronouns', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Pronouns (optional)'),
                h('input', { id: 'opp-pronouns', type: 'text', value: d.pronouns || '',
                  placeholder: 'e.g. she/her, they/them',
                  onChange: function(e) { setOPP({ pronouns: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              )
            ),
            // Photo emoji picker
            h('div', { style: { marginTop: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'Pick an icon (instead of a photo)'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                PHOTO_EMOJIS.map(function(em) {
                  var active = d.photoEmoji === em;
                  return h('button', { key: em, onClick: function() { setOPP({ photoEmoji: em }); }, 'aria-label': 'Choose icon ' + em, 'aria-pressed': active,
                    style: { padding: 6, borderRadius: 6, border: '1px solid ' + (active ? '#818cf8' : '#334155'), background: active ? 'rgba(129,140,248,0.2)' : '#1e293b', cursor: 'pointer', fontSize: 22 } }, em);
                })
              )
            )
          ),

          sectionEditor('likeAdmire', '💛 What people like and admire about me', '#f59e0b', STARTERS.likeAdmire),
          sectionEditor('important', '⭐ What is important to me', '#10b981', STARTERS.important),
          sectionEditor('howToSupport', '🤝 How best to support me', '#6366f1', STARTERS.howToSupport),

          h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(129,140,248,0.1)', borderTop: '1px solid rgba(129,140,248,0.3)', borderRight: '1px solid rgba(129,140,248,0.3)', borderBottom: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6, marginBottom: 12 } },
            h('strong', null, '💡 Tip: '),
            'A One-Page Profile works best when it is updated once or twice a year. What you needed in 6th grade is not what you need in 9th. Keep this one current; print fresh copies when you change supports.'
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('profile'); }, 'aria-label': 'See my profile',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '👁 See my profile'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Open print view',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print view')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — clean printable artifact (1 page)
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          // Print toolbar (hidden in print)
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(129,140,248,0.10)', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'This is what your profile looks like printed. Use your browser\'s print dialog (Print or Save as PDF).'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('profile'); }, 'aria-label': 'Back to profile',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'onepageprofile-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            // Print CSS
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#onepageprofile-print-region, #onepageprofile-print-region * { visibility: visible !important; } ' +
              '#onepageprofile-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            // Header
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 14, marginBottom: 18, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 56, lineHeight: 1, padding: 4 } }, d.photoEmoji || '🌟'),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'One-Page Profile'),
                h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900, color: '#0f172a' } }, d.name || '(your name)'),
                h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } },
                  d.gradeLevel ? ('Grade ' + d.gradeLevel) : '',
                  d.gradeLevel && d.pronouns ? '  ·  ' : '',
                  d.pronouns || '',
                  (d.gradeLevel || d.pronouns) && d.lastUpdated ? '  ·  ' : '',
                  d.lastUpdated ? ('Updated ' + d.lastUpdated) : ''
                )
              )
            ),

            // Three sections in print layout
            printSection('What people like and admire about me', d.likeAdmire, '#f59e0b'),
            printSection('What is important to me', d.important, '#10b981'),
            printSection('How best to support me', d.howToSupport, '#4f46e5'),

            // Print footer
            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Format adapted from the Helen Sanderson Associates One-Page Profile (helensandersonassociates.co.uk). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      function printSection(title, items, color) {
        return h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fff', background: color, padding: '6px 12px', borderRadius: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, title),
          (items && items.length > 0)
            ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.65 } },
                items.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
              )
            : h('div', { style: { padding: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '(not filled in)')
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT — Sanderson lineage + sources + honest limits
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('onePageProfile', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A One-Page Profile is a portable, person-centered description of you. It is built around three questions that have become standard in person-centered planning: what do people like and admire about you, what is important to you, and how do people best support you.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The point is that the people who work with you should not have to discover your supports by trial and error. You can hand them a profile. It is yours, you write it, you decide who sees it.'
            )
          ),

          // Lineage
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'Where the format comes from'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The One-Page Profile format was developed by Helen Sanderson and Helen Sanderson Associates in the United Kingdom, growing out of the broader person-centered planning movement (PATH, MAPS, Essential Lifestyle Planning). It is now used across the UK National Health Service, in US schools as part of IEP and 504 documentation, in supported-living services, and in family-led planning.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The three-question structure is intentional: it refuses the deficit-first framing that dominates clinical reports. A clinical report begins with what is wrong. A One-Page Profile begins with what is right. Both have a place, but a profile travels with you in ways a report cannot.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources you can use to verify the evidence base for this tool, or to learn more.'),
            sourceCard('Helen Sanderson Associates', 'helensandersonassociates.co.uk', 'The original developers of the One-Page Profile format. Free templates, training materials, examples across age groups, and the ongoing research base.', 'https://helensandersonassociates.co.uk/'),
            sourceCard('Sanderson, H. (2000)', 'Person-Centred Planning: Key Features and Approaches', 'Foundational text on person-centered planning practice in the UK. Establishes the conceptual frame the One-Page Profile sits inside.', null),
            sourceCard('Sanderson, H. and Goodwin, G. (2014)', 'The Future of Person-Centred Planning', 'Updates the early work with two decades of practice; discusses how profiles travel across systems (school, health, social care).', null),
            sourceCard('Personalising Education', 'personalisingeducation.org', 'Practical guidance on using One-Page Profiles in schools, including pupil-led, family-led, and teacher-supported versions. School-focused resources.', 'https://www.personalisingeducation.org/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits of this format'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A profile is only as good as the trust around it. If a student writes "I need quiet" and a teacher reads it as defiance, the format did not fail; the relationship did.'),
              h('li', null, 'Profiles can flatten. A single page can not capture everything; what is left off matters as much as what is on. Update it as you change.'),
              h('li', null, 'The profile does not replace the legal documents (IEP, 504, behavior plan). It complements them with the voice of the person they are about.'),
              h('li', null, 'Person-centered does not mean person-blamed. If supports listed here are not provided, that is the system\'s job to fix, not yours.')
            )
          ),

          // For educators
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', borderTop: '1px solid rgba(129,140,248,0.3)', borderRight: '1px solid rgba(129,140,248,0.3)', borderBottom: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'One-Page Profiles work well as a beginning-of-year Crew activity, attached to the front of an IEP at-a-glance, given to a substitute teacher, or shared at family conferences. The student keeps editorial control; faculty support but do not author. For students with significant communication differences, profiles can be built collaboratively with family, using "what we see" framing rather than "what they said."'
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

      // ── Root ──
      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderProfile();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'One-Page Profile' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
