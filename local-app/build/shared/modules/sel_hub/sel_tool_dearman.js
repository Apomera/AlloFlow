// ═══════════════════════════════════════════════════════════════
// sel_tool_dearman.js — DEAR MAN: assertive-ask script builder
// The DBT Interpersonal Effectiveness skill for making a request
// or saying no clearly. Linehan's mnemonic:
//   D - Describe the situation factually
//   E - Express your feelings using "I" statements
//   A - Assert what you want (clearly)
//   R - Reinforce (name the positive outcome for the other person)
//   M - Mindful (stay focused; broken-record technique)
//   A - Appear confident (body language, voice)
//   N - Negotiate (be willing to compromise)
//
// Plus optional modifiers GIVE (relationship-preserving) and FAST
// (self-respect-preserving), surfaced inside About.
//
// Registered tool ID: "dearMan"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('dearMan'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-dearman')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-dearman';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The 7 letters of DEAR MAN, each with prompt + example
  var LETTERS = [
    { id: 'describe',  letter: 'D', label: 'Describe',
      blurb: 'Describe the situation FACTUALLY. No judgments. Just what happened.',
      example: 'Yesterday after practice, when I asked for help with the warm-up routine, you said no twice and walked away.',
      prompt: 'In one or two sentences, what is the factual situation?',
      color: '#0ea5e9'
    },
    { id: 'express',   letter: 'E', label: 'Express',
      blurb: 'Express your feelings or opinions using "I" statements. Do NOT assume the other person already knows.',
      example: 'I felt embarrassed and confused, because the rest of the team was watching.',
      prompt: 'In one sentence: what are you feeling, and why?',
      color: '#a855f7'
    },
    { id: 'assert',    letter: 'A', label: 'Assert',
      blurb: 'Say clearly what you want or do not want. Specific, concrete, doable. Not a hint.',
      example: 'I am asking you to show me the warm-up routine once before next practice.',
      prompt: 'What specifically are you asking for, or saying no to?',
      color: '#22c55e'
    },
    { id: 'reinforce', letter: 'R', label: 'Reinforce',
      blurb: 'Reinforce: name the positive outcome for the OTHER person if they say yes. Make it easier for them.',
      example: 'If I know the warm-up I will not slow the whole team down and you will not have to keep correcting me.',
      prompt: 'What is in it for the other person if they agree?',
      color: '#f59e0b'
    },
    { id: 'mindful',   letter: 'M', label: 'Mindful',
      blurb: 'Stay focused. If they try to change the subject, attack, or distract, calmly come back to your ask (broken record).',
      example: 'I hear that you are busy. I am asking you to show me the warm-up once before practice.',
      prompt: 'What is your broken-record phrase if they try to derail?',
      color: '#ec4899'
    },
    { id: 'appear',    letter: 'A', label: 'Appear confident',
      blurb: 'Body language: stand or sit straight, eye contact, steady voice. Do not apologize for asking.',
      example: '(Practice: deep breath, shoulders down, look at them, not at your shoes.)',
      prompt: 'What is one specific body-language move you will use?',
      color: '#14b8a6'
    },
    { id: 'negotiate', letter: 'N', label: 'Negotiate',
      blurb: 'Be willing to bend on HOW, not on the core ask. Offer alternatives. "Turn the tables": ask THEM what they think would work.',
      example: 'If now is not good, would tomorrow before practice work? Or could you have one of the seniors show me?',
      prompt: 'What is one alternative you would accept?',
      color: '#6366f1'
    }
  ];

  function defaultState() {
    return {
      view: 'home',
      ask: '',
      audience: '',
      responses: {},      // letterId -> string
      script: '',         // assembled script (auto-built from responses)
      practiceCount: 0,
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('dearMan', {
    icon: '🗣️',
    label: 'DEAR MAN',
    desc: 'Build a script for a hard ask. Walk through the seven DEAR MAN steps from DBT (Linehan): Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate. Assertive communication, not aggressive, not avoidant. The most-used DBT skill in school counseling.',
    color: 'blue',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.dearMan || defaultState();
      function setDM(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.dearMan) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.responses || patch.script !== undefined || patch.ask !== undefined) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { dearMan: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setDM({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#93c5fd', fontSize: 22, fontWeight: 900 } }, '🗣️ DEAR MAN'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A seven-step script for a hard ask.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Build a script', icon: '🗣️' },
          { id: 'script', label: 'My script', icon: '📜' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'DEAR MAN sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#3b82f6' : '#334155'),
                background: active ? 'rgba(59,130,246,0.18)' : '#1e293b',
                color: active ? '#bfdbfe' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'DEAR MAN is a tool for ASKING. It is not a tool for confronting someone who has been abusive or unsafe. For those situations: bring a counselor, school psych, or trusted adult into the conversation. Crisis Text Line: text HOME to 741741.'
        );
      }

      function buildScript() {
        var parts = [];
        LETTERS.forEach(function(L) {
          var v = (d.responses || {})[L.id];
          if (v && v.trim()) parts.push(v.trim());
        });
        return parts.join('  ');
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — guided build
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        function setResponse(id, val) {
          var r = Object.assign({}, (d.responses || {}));
          r[id] = val;
          setDM({ responses: r });
        }

        return h('div', null,
          // The ask in plain language
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #3b82f6', marginBottom: 12 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              h('div', null,
                h('label', { htmlFor: 'dm-ask', style: { display: 'block', fontSize: 11, color: '#93c5fd', fontWeight: 800, marginBottom: 4 } }, 'What am I asking for, in one sentence?'),
                h('input', { id: 'dm-ask', type: 'text', value: d.ask || '',
                  placeholder: 'e.g. I want my mom to let me ride my bike to school.',
                  onChange: function(e) { setDM({ ask: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'dm-audience', style: { display: 'block', fontSize: 11, color: '#93c5fd', fontWeight: 800, marginBottom: 4 } }, 'Who am I asking?'),
                h('input', { id: 'dm-audience', type: 'text', value: d.audience || '',
                  placeholder: 'e.g. Mom, Coach Smith, Mr. Patel',
                  onChange: function(e) { setDM({ audience: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              )
            )
          ),

          // 7 prompt cards
          LETTERS.map(function(L, idx) {
            var v = (d.responses || {})[L.id] || '';
            return h('div', { key: L.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + L.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 22, fontWeight: 900, color: L.color, fontFamily: 'ui-monospace, monospace', minWidth: 28 } }, L.letter),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: L.color } }, L.label),
                h('span', { style: { marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 700 } }, 'Step ' + (idx + 1) + ' / 7')
              ),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.6 } }, L.blurb),
              h('details', { style: { marginBottom: 8 } },
                h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '💡 Example'),
                h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', fontSize: 12, color: '#cbd5e1', marginTop: 6, lineHeight: 1.6, fontStyle: 'italic' } }, '"' + L.example + '"')
              ),
              h('label', { htmlFor: 'dm-' + L.id, style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, L.prompt),
              h('textarea', { id: 'dm-' + L.id, value: v,
                placeholder: 'In your own words...',
                onChange: function(e) { setResponse(L.id, e.target.value); },
                style: { width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' } })
            );
          }),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('script'); }, 'aria-label': 'See my full script',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '📜 See my full script')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SCRIPT — assembled view
      // ═══════════════════════════════════════════════════════════
      function renderScript() {
        var script = buildScript();
        var hasAny = LETTERS.some(function(L) { var v = (d.responses || {})[L.id]; return v && v.trim(); });

        if (!hasAny) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📜'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'No script yet'),
              h('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Fill in the seven steps and your script will assemble here.'),
              h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Build script',
                style: { marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.18)', color: '#bfdbfe', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Build a script')
            )
          );
        }

        function logPractice() {
          setDM({ practiceCount: (d.practiceCount || 0) + 1 });
          if (addToast) addToast('Practice logged. Try it again — it gets easier.', 'success');
        }

        return h('div', null,
          // Context
          h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            d.audience ? h('div', null, h('strong', { style: { color: '#93c5fd' } }, 'Asking: '), d.audience) : null,
            d.ask ? h('div', null, h('strong', { style: { color: '#93c5fd' } }, 'The ask: '), d.ask) : null
          ),

          // Full script
          h('div', { style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(59,130,246,0.4)', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '📜 Your full script'),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, script)
          ),

          // Step-by-step view
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Step-by-step'),
          LETTERS.map(function(L) {
            var v = (d.responses || {})[L.id];
            if (!v || !v.trim()) return null;
            return h('div', { key: L.id, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + L.color, marginBottom: 6 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                h('span', { style: { fontSize: 16, fontWeight: 900, color: L.color, fontFamily: 'ui-monospace, monospace', minWidth: 22 } }, L.letter),
                h('span', { style: { fontSize: 11, color: L.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, L.label)
              ),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.65 } }, v)
            );
          }),

          // Practice prompts
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', marginTop: 12, marginBottom: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bfdbfe', marginBottom: 6 } }, '🪞 Practice before you do it for real'),
            h('div', { style: { fontSize: 12.5, color: '#dbeafe', lineHeight: 1.7 } },
              h('div', null, '• Read your script out loud in private. Hear yourself say it.'),
              h('div', null, '• Practice with a friend, sibling, or stuffed animal playing the other person.'),
              h('div', null, '• Rehearse your "broken record" phrase: what you say if they try to derail.'),
              h('div', null, '• Notice if your voice gets small. Practice it again at full volume.'),
              h('div', null, '• Practice count: ', h('strong', { style: { color: '#bfdbfe' } }, d.practiceCount || 0), '  ',
                h('button', { onClick: logPractice, 'aria-label': 'Log a practice',
                  style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #3b82f6', background: 'transparent', color: '#bfdbfe', cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 4 } }, '+ Practiced once'))
            )
          ),

          h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Edit script',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '✏️ Edit'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print script',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var script = buildScript();
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(59,130,246,0.10)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Print or save as PDF; carry it in your pocket if it helps.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('script'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'dearman-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#dearman-print-region, #dearman-print-region * { visibility: visible !important; } ' +
              '#dearman-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #2563eb' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'DEAR MAN · DBT Assertive Ask'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, d.ask || 'My ask'),
              d.audience ? h('div', { style: { fontSize: 13, color: '#475569', marginTop: 4 } }, 'For: ' + d.audience) : null
            ),

            // Full script first
            script ? h('div', { style: { padding: 14, background: '#dbeafe', borderLeft: '4px solid #2563eb', marginBottom: 18 } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'Full script'),
              h('p', { style: { margin: 0, color: '#0f172a', fontSize: 13.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, script)
            ) : null,

            // Step-by-step breakdown
            LETTERS.map(function(L) {
              var v = (d.responses || {})[L.id];
              if (!v || !v.trim()) return null;
              return h('div', { key: L.id, style: { marginBottom: 12, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 6, background: L.color, color: '#fff' } },
                  h('span', { style: { fontSize: 14, fontWeight: 900, fontFamily: 'ui-monospace, monospace' } }, L.letter),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, L.label)
                ),
                h('p', { style: { margin: '0 8px', color: '#0f172a', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, v)
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'DEAR MAN from Linehan, M. M. (2014), DBT Skills Training Manual (Interpersonal Effectiveness module). ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('dearMan', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, 'What DEAR MAN is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'DEAR MAN is a script for assertive asking. Assertive does NOT mean aggressive: it means clear, direct, and respectful both of you and of the person you are asking. The opposite of assertive is either avoidant (hinting, hoping they figure it out, or just not saying it) or aggressive (demanding, threatening, escalating). DEAR MAN gives you a structure for the middle path.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Each letter is a step: Describe the situation factually, Express your feelings, Assert your ask clearly, Reinforce the positive outcome for them, stay Mindful (do not get derailed), Appear confident (body language and voice), Negotiate (be willing to bend on how, not on the core).'
            )
          ),

          // GIVE and FAST modifiers
          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, 'GIVE and FAST: the two modifiers'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'DEAR MAN focuses on getting the result. DBT offers two companion skills you can layer on:'),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', marginBottom: 8 } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#22c55e', marginBottom: 6 } }, '🤝 GIVE — relationship-preserving'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } },
                h('div', null, h('strong', null, 'G'), 'entle: no attacks, no threats'),
                h('div', null, h('strong', null, 'I'), 'nterested: listen to their side'),
                h('div', null, h('strong', null, 'V'), 'alidate: acknowledge their feelings'),
                h('div', null, h('strong', null, 'E'), 'asy manner: a little humor, no smirk')
              )
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b' } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#a855f7', marginBottom: 6 } }, '⚖️ FAST — self-respect-preserving'),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } },
                h('div', null, h('strong', null, 'F'), 'air: to you AND to them'),
                h('div', null, h('strong', null, 'A'), 'pologies: no over-apologizing for asking'),
                h('div', null, h('strong', null, 'S'), 'tick to values: do not abandon what you actually believe to get the result'),
                h('div', null, h('strong', null, 'T'), 'ruthful: do not exaggerate or invent reasons')
              )
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, 'Where DEAR MAN comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'DEAR MAN is part of the Interpersonal Effectiveness module of Dialectical Behavior Therapy (DBT), developed by Marsha Linehan starting in the 1980s. Linehan developed DBT for people who experience emotion intensely; the Interpersonal Effectiveness skills are designed to help people communicate clearly when emotion makes that hard. DEAR MAN is widely used in school counseling, family therapy, and DBT skills groups; it is probably the single most-taught communication script in clinical mental health right now.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for DEAR MAN and DBT Interpersonal Effectiveness.'),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Manual (2nd ed.), Guilford Press', 'The standard manual; DEAR MAN is in the Interpersonal Effectiveness module.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Handouts and Worksheets (2nd ed.), Guilford Press', 'Practical worksheets including DEAR MAN handouts and the GIVE/FAST modifiers.', null),
            sourceCard('Rathus, J. H. and Miller, A. L. (2015)', 'DBT Skills Manual for Adolescents, Guilford Press', 'Adolescent adaptation of DBT skills, with DEAR MAN scripts written for teens.', null),
            sourceCard('Behavioral Tech', 'behavioraltech.org', 'Linehan-founded DBT training organization.', 'https://behavioraltech.org/'),
            sourceCard('DBT Self Help', 'dbtselfhelp.com', 'Free open educational resource covering DEAR MAN and the modifiers.', 'https://dbtselfhelp.com/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'DEAR MAN works best when the other person is willing to hear you, even if they will not agree. With someone abusive or unsafe, DEAR MAN is the WRONG tool; safety comes first, and the conversation should include an adult who can hold it.'),
              h('li', null, 'A perfectly executed DEAR MAN can still get a no. The skill is in the asking, not in guaranteeing the result. Often the same ask succeeds with a different listener or at a different time.'),
              h('li', null, 'Practice matters. The first time you try a DEAR MAN in the wild, your voice will likely be shakier than in the script. That is normal. The fifth time will be different.'),
              h('li', null, 'For students who have been socialized to defer (girls, students of color, disabled students), DEAR MAN can feel transgressive at first. That feeling is information; it is not a sign you are doing it wrong.'),
              h('li', null, 'The mnemonic is a tool, not a religion. Skip steps that do not fit. If "Reinforce" feels manipulative for a specific situation, leave it out. The goal is clarity, not formula.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.10)', borderTop: '1px solid rgba(59,130,246,0.3)', borderRight: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '3px solid #3b82f6', fontSize: 12.5, color: '#bfdbfe', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'DEAR MAN pairs naturally with the Self-Advocacy tool in this SEL Hub. A useful Crew protocol: each student picks a real low-stakes ask, builds the DEAR MAN script in this tool, then pair-practices with a partner playing the listener. Build the muscle on small asks before students need it on big ones. Note: many students benefit from building DEAR MAN scripts with a counselor before family conversations.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#93c5fd', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#bfdbfe', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#bfdbfe', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'script') body = renderScript();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'DEAR MAN script builder' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
