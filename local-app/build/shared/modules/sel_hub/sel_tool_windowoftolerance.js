// ═══════════════════════════════════════════════════════════════
// sel_tool_windowoftolerance.js — Window of Tolerance
// Trauma-informed visual developed by Dan Siegel (1999). Three
// arousal zones: hyperarousal (above the window), window of
// tolerance (the regulated zone), and hypoarousal (below). The
// student maps their own personal signs of each zone, their
// triggers, and the practices that bring them back into the window.
// Registered tool ID: "windowOfTolerance"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('windowOfTolerance'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-wot')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-wot';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Suggested starters for each zone (the student picks, adds, edits)
  var STARTERS = {
    hyper: [
      'Heart racing or pounding',
      'Hard to sit still, pacing, leg bouncing',
      'Quick to anger or snap',
      'Talking fast, talking over people',
      'Thoughts racing, cannot focus',
      'Hyper-alert, scanning the room',
      'Sweating, hot face, shaky hands',
      'Feeling like I might explode'
    ],
    window: [
      'Breathing is easy',
      'I can listen to what someone is saying',
      'I can feel my body and my emotions',
      'I can think AND feel at the same time',
      'I am curious about things',
      'I can choose my next move',
      'I notice things around me',
      'I feel like myself'
    ],
    hypo: [
      'Foggy, slow to respond',
      'Disconnected from my body, floaty',
      'Numb, cannot really feel emotions',
      'Sleepy or wanting to shut down',
      'Hard to make eye contact',
      'My voice gets quiet or disappears',
      'Going through the motions, autopilot',
      'Feeling far away or behind glass'
    ],
    triggers: [
      'Loud unexpected noises',
      'Being called on without warning',
      'Group projects with people I do not trust',
      'Crowded hallways between classes',
      'Conflicts at home',
      'Not enough sleep',
      'A particular person\'s tone or face',
      'Texts I have not answered piling up',
      'Hunger, low blood sugar',
      'Sensory overload (lights, smells, fabric)',
      'Time pressure / not enough time'
    ],
    practices: [
      'Step outside, look at the sky for 30 seconds',
      'Cold water on my wrists or face',
      'Slow breathing: in for 4, out for 6',
      'Hum or sing a low note',
      'Push against a wall, isometric tension',
      'Wrap myself in a heavy blanket',
      'Text someone safe',
      '5-4-3-2-1 grounding (5 see, 4 hear, 3 touch, 2 smell, 1 taste)',
      'Walk somewhere, anywhere',
      'Take off my shoes, feel my feet',
      'Drink a full glass of water',
      'Eat a small snack',
      'Listen to my song',
      'Pet my dog / cat',
      'Step into the bathroom for 2 minutes'
    ]
  };

  function defaultState() {
    return {
      view: 'window',
      hyperSigns: [],
      windowSigns: [],
      hypoSigns: [],
      triggers: [],
      practices: [],
      currentZone: null,        // optional today's check-in
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('windowOfTolerance', {
    icon: '🪟',
    label: 'Window of Tolerance',
    desc: 'Trauma-informed self-awareness visual. Three arousal zones: hyperarousal (too activated), window of tolerance (the regulated zone), and hypoarousal (shut down). Map your own personal signs of each zone, your triggers, and the practices that bring you back. Based on Dan Siegel\'s work (1999); standard tool in trauma-informed schools.',
    color: 'teal',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.windowOfTolerance || defaultState();
      function setWOT(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.windowOfTolerance) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.hyperSigns || patch.windowSigns || patch.hypoSigns || patch.triggers || patch.practices) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { windowOfTolerance: next });
        });
      }
      var view = d.view || 'window';
      function goto(v) { setWOT({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#5eead4', fontSize: 22, fontWeight: 900 } }, '🪟 Window of Tolerance'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A map of your three arousal zones and what brings you back to the window.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'window', label: 'My Window', icon: '🪟' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'checkin', label: 'Check in', icon: '📍' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Window of Tolerance sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#14b8a6' : '#334155'),
                background: active ? 'rgba(20,184,166,0.18)' : '#1e293b',
                color: active ? '#99f6e4' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Knowing your zones helps you self-regulate; it does not replace adults who can help. If you find yourself stuck outside your window often, that is worth bringing to a counselor or school psych. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // WINDOW — main visualization
      // ═══════════════════════════════════════════════════════════
      function renderWindow() {
        function zone(label, color, signs, blurb) {
          return h('div', { style: { padding: 14, borderRadius: 10, background: color + '14', border: '1px solid ' + color + '66', borderLeft: '4px solid ' + color, marginBottom: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 } }, label)
            ),
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 } }, blurb),
            signs.length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  signs.map(function(s, i) {
                    return h('div', { key: i, style: { padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid ' + color + '44', fontSize: 12, color: '#e2e8f0' } }, s);
                  })
                )
              : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(no signs added yet)')
          );
        }

        var totalSigns = (d.hyperSigns || []).length + (d.windowSigns || []).length + (d.hypoSigns || []).length;
        if (totalSigns === 0 && (d.triggers || []).length === 0 && (d.practices || []).length === 0) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(20,184,166,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🪟'),
              h('h3', { style: { margin: '0 0 8px', color: '#99f6e4', fontSize: 18 } }, 'Your Window is empty'),
              h('p', { style: { margin: '0 0 14px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
                'The Window of Tolerance is your body and brain\'s "regulated" zone. Above it: too activated (heart racing, snappy, overwhelmed). Below it: too shut down (foggy, numb, going through motions). Your personal signs of each zone are uniquely yours. Build the map.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start building my Window',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
                '+ Start building my Window')
            ),
            softPointer()
          );
        }

        return h('div', null,
          zone('🔺 Hyperarousal (above the window)', '#ef4444', d.hyperSigns || [],
            'Too activated. Fight or flight territory. Hard to think, hard to sit still, snappy, racing.'),

          zone('🪟 In the Window (the regulated zone)', '#14b8a6', d.windowSigns || [],
            'The zone where you can think and feel at the same time. You can listen, choose, learn, connect.'),

          zone('🔻 Hypoarousal (below the window)', '#0ea5e9', d.hypoSigns || [],
            'Too shut down. Freeze or collapse territory. Foggy, slow, disconnected, going through motions.'),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginTop: 10, marginBottom: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '⚡ Things that push me out of the window'),
            (d.triggers || []).length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  d.triggers.map(function(s, i) {
                    return h('div', { key: i, style: { padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid #fbbf2444', fontSize: 12, color: '#e2e8f0' } }, s);
                  })
                )
              : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(no triggers added yet)')
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a78bfa', marginBottom: 8 } }, '🛟 Things that bring me back to the window'),
            (d.practices || []).length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  d.practices.map(function(s, i) {
                    return h('div', { key: i, style: { padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid #a78bfa44', fontSize: 12, color: '#e2e8f0' } }, s);
                  })
                )
              : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(no practices added yet)')
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit my Window',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '✏️ Edit'),
            h('button', { onClick: function() { goto('checkin'); }, 'aria-label': 'Check in on my zone right now',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '📍 Check in'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        function addTo(key, value) {
          if (!value || !value.trim()) return;
          var list = (d[key] || []).slice();
          if (list.indexOf(value.trim()) === -1) list.push(value.trim());
          var patch = {}; patch[key] = list;
          setWOT(patch);
        }
        function removeFrom(key, idx) {
          var list = (d[key] || []).slice();
          list.splice(idx, 1);
          var patch = {}; patch[key] = list;
          setWOT(patch);
        }

        function listEditor(key, title, color, starters, blurb) {
          var items = d[key] || [];
          var inputId = 'wot-input-' + key;
          function submit() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) return;
            addTo(key, el.value);
            el.value = '';
          }
          return h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 12 } },
            h('div', { style: { fontSize: 13, color: color, fontWeight: 800, marginBottom: 6 } }, title),
            h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),

            items.length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                  items.map(function(s, i) {
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: '#1e293b', border: '1px solid ' + color + '44', fontSize: 12, color: '#e2e8f0' } },
                      h('span', null, s),
                      h('button', { onClick: function() { removeFrom(key, i); }, 'aria-label': 'Remove ' + s,
                        style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: 0 } }, '✕')
                    );
                  })
                )
              : null,

            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: inputId, className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to ' + title),
              h('input', { id: inputId, type: 'text',
                placeholder: 'Type and press Enter, or pick a starter below...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),

            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8', userSelect: 'none' } }, 'Need ideas? Tap a starter to add (you can edit after)'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addTo(key, s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          listEditor('hyperSigns', '🔺 My hyperarousal signs', '#ef4444', STARTERS.hyper, 'Your personal signs that you are too activated. What does too-activated look like in YOU? Body, thoughts, behavior.'),
          listEditor('windowSigns', '🪟 My in-the-window signs', '#14b8a6', STARTERS.window, 'How you know you are in the regulated zone. What does "okay" actually feel like for you? Be specific.'),
          listEditor('hypoSigns', '🔻 My hypoarousal signs', '#0ea5e9', STARTERS.hypo, 'Your personal signs that you are shut down. What does shut-down look like in YOU? Body, mood, behavior.'),
          listEditor('triggers', '⚡ Things that push me out of the window', '#fbbf24', STARTERS.triggers, 'What tends to push you up into hyper or down into hypo? Honest specifics help; vague generalities do not.'),
          listEditor('practices', '🛟 Things that bring me back', '#a78bfa', STARTERS.practices, 'The actual moves that work for you. Not what should work or what someone said works; what really does. If something works for you that is not on the starter list, add it.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CHECK IN — today's zone
      // ═══════════════════════════════════════════════════════════
      function renderCheckin() {
        function setZone(z) { setWOT({ currentZone: z }); }
        var cur = d.currentZone;

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: '#99f6e4', marginBottom: 8 } }, '📍 Right now, where am I?'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('button', { onClick: function() { setZone('hyper'); }, 'aria-label': 'I am hyperaroused right now',
                style: { padding: 14, borderRadius: 10, border: '2px solid ' + (cur === 'hyper' ? '#ef4444' : '#334155'), background: cur === 'hyper' ? 'rgba(239,68,68,0.18)' : '#1e293b', color: '#fecaca', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 4 } }, '🔺 Hyperarousal — too activated'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, 'Heart racing, snappy, can\'t sit still, racing thoughts, overwhelmed.')
              ),
              h('button', { onClick: function() { setZone('window'); }, 'aria-label': 'I am in the window right now',
                style: { padding: 14, borderRadius: 10, border: '2px solid ' + (cur === 'window' ? '#14b8a6' : '#334155'), background: cur === 'window' ? 'rgba(20,184,166,0.18)' : '#1e293b', color: '#99f6e4', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#14b8a6', marginBottom: 4 } }, '🪟 In the window — regulated'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, 'I can think and feel. I can listen, choose, connect.')
              ),
              h('button', { onClick: function() { setZone('hypo'); }, 'aria-label': 'I am hypoaroused right now',
                style: { padding: 14, borderRadius: 10, border: '2px solid ' + (cur === 'hypo' ? '#0ea5e9' : '#334155'), background: cur === 'hypo' ? 'rgba(14,165,233,0.18)' : '#1e293b', color: '#bae6fd', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#0ea5e9', marginBottom: 4 } }, '🔻 Hypoarousal — too shut down'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, 'Foggy, numb, slow, going through motions, far away.')
              )
            )
          ),

          // Show triggers + practices if outside the window
          cur && cur !== 'window' ? h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a78bfa', marginBottom: 8 } }, '🛟 Things that bring me back to the window'),
              (d.practices || []).length > 0
                ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                    d.practices.map(function(s, i) {
                      return h('div', { key: i, style: { padding: '6px 12px', borderRadius: 14, background: 'rgba(167,139,250,0.18)', border: '1px solid #a78bfa', fontSize: 12.5, color: '#e9d5ff', fontWeight: 700 } }, s);
                    })
                  )
                : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } },
                    'You have not added practices yet. ',
                    h('button', { onClick: function() { goto('edit'); }, style: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 } }, 'Add some.'))
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.6 } },
              'Pick ONE practice. Do it. Notice if your zone shifts at all. You do not have to be back in the window in three minutes; sometimes it takes longer, sometimes you need a person, not just a practice. That is okay.'
            )
          ) : null,

          cur === 'window' ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.10)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', fontSize: 13, color: '#99f6e4', lineHeight: 1.65 } },
            h('strong', null, '🪟 You are in the window. '),
            'Good. Notice what it feels like, in your body, right now. The more you know your own "in-window" signs, the easier it is to tell when you are drifting out.'
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        function listBlock(title, color, list) {
          return h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 6, background: color, color: '#fff' } },
              h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, title)
            ),
            list && list.length > 0
              ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.65 } },
                  list.map(function(s, i) { return h('li', { key: i }, s); }))
              : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', paddingLeft: 10 } }, '(not filled in)')
          );
        }

        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(20,184,166,0.10)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#99f6e4', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('window'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'wot-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#wot-print-region, #wot-print-region * { visibility: visible !important; } ' +
              '#wot-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0d9488' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Window of Tolerance'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Window of Tolerance'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            listBlock('Hyperarousal signs (above the window)', '#ef4444', d.hyperSigns),
            listBlock('In-the-window signs (regulated)', '#0d9488', d.windowSigns),
            listBlock('Hypoarousal signs (below the window)', '#0ea5e9', d.hypoSigns),
            listBlock('Things that push me out of the window', '#d97706', d.triggers),
            listBlock('Things that bring me back', '#7c3aed', d.practices),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Window of Tolerance framework from Siegel, D. J. (1999), The Developing Mind, Guilford Press. ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('windowOfTolerance', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, 'What the Window of Tolerance is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The Window of Tolerance is a model of arousal: the range within which a person can think and feel at the same time, take in information, make choices, and connect with other people. Above the window is hyperarousal: the body is too activated, the nervous system is in fight or flight, thinking gets impaired. Below the window is hypoarousal: the body has shut down, freeze or collapse, things feel far away or numb.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The point of the model is that being outside the window is not a moral failure; it is a nervous-system response. The work is to know your own zones, know what pushes you out, and know what brings you back. The more you know, the more agency you have.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, 'Where the model comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The Window of Tolerance was developed by Dr. Dan Siegel and presented in his 1999 book The Developing Mind. Siegel is a psychiatrist and one of the founders of the field of Interpersonal Neurobiology. The Window has become standard vocabulary in trauma-informed schools, clinical mental health, sensorimotor and somatic therapies, and the National Child Traumatic Stress Network. It is one of the most widely used self-regulation models in the field.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#5eead4', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the Window of Tolerance.'),
            sourceCard('Siegel, D. J. (1999)', 'The Developing Mind: How Relationships and the Brain Interact to Shape Who We Are, Guilford Press', 'The original presentation of the Window of Tolerance and the founding text of Interpersonal Neurobiology.', null),
            sourceCard('Siegel, D. J. (2012)', 'Pocket Guide to Interpersonal Neurobiology: An Integrative Handbook of the Mind, W. W. Norton', 'Accessible synthesis of the Window of Tolerance and related concepts. Good practitioner reference.', null),
            sourceCard('Ogden, P., Minton, K., and Pain, C. (2006)', 'Trauma and the Body: A Sensorimotor Approach to Psychotherapy, W. W. Norton', 'Sensorimotor Psychotherapy text that operationalized the Window for trauma practice. Heavily cited.', null),
            sourceCard('The Mindsight Institute', 'mindsightinstitute.com', 'Siegel\'s training organization. Free articles and videos explaining the Window and related models.', 'https://www.mindsightinstitute.com/'),
            sourceCard('National Child Traumatic Stress Network (NCTSN)', 'nctsn.org', 'NCTSN uses the Window of Tolerance widely in trauma-informed school resources. Free practitioner materials.', 'https://www.nctsn.org/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The Window of Tolerance is a useful metaphor and a clinical-practice anchor. It is NOT the same kind of empirical model as, say, the Glasgow Coma Scale; the boundaries are heuristic, not measured. Useful for self-knowledge, not for clinical diagnosis.'),
              h('li', null, 'Some critique: in the wider trauma-therapy world, "Window of Tolerance" is often combined with polyvagal theory talk (ventral/dorsal/sympathetic). Polyvagal theory itself is contested in neuroscience (Grossman 2007, 2023). The Window can be used standalone without polyvagal theory; this tool does so.'),
              h('li', null, 'Knowing your zones helps you respond to your nervous system. It does not fix the situations that keep pushing you out of the window. If you are out of the window every day at the same time because of something happening in your life, the model can help you cope, but it cannot fix the source.'),
              h('li', null, 'For students with significant trauma, mapping the Window can itself be activating. Doing it with a counselor present, especially the first time, is generally safer than doing it alone.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(20,184,166,0.10)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', fontSize: 12.5, color: '#99f6e4', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The Window of Tolerance is a vocabulary that can transform a classroom. A teacher who can name a student\'s zone ("I notice you\'re out of your window right now; what helps?") is doing trauma-informed practice. The vocabulary becomes useful only after students have personally built their own Window; do not impose the language without the personal work.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#5eead4', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#99f6e4', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#99f6e4', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'checkin') body = renderCheckin();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderWindow();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Window of Tolerance' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
