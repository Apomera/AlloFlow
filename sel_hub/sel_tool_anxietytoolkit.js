// ═══════════════════════════════════════════════════════════════
// sel_tool_anxietytoolkit.js — Anxiety Toolkit
// CBT-based anxiety self-help: psychoeducation (what anxiety
// actually is vs. what it feels like), the worry tree (productive
// vs unproductive worry), scheduled worry time, decatastrophizing,
// grounding skills, and a self-inventory of personal anxiety
// patterns.
// Sources: Beck Institute, AACAP, Anxiety and Depression
// Association of America (ADAA), NICE adolescent anxiety guidance.
// Registered tool ID: "anxietyToolkit"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('anxietyToolkit'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-anxiety')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-anxiety';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  var ANXIETY_GUIDANCE = {
    elementary: {
      homeTitle: 'Anxiety is a body alarm, not a flaw.',
      homeIntro: 'Worry can show up as big body feelings, stomach feelings, or what-if thoughts. Try one small skill, and ask a trusted adult to help when the alarm feels too big.',
      support: 'If worry keeps getting in the way of school, sleep, eating, play, or relationships, tell a trusted adult and ask for help. This toolkit is a companion, not therapy.'
    },
    middle: {
      homeTitle: 'Anxiety is a body alarm, not a flaw.',
      homeIntro: 'Anxiety can show up in your body, thoughts, choices, and relationships. Learn to notice the alarm, choose a skill, and ask for support when it starts taking over.',
      support: 'If anxiety keeps interfering with school, sleep, eating, or relationships for more than a few weeks, tell a trusted adult or clinician. This toolkit is a companion, not therapy.'
    },
    high: {
      homeTitle: 'Anxiety is a body alarm, not a flaw.',
      homeIntro: 'Anxiety is an alarm system designed to protect you. This toolkit helps you notice when the alarm is too loud, choose a skill, and connect with human support when anxiety starts taking over.',
      support: 'If anxiety significantly interferes with school, sleep, eating, or relationships for more than a few weeks, talk with a trusted adult or clinician. This toolkit is a companion, not therapy.'
    }
  };
  function defaultState() {
    return {
      view: 'triage',
      // Triage gate
      skippedTriage: false,        // remembered: returning users skip the gate
      triageSuicidal: null,        // 'yes' | 'no' | 'prefer-not'
      triageIntensity: 5,          // 1-10 slider
      triageBasicNeeds: null,      // 'yes' | 'somewhat' | 'no'
      // Worry tree state
      worryItem: '',
      worryActionable: null,    // true/false
      worryAction: '',
      worryLetGoNotes: '',
      // Worry time
      parkedWorries: [],        // [{text, date}]
      worryTimeStart: '17:00',  // default 5pm
      worryTimeMinutes: 20,
      // Decatastrophizing
      catastrophe: '',
      worstCase: '',
      bestCase: '',
      mostLikely: '',
      copingPlan: '',
      // Personal patterns
      myTriggers: [],
      myBodySigns: [],
      mySigsThoughts: [],
      myWhatHelps: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ── Extended Anxiety Content Library ──

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  window.SelHub.registerTool('anxietyToolkit', {
    icon: '🫧',
    label: 'Anxiety Toolkit',
    desc: 'CBT-based tools for working with anxiety: psychoeducation (what it is, what it is not), the worry tree (productive vs unproductive worry), scheduled worry time, decatastrophizing, grounding skills, and a personal pattern inventory. From Beck Institute, AACAP, ADAA. Pairs with Window of Tolerance and Stress Bucket.',
    color: 'cyan',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _anxT = (ctx && ctx.theme) || {};
      var _anxHC = !!_anxT.isContrast, _anxL = !_anxHC && !_anxT.isDark;
      var _anx_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _anx_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#b45309':'#000000','#fff':'#000000','#ef4444':'#000000','#a855f7':'#000000','#15803d':'#000000','#7c3aed':'#000000','#0ea5e9':'#000000'};
      var _anx_FGL = {'#cbd5e1':'#334155','#67e8f9':'#155e75','#94a3b8':'#64748b','#e2e8f0':'#1e293b','#7dd3fc':'#075985','#fecaca':'#b91c1c','#fde68a':'#92400e','#e9d5ff':'#581c87','#fee2e2':'#991b1b','#c4b5fd':'#5b21b6','#fca5a5':'#991b1b','#fbcfe8':'#9d174d','#fcd34d':'#78350f'}, _anx_FGH = {'#cbd5e1':'#ffff00','#67e8f9':'#ffff00','#94a3b8':'#ffff00','#bae6fd':'#ffff00','#e2e8f0':'#ffff00','#7dd3fc':'#ffff00','#fecaca':'#ffff00','#fde68a':'#ffff00','#e9d5ff':'#ffff00','#fee2e2':'#ffff00','#fef2f2':'#ffff00','#fff':'#ffff00','#fef3c7':'#ffff00','#bbf7d0':'#ffff00','#a5f3fc':'#ffff00','#c4b5fd':'#ffff00','#fca5a5':'#ffff00','#fbcfe8':'#ffff00','#fcd34d':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00'};
      var _anx_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _anx_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#ef4444':'#ffff00','#f59e0b':'#ffff00','#a855f7':'#ffff00','#fca5a5':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00','#06b6d4':'#ffff00','#22c55e':'#ffff00','#0ea5e9':'#ffff00','#ec4899':'#ffff00','#cbd5e1':'#ffff00','#0891b2':'#ffff00'};
      var _anxBg = function(h){ return _anxHC ? (_anx_BGH[h]||h) : (_anxL ? (_anx_BGL[h]||h) : h); };
      var _anxFg = function(h){ return _anxHC ? (_anx_FGH[h]||h) : (_anxL ? (_anx_FGL[h]||h) : h); };
      var _anxBd = function(h){ return _anxHC ? (_anx_BDH[h]||h) : (_anxL ? (_anx_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.anxietyToolkit || defaultState();
      var _anxBand = (ctx && ctx.gradeBand) || 'high';
      var _anxGuidance = ANXIETY_GUIDANCE[_anxBand] || ANXIETY_GUIDANCE.high;
      function setA(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.anxietyToolkit) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { anxietyToolkit: next });
        });
      }
      // Triage gate: first-time visitors land on 'triage'; returning users (who explicitly
      // skipped or completed it) go to their last view or 'home'. Persisted d.skippedTriage
      // ensures returning users are never re-gated.
      var initialView = d.view || (d.skippedTriage ? 'home' : 'triage');
      var view = initialView;
      function goto(v) { setA({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _anxFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _anxFg('#67e8f9'), fontSize: 22, fontWeight: 900 } }, '🫧 Anxiety Toolkit'),
            h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'CBT-based skills for working with anxiety.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What is anxiety', icon: '🫧' },
          { id: 'tree', label: 'Worry tree', icon: '🌳' },
          { id: 'parking', label: 'Worry time', icon: '🅿️' },
          { id: 'decat', label: 'Decatastrophize', icon: '🪜' },
          { id: 'ground', label: 'Grounding', icon: '🌍' },
          { id: 'patterns', label: 'My patterns', icon: '🔍' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Anxiety Toolkit sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#06b6d4' : '#334155'),
                background: active ? 'rgba(6,182,212,0.18)' : _anxBg('#1e293b'),
                color: active ? _anxFg('#a5f3fc') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _anxFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          _anxGuidance.support + ' If you might hurt yourself or feel unsafe, use crisis support now.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TRIAGE — clinical safety gate (NOT an assessment)
      // ═══════════════════════════════════════════════════════════
      function anxietyMetric(label, value, hint, color) {
        return h('div', {
          style: {
            minHeight: 76,
            padding: 12,
            borderRadius: 10,
            background: _anxBg('#0f172a'),
            borderTop: '1px solid #1e293b',
            borderRight: '1px solid #1e293b',
            borderBottom: '1px solid #1e293b',
            borderLeft: '4px solid ' + color
          }
        },
          h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 } }, label),
          h('div', { style: { fontSize: 20, color: color, fontWeight: 900, lineHeight: 1.1 } }, value),
          h('div', { style: { fontSize: 11, color: _anxFg('#cbd5e1'), marginTop: 5, lineHeight: 1.35 } }, hint)
        );
      }

      function anxietyRouteCard(title, blurb, actionLabel, onClick, color) {
        return h('button', {
          onClick: onClick,
          'aria-label': actionLabel + ': ' + title,
          style: {
            minHeight: 128,
            padding: 14,
            borderRadius: 12,
            borderTop: '1px solid #1e293b',
            borderRight: '1px solid #1e293b',
            borderBottom: '1px solid #1e293b',
            borderLeft: '4px solid ' + color,
            background: _anxBg('#0f172a'),
            color: _anxFg('#e2e8f0'),
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { fontSize: 14, fontWeight: 900, color: color, lineHeight: 1.2 } }, title),
          h('div', { style: { flex: 1, fontSize: 12, color: _anxFg('#cbd5e1'), lineHeight: 1.5 } }, blurb),
          h('div', { style: { fontSize: 11, fontWeight: 900, color: color, textTransform: 'uppercase' } }, actionLabel)
        );
      }

      function anxietyCommandPanel() {
        var parkedCount = (d.parkedWorries || []).length;
        var patternCount = (d.myTriggers || []).length + (d.myBodySigns || []).length + (d.mySigsThoughts || []).length + (d.myWhatHelps || []).length;
        var intensity = (typeof d.triageIntensity === 'number') ? d.triageIntensity : 5;
        var planStatus = d.copingPlan ? 'Ready' : (d.catastrophe || d.worstCase || d.mostLikely ? 'In progress' : 'Not started');
        return h('section', {
          role: 'region',
          'aria-label': 'Anxiety Toolkit quick start dashboard',
          style: {
            marginBottom: 16,
            padding: 14,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(8,145,178,0.14) 0%, rgba(15,23,42,0.42) 100%)',
            border: '1px solid rgba(6,182,212,0.35)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { margin: 0, color: _anxFg('#a5f3fc'), fontSize: 16, fontWeight: 900 } }, 'Choose the next useful move'),
              h('p', { style: { margin: '4px 0 0', color: _anxFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.55 } },
                'Start with the part that matches this moment: body alarm, worry loop, future worry, or personal patterns.')
            ),
            h('button', {
              onClick: function() { goto('print'); },
              'aria-label': 'Open printable anxiety toolkit summary',
              style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 800 }
            }, 'Print summary')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, marginBottom: 12 } },
            anxietyMetric('Intensity', intensity + '/10', intensity >= 8 ? 'Use body-first support.' : 'Use the skill that fits.', '#06b6d4'),
            anxietyMetric('Parked', String(parkedCount), parkedCount ? 'Saved for worry time.' : 'No worries parked yet.', '#f59e0b'),
            anxietyMetric('Plan', planStatus, 'Decatastrophizing progress.', '#a855f7'),
            anxietyMetric('Patterns', String(patternCount), patternCount ? 'Personal map started.' : 'Build your map.', '#ec4899')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
            anxietyRouteCard('Calm the body first', 'Use grounding when the alarm is already loud and thinking is hard.', 'Open grounding', function() { goto('ground'); }, '#0ea5e9'),
            anxietyRouteCard('Sort the worry', 'Separate solvable worries from loops so the next step is clearer.', 'Open worry tree', function() { goto('tree'); }, '#22c55e'),
            anxietyRouteCard('Park it for later', 'Contain repeat worries in a scheduled worry window.', 'Open worry time', function() { goto('parking'); }, '#f59e0b'),
            anxietyRouteCard('Map my patterns', 'Save triggers, body signs, thoughts, and what actually helps.', 'Open patterns', function() { goto('patterns'); }, '#ec4899')
          )
        );
      }

      // This is a "you might need more than this tool" gate, shown
      // before users drop into interactive anxiety content. It is
      // skippable, and the choice is remembered (d.skippedTriage)
      // so returning users are never re-gated.
      // ═══════════════════════════════════════════════════════════
      function renderTriage() {
        var suicidal = d.triageSuicidal;
        var intensity = (typeof d.triageIntensity === 'number') ? d.triageIntensity : 5;
        var basicNeeds = d.triageBasicNeeds;

        // Determine which routing card to show. Only show after enough
        // is answered to avoid premature/false-positive routing.
        var answeredEnough = suicidal !== null && basicNeeds !== null;
        var crisisRoute = suicidal === 'yes';
        var softRoute = !crisisRoute && answeredEnough && (intensity >= 8 || basicNeeds === 'no');

        function continueToToolkit() {
          // Mark triage as completed/skipped so the user is never re-gated,
          // then route to the psychoeducation home view.
          setA({ skippedTriage: true, view: 'home' });
        }

        function skipTriage() {
          setA({ skippedTriage: true, view: 'home' });
        }

        function openCrisisCompanion() {
          // Persist skip so they don't see triage again next time they return.
          setA({ skippedTriage: true });
          if (setSelHubTool) setSelHubTool('crisiscompanion');
        }

        function openTipp() {
          setA({ skippedTriage: true });
          if (setSelHubTool) setSelHubTool('tipp');
        }

        // Yes/No/Prefer button — accessible, high-contrast
        function choiceBtn(label, value, current, onPick, color) {
          var active = current === value;
          return h('button', {
            key: value,
            onClick: function() { onPick(value); },
            'aria-pressed': active,
            'aria-label': label,
            style: {
              flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 8,
              border: '2px solid ' + (active ? color : _anxFg('#475569')),
              background: active ? 'rgba(255,255,255,0.06)' : _anxBg('#1e293b'),
              color: active ? '#f1f5f9' : _anxFg('#cbd5e1'),
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              boxShadow: active ? ('0 0 0 1px ' + color + ' inset') : 'none'
            }
          }, label);
        }

        return h('div', null,
          // Intro — gentle, non-alarming framing
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(14,165,233,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 20, fontWeight: 900, color: _anxFg('#bae6fd'), marginBottom: 6 } }, 'Before we start — a quick check-in.'),
            h('p', { style: { margin: 0, color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Three questions, takes about 30 seconds. This is not an assessment — it just helps us point you to the right place. If you have used this tool before, you can ',
              h('button', {
                onClick: skipTriage,
                'aria-label': 'Skip triage — I have used this tool before',
                style: { background: 'none', border: 'none', padding: 0, color: _anxFg('#7dd3fc'), textDecoration: 'underline', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit' }
              }, 'skip this'),
              '.'
            )
          ),

          // Q1 — suicidality
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { id: 'triage-q1', style: { fontSize: 14, fontWeight: 800, color: _anxFg('#fecaca'), marginBottom: 10, lineHeight: 1.5 } },
              '1. Are you having thoughts of suicide or hurting yourself right now?'),
            h('div', { role: 'group', 'aria-labelledby': 'triage-q1', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              choiceBtn('Yes', 'yes', suicidal, function(v) { setA({ triageSuicidal: v }); }, _anxBg('#ef4444')),
              choiceBtn('No', 'no', suicidal, function(v) { setA({ triageSuicidal: v }); }, '#22c55e'),
              choiceBtn('Prefer not to say', 'prefer-not', suicidal, function(v) { setA({ triageSuicidal: v }); }, _anxFg('#64748b'))
            )
          ),

          // Q2 — intensity 1-10
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('label', { htmlFor: 'triage-intensity', style: { display: 'block', fontSize: 14, fontWeight: 800, color: _anxFg('#fde68a'), marginBottom: 10, lineHeight: 1.5 } },
              '2. On a scale of 1-10, how intense is your anxiety right now?'),
            h('input', {
              id: 'triage-intensity',
              type: 'range', min: 1, max: 10, step: 1, value: intensity,
              'aria-valuemin': 1, 'aria-valuemax': 10, 'aria-valuenow': intensity,
              onChange: function(e) { setA({ triageIntensity: parseInt(e.target.value, 10) }); },
              style: { width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: _anxFg('#94a3b8'), marginTop: 4 } },
              h('span', null, '1 — calm'),
              h('span', { style: { color: _anxFg('#fde68a'), fontWeight: 800, fontSize: 14 } }, String(intensity)),
              h('span', null, '10 — overwhelming')
            )
          ),

          // Q3 — basic needs
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 14 } },
            h('div', { id: 'triage-q3', style: { fontSize: 14, fontWeight: 800, color: _anxFg('#e9d5ff'), marginBottom: 10, lineHeight: 1.5 } },
              '3. Have you been able to sleep, eat, and care for basic needs this week?'),
            h('div', { role: 'group', 'aria-labelledby': 'triage-q3', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              choiceBtn('Yes', 'yes', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, '#22c55e'),
              choiceBtn('Somewhat', 'somewhat', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, '#f59e0b'),
              choiceBtn('No', 'no', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, _anxBg('#ef4444'))
            )
          ),

          // Routing card — CRISIS (Q1 = yes)
          crisisRoute ? h('div', { role: 'alert',
            style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(15,23,42,0.5) 70%)', border: '2px solid #ef4444', marginBottom: 12 }
          },
            h('div', { style: { fontSize: 18, fontWeight: 900, color: _anxFg('#fecaca'), marginBottom: 8 } }, 'What you are feeling matters.'),
            h('p', { style: { margin: '0 0 10px', color: _anxFg('#fee2e2'), fontSize: 14, lineHeight: 1.7 } },
              'Please reach out NOW. You do not have to be in a "bad enough" place to call — these lines are for exactly this moment.'),
            h('ul', { style: { margin: '0 0 12px', padding: '0 0 0 22px', color: _anxFg('#fef2f2'), fontSize: 14, lineHeight: 1.9 } },
              h('li', null, h('strong', null, '988'), ' — call or text (Suicide & Crisis Lifeline, US)'),
              h('li', null, 'Text ', h('strong', null, 'HOME'), ' to ', h('strong', null, '741741'), ' (Crisis Text Line)')
            ),
            h('p', { style: { margin: '0 0 12px', color: _anxFg('#fee2e2'), fontSize: 13, lineHeight: 1.65 } },
              'Opening the Crisis Companion tool in this app is also a good step — it has a safety plan template and grounding skills designed for right now.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: openCrisisCompanion, 'aria-label': 'Open Crisis Companion tool',
                style: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
                'Open Crisis Companion'),
              h('button', { onClick: openTipp, 'aria-label': 'Open TIPP tool',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: 'rgba(239,68,68,0.18)', color: _anxFg('#fee2e2'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } },
                'Open TIPP'),
              h('button', { onClick: continueToToolkit, 'aria-label': 'I am not in crisis — continue to toolkit',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #475569', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 13, fontWeight: 700 } },
                'I am not in crisis — continue to toolkit')
            )
          ) : null,

          // Routing card — SOFT (high intensity or basic needs unmet)
          softRoute ? h('div', { role: 'status',
            style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.5)', marginBottom: 12 }
          },
            h('div', { style: { fontSize: 16, fontWeight: 900, color: _anxFg('#fde68a'), marginBottom: 6 } }, 'It sounds like you are carrying a lot.'),
            h('p', { style: { margin: '0 0 12px', color: _anxFg('#fef3c7'), fontSize: 13.5, lineHeight: 1.7 } },
              'This toolkit can help, AND it is worth thinking about getting human support too — a counselor, a trusted adult, or one of the lines above. You do not have to handle this alone.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: openCrisisCompanion, 'aria-label': 'Open Crisis Companion tool',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #fcd34d', background: 'rgba(245,158,11,0.22)', color: _anxFg('#fef3c7'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } },
                'Open Crisis Companion'),
              h('button', { onClick: continueToToolkit, 'aria-label': 'Continue to toolkit',
                style: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
                'Continue to toolkit')
            )
          ) : null,

          // Default continue — once enough answered and no routing card shown
          (answeredEnough && !crisisRoute && !softRoute) ? h('div', {
            style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.4)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }
          },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 13, color: _anxFg('#bbf7d0'), lineHeight: 1.6 } },
              'Thanks for the check-in. The toolkit is a good fit for what you described.'),
            h('button', { onClick: continueToToolkit, 'aria-label': 'Continue to toolkit',
              style: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
              'Continue to toolkit →')
          ) : null,

          // Always-visible skip link at bottom for users who don't want to answer
          h('div', { style: { marginTop: 6, textAlign: 'center' } },
            h('button', {
              onClick: skipTriage,
              style: { background: 'none', border: 'none', color: _anxFg('#94a3b8'), textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }
            }, 'Skip — I have used this tool before')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — psychoeducation
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(6,182,212,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(6,182,212,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _anxFg('#a5f3fc'), marginBottom: 4 } }, _anxGuidance.homeTitle),
            h('p', { style: { margin: 0, color: _anxFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              _anxGuidance.homeIntro
            )
          ),

          anxietyCommandPanel(),

          // What anxiety actually is
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #06b6d4', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _anxFg('#67e8f9'), marginBottom: 10 } }, '🧠 The fight-flight-freeze response, in plain English'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'When your brain perceives a threat, it sends a signal that prepares your body to either FIGHT (face the threat), FLEE (escape the threat), or FREEZE (play dead, hope it passes). This happens before you can think.'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'What you feel as "anxiety" is actually the BODY part of that response: heart racing, breathing fast, muscles tight, stomach churning, sweating, vision narrowing, mind racing. These are not signs something is wrong with you. They are signs your body is doing what it was built to do.'),
            h('p', { style: { margin: 0, color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The trick is: the body cannot tell the difference between a real tiger and a math test. The same response fires for both. CBT and the tools in this kit help you work with the response, not against it.')
          ),

          // Worry vs Anxiety vs Fear
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _anxFg('#c4b5fd'), marginBottom: 10 } }, '🔍 These three are not the same thing'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Fear'), ' is the response to something present and real. A growling dog. A car coming at you. The response is appropriate.'),
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Anxiety'), ' is the response to something IMAGINED. The test next week. What might happen at the party. The kid you don\'t like seeing you in the hallway. Your body responds AS IF the thing is happening now.'),
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Worry'), ' is the THINKING part: the mental loop of "what if, what if, what if." Worry can be useful (planning) or unhelpful (going in circles).')
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Skills in this toolkit'),
          stepCard('🌳 The worry tree', 'Is this worry productive (something I can act on) or unproductive (going in circles)? Different worries need different moves.', function() { goto('tree'); }, '#22c55e'),
          stepCard('🅿️ Worry time (parking lot)', 'Park your worries to a scheduled 15-20 minutes per day. Frees the rest of your day from running mental loops.', function() { goto('parking'); }, '#f59e0b'),
          stepCard('🪜 Decatastrophize', 'When the worry is "what if the worst happens?" — walk down the ladder: worst case, best case, MOST LIKELY case, and what you would actually do.', function() { goto('decat'); }, _anxBg('#a855f7')),
          stepCard('🌍 Grounding skills', 'When anxiety has already taken over, body-based skills (5-4-3-2-1, paced breathing, cold water) bring you back.', function() { goto('ground'); }, _anxBg('#0ea5e9')),
          stepCard('🔍 My patterns', 'Identify YOUR triggers, body signs, common worry thoughts, and what actually helps you. The kit becomes personalized.', function() { goto('patterns'); }, '#ec4899'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: _anxBg('#0f172a'), cursor: 'pointer', marginBottom: 8, color: _anxFg('#e2e8f0') } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // WORRY TREE
      // ═══════════════════════════════════════════════════════════
      function renderTree() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: _anxFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '🌳 The Worry Tree '),
            'is a practical CBT tool for sorting worry. The basic question: is this worry SOLVABLE right now, or am I just spinning? If it is solvable, make a plan. If it is not solvable right now, the worry is not doing useful work — that\'s when other skills kick in.'
          ),

          // The worry
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'a-worry', style: { display: 'block', fontSize: 12, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 6 } }, 'What is the worry?'),
            h('textarea', { id: 'a-worry', value: d.worryItem || '',
              placeholder: 'Be specific. Not "school," but "the math test on Tuesday."',
              onChange: function(e) { setA({ worryItem: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          d.worryItem ? h('div', null,
            // The fork
            h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 10 } }, 'Is there something I can DO about this right now (today or this week)?'),
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() { setA({ worryActionable: true }); }, 'aria-pressed': d.worryActionable === true,
                  style: { flex: 1, minWidth: 140, padding: 12, borderRadius: 8, border: '2px solid ' + (d.worryActionable === true ? '#22c55e' : _anxFg('#475569')), background: d.worryActionable === true ? 'rgba(34,197,94,0.18)' : _anxBg('#1e293b'), color: d.worryActionable === true ? _anxFg('#bbf7d0') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } }, '✓ Yes — there is something I can do'),
                h('button', { onClick: function() { setA({ worryActionable: false }); }, 'aria-pressed': d.worryActionable === false,
                  style: { flex: 1, minWidth: 140, padding: 12, borderRadius: 8, border: '2px solid ' + (d.worryActionable === false ? _anxBg('#a855f7') : _anxFg('#475569')), background: d.worryActionable === false ? 'rgba(168,85,247,0.18)' : _anxBg('#1e293b'), color: d.worryActionable === false ? _anxFg('#e9d5ff') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } }, '✕ No — nothing I can do right now')
              )
            ),

            // Branch: actionable
            d.worryActionable === true ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
              h('label', { htmlFor: 'a-worry-action', style: { display: 'block', fontSize: 13, fontWeight: 800, color: _anxFg('#bbf7d0'), marginBottom: 8 } }, '✓ Make a plan'),
              h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.55 } }, 'What is the next concrete step? Not "study more"; "spend 20 minutes on practice problems #5-10 after dinner tonight."'),
              h('textarea', { id: 'a-worry-action', value: d.worryAction || '',
                placeholder: 'The next concrete step is...',
                onChange: function(e) { setA({ worryAction: e.target.value }); },
                style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } }),
              d.worryAction ? h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(34,197,94,0.18)', marginTop: 8, fontSize: 12.5, color: _anxFg('#bbf7d0'), lineHeight: 1.6 } },
                h('strong', null, '🎯 The CBT move: '),
                'Once you\'ve made the plan, the worry has done its job. If the same worry comes back, your move is to remind yourself "I have a plan; I will execute it at [time]" — and then redirect attention. The worry is not allowed to keep working when the action is already scheduled.'
              ) : null
            ) : null,

            // Branch: not actionable
            d.worryActionable === false ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
              h('label', { htmlFor: 'a-worry-redirect', style: { display: 'block', fontSize: 13, fontWeight: 800, color: _anxFg('#e9d5ff'), marginBottom: 8 } }, '⤴ Let it go (for now)'),
              h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.55 } }, 'If there is nothing you can do RIGHT NOW, more worrying will not make you safer or smarter; it will just make you exhausted. The move is to redirect. Park it for worry time later (if you want), or use a grounding skill.'),
              h('textarea', { id: 'a-worry-redirect', value: d.worryLetGoNotes || '',
                placeholder: 'What will you redirect to? A specific activity, a coping skill, a person to text.',
                onChange: function(e) { setA({ worryLetGoNotes: e.target.value }); },
                style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } }),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() {
                  if (d.worryItem) {
                    var parked = (d.parkedWorries || []).concat([{ text: d.worryItem, date: todayISO() }]);
                    setA({ parkedWorries: parked });
                    if (addToast) addToast('Worry parked. Use worry time later.', 'info');
                  }
                }, style: { padding: '6px 14px', borderRadius: 6, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: _anxFg('#fde68a'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '🅿️ Park it for worry time'),
                h('button', { onClick: function() { goto('ground'); }, 'aria-label': 'Use a grounding skill',
                  style: { padding: '6px 14px', borderRadius: 6, border: '1px solid #0ea5e9', background: 'rgba(14,165,233,0.18)', color: _anxFg('#bae6fd'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '🌍 Use a grounding skill')
              )
            ) : null
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // WORRY TIME (PARKING)
      // ═══════════════════════════════════════════════════════════
      function renderParking() {
        function parkInput() {
          var el = document.getElementById('a-park-input');
          if (!el || !el.value.trim()) { if (typeof addToast === 'function') addToast('Write something first, then press the button again.', 'info'); return; }
          var parked = (d.parkedWorries || []).concat([{ text: el.value.trim(), date: todayISO() }]);
          setA({ parkedWorries: parked });
          el.value = '';
          if (announceToSR) announceToSR('Worry parked.');
        }
        function removeWorry(i) {
          var w = (d.parkedWorries || []).slice();
          w.splice(i, 1);
          setA({ parkedWorries: w });
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: _anxFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🅿️ Scheduled worry time '),
            'is a counterintuitive CBT technique. You set aside 15-20 minutes a day (often before dinner) to deliberately worry. The rest of the day, when a worry pops up, you "park" it — write it down, knowing you will get to it later. This DOES NOT make worries go away. It contains them so they stop running all day.'
          ),

          // Settings
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, 'My worry time'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 } },
              h('div', null,
                h('label', { htmlFor: 'a-worry-time', style: { display: 'block', fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'When'),
                h('input', { id: 'a-worry-time', type: 'time', value: d.worryTimeStart || '17:00',
                  onChange: function(e) { setA({ worryTimeStart: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'a-worry-mins', style: { display: 'block', fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'How many minutes'),
                h('input', { id: 'a-worry-mins', type: 'number', min: 5, max: 60, value: d.worryTimeMinutes || 20,
                  onChange: function(e) { setA({ worryTimeMinutes: parseInt(e.target.value, 10) }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } })
              )
            )
          ),

          // Park new
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, '+ Park a worry'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'a-park-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Park a worry'),
              h('input', { id: 'a-park-input', type: 'text', placeholder: 'The thing my brain wants to keep thinking about...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); parkInput(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: parkInput, 'aria-label': 'Park worry',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _anxBg('#b45309'), color: _anxFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Park')
            )
          ),

          // Parked worries
          (d.parkedWorries || []).length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, 'Parked (' + d.parkedWorries.length + ')'),
            d.parkedWorries.map(function(w, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: _anxBg('#1e293b'), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 10, color: _anxFg('#94a3b8'), fontFamily: 'ui-monospace, monospace', minWidth: 75 } }, w.date),
                h('span', { style: { flex: 1, fontSize: 13, color: _anxFg('#e2e8f0') } }, w.text),
                h('button', { onClick: function() { removeWorry(i); }, 'aria-label': 'Remove worry: ' + w.text,
                  style: { minWidth: 24, minHeight: 24, background: 'transparent', border: '1px solid #475569', color: _anxFg('#94a3b8'), borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          // How to do worry time
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 10, fontSize: 12.5, color: _anxFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🕔 How to do worry time:'),
            h('ol', { style: { margin: '6px 0 0', padding: '0 0 0 22px' } },
              h('li', null, 'Sit somewhere private with your parked list.'),
              h('li', null, 'Set a timer for your chosen minutes.'),
              h('li', null, 'For each worry: ask "is this productive (run it through the worry tree) or unproductive (acknowledge, let it sit)?"'),
              h('li', null, 'When the timer goes off, you STOP worrying — even if you didn\'t finish. Worry time is OVER for today.'),
              h('li', null, 'Move into something else: a walk, a meal, a show, time with someone.')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // DECATASTROPHIZE
      // ═══════════════════════════════════════════════════════════
      function renderDecat() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: _anxFg('#e9d5ff'), lineHeight: 1.7 } },
            h('strong', null, '🪜 Decatastrophizing '),
            'is a CBT skill for when the worry is "what if the WORST happens?" The technique walks the worst case down the ladder so it becomes manageable. NOTE: this is NOT "stop being negative." It is taking the catastrophe seriously enough to think it through.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('label', { htmlFor: 'a-catastrophe', style: { display: 'block', fontSize: 12, color: _anxFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, 'The worry'),
            h('textarea', { id: 'a-catastrophe', value: d.catastrophe || '',
              placeholder: 'What is the catastrophe you are worried about?',
              onChange: function(e) { setA({ catastrophe: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('label', { htmlFor: 'a-worst', style: { display: 'block', fontSize: 12, color: _anxFg('#fca5a5'), fontWeight: 800, marginBottom: 6 } }, '⬇ Worst case: if EVERYTHING went wrong'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Be specific. Often the "worst case" in your head is vague; spelling it out actually makes it less scary.'),
            h('textarea', { id: 'a-worst', value: d.worstCase || '',
              placeholder: 'If everything went wrong, what would specifically happen?',
              onChange: function(e) { setA({ worstCase: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'a-best', style: { display: 'block', fontSize: 12, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 6 } }, '⬆ Best case: if it went GREAT'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Useful to consider for balance. The mind has been stuck on worst-case; expanding the range helps.'),
            h('textarea', { id: 'a-best', value: d.bestCase || '',
              placeholder: 'If it went great, what would happen?',
              onChange: function(e) { setA({ bestCase: e.target.value }); },
              style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('label', { htmlFor: 'a-likely', style: { display: 'block', fontSize: 12, color: _anxFg('#7dd3fc'), fontWeight: 800, marginBottom: 6 } }, '➡ MOST LIKELY: realistic, honest'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'This is the key one. Most of the time, the most-likely outcome is somewhere in the messy middle — not great, not terrible, manageable.'),
            h('textarea', { id: 'a-likely', value: d.mostLikely || '',
              placeholder: 'Realistically, what is most likely to actually happen?',
              onChange: function(e) { setA({ mostLikely: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('label', { htmlFor: 'a-cope', style: { display: 'block', fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 6 } }, '🛠 If the worst case did happen — what would I actually DO?'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'The most powerful question in decatastrophizing. The brain catastrophizes by imagining the bad thing — and stopping there. The work is to keep going: if it happened, what would I do next?'),
            h('textarea', { id: 'a-cope', value: d.copingPlan || '',
              placeholder: 'If the worst case happened, my next steps would be...',
              onChange: function(e) { setA({ copingPlan: e.target.value }); },
              style: { width: '100%', minHeight: 100, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // GROUNDING
      // ═══════════════════════════════════════════════════════════
      function renderGround() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: _anxFg('#bae6fd'), lineHeight: 1.7 } },
            h('strong', null, '🌍 Grounding skills '),
            'are body-first techniques for when anxiety has already taken over and thinking is hard. They work by pulling your attention out of the mental loop and into the physical present moment. They take 30 seconds to 5 minutes.'
          ),

          // 5-4-3-2-1
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '👀 5-4-3-2-1 Senses'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } }, 'Look around and name:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, '5 things you can SEE'),
              h('li', null, '4 things you can HEAR'),
              h('li', null, '3 things you can TOUCH'),
              h('li', null, '2 things you can SMELL'),
              h('li', null, '1 thing you can TASTE')
            )
          ),

          // Paced breathing
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '🫁 Paced breathing'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Breathe in for 4 counts, hold for 4, out for 6-8, repeat for 1-2 minutes. The LONGER EXHALE is the active ingredient — it activates your parasympathetic system (the "calm down" branch).'),
            h('p', { style: { margin: 0, color: _anxFg('#94a3b8'), fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
              'See the TIPP tool in this SEL Hub for the full version.')
          ),

          // Cold
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '❄ Cold water'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Splash cold water on your face, hold a cold pack on your eyes for 15-30 seconds, or hold ice cubes in your hands. Cold on the face triggers the mammalian dive reflex, which physiologically slows your heart rate.'),
            h('p', { style: { margin: 0, color: _anxFg('#94a3b8'), fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
              'AVOID if you have a heart condition or eating disorder. See TIPP for cautions.')
          ),

          // Body scan
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '👟 Feet on floor'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Press your feet firmly into the floor. Notice the contact. Feel the weight of your body in the chair, the temperature of the room, the texture of what you\'re wearing. The point is to come back into your body.')
          ),

          // The cube
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '🔢 The cube (categories)'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Name 5 things in a category that occupies your thinking. 5 colors. 5 capitals. 5 favorite songs. 5 dog breeds. The point is to occupy the verbal part of your brain with something neutral.')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PATTERNS — personalized inventory
      // ═══════════════════════════════════════════════════════════
      function renderPatterns() {
        var TRIGGER_STARTERS = ['Tests and grades', 'Social situations', 'Family arguments', 'Health worries', 'Future / college / career', 'Sleep deprivation', 'Caffeine', 'Phone notifications', 'News / world events', 'Money', 'Specific person'];
        var BODY_STARTERS = ['Heart racing', 'Tight chest', 'Shallow breathing', 'Stomach churning', 'Sweating', 'Cold hands', 'Headache', 'Muscle tension', 'Restless / pacing', 'Lightheaded'];
        var THOUGHT_STARTERS = ['What if...', 'I cannot handle this', 'Everyone is judging me', 'Something bad is going to happen', 'I am going to fail', 'I am letting people down', 'It is my fault'];
        var HELP_STARTERS = ['Paced breathing', 'Movement / walk', 'Talking to a specific person', 'Cold water', 'My music', 'A specific show', 'Time with my pet', 'Writing', 'Calling a specific number', 'A specific routine'];

        function listEditor(key, title, color, starters, blurb) {
          var items = d[key] || [];
          function addItem(value) {
            if (!value || !value.trim()) { if (typeof addToast === 'function') addToast('Add a few words first, then press the button again.', 'info'); return; }
            var list = items.slice();
            if (list.indexOf(value.trim()) === -1) list.push(value.trim());
            var patch = {}; patch[key] = list;
            setA(patch);
          }
          function removeItem(i) {
            var list = items.slice();
            list.splice(i, 1);
            var patch = {}; patch[key] = list;
            setA(patch);
          }
          var inputId = 'a-pat-' + key;
          function submit() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) { if (typeof addToast === 'function') addToast('Write something first, then press the button again.', 'info'); return; }
            addItem(el.value);
            el.value = '';
          }

          return h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: color, fontWeight: 800, marginBottom: 6 } }, title),
            h('div', { style: { fontSize: 11.5, color: _anxFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),

            items.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              items.map(function(s, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: _anxBg('#1e293b'), border: '1px solid ' + color + '44', fontSize: 12, color: _anxFg('#e2e8f0') } },
                  h('span', null, s),
                  h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove grounding item: ' + s,
                    style: { minWidth: 24, minHeight: 24, background: 'transparent', border: 'none', color: _anxFg('#94a3b8'), cursor: 'pointer', fontSize: 11 } }, '✕')
                );
              })
            ) : null,

            h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
              h('input', { id: inputId, type: 'text', placeholder: 'Type and Enter to add...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: _anxFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _anxFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? _anxBg('#1e293b') : 'rgba(15,23,42,0.6)', color: already ? _anxFg('#64748b') : _anxFg('#cbd5e1'), cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', borderTop: '1px solid rgba(236,72,153,0.3)', borderRight: '1px solid rgba(236,72,153,0.3)', borderBottom: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', marginBottom: 14, fontSize: 12.5, color: _anxFg('#fbcfe8'), lineHeight: 1.65 } },
            h('strong', null, '🔍 Your anxiety has patterns. '),
            'The more you know YOUR specific triggers, body signs, common thoughts, and what helps YOU, the faster you can intervene next time. This inventory is private to this device.'
          ),

          listEditor('myTriggers', '⚡ My common triggers', '#f59e0b', TRIGGER_STARTERS,
            'What tends to set off your anxiety? Specific situations, people, times of day.'),
          listEditor('myBodySigns', '🫀 How anxiety shows up in MY body', _anxBg('#ef4444'), BODY_STARTERS,
            'Your specific physical signs. Knowing these helps you catch anxiety earlier.'),
          listEditor('mySigsThoughts', '💭 My common anxious thoughts', _anxBg('#a855f7'), THOUGHT_STARTERS,
            'The specific thoughts that loop when you\'re anxious. Naming them weakens their grip.'),
          listEditor('myWhatHelps', '🛟 What ACTUALLY helps me', '#22c55e', HELP_STARTERS,
            'Not what should help; what really does. Be honest with yourself.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('anxietyToolkit', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, 'What this toolkit is'),
            h('p', { style: { margin: '0 0 10px', color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A collection of evidence-based CBT skills for working with anxiety, designed to be used outside of therapy. The skills are well-documented and widely taught in cognitive-behavioral therapy for anxiety disorders, including for adolescents.'
            ),
            h('p', { style: { margin: 0, color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Anxiety is the most common adolescent mental health concern. Roughly 1 in 3 US adolescents will meet criteria for an anxiety disorder before age 18. Most students never get clinical treatment. These tools are not a substitute for treatment when treatment is warranted, but they are real skills that work.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, 'When anxiety needs a clinician'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } }, 'Signs that self-help is not enough:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Anxiety significantly interferes with school, sleep, eating, or relationships for more than a few weeks.'),
              h('li', null, 'You\'re avoiding things that matter to you because of anxiety (school, friends, activities).'),
              h('li', null, 'Panic attacks (sudden intense anxiety with strong body symptoms — racing heart, hyperventilation, feeling like you\'re dying or going crazy).'),
              h('li', null, 'Anxiety + significant depression or substance use.'),
              h('li', null, 'Specific intense fears (heights, social situations, contamination) that disrupt life.'),
              h('li', null, 'Anxiety that started after a traumatic event (likely trauma-layered, needs trauma-informed therapy).')
            ),
            h('p', { style: { margin: '8px 0 0', color: _anxFg('#fde68a'), fontSize: 13, lineHeight: 1.7 } },
              h('strong', null, 'The good news: '),
              'evidence-based therapy (especially CBT and CBT with exposure) is very effective for adolescent anxiety. Most teens who get good treatment improve substantially within 12-16 sessions. It works.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Beck, A. T., Emery, G., and Greenberg, R. L. (2005)', 'Anxiety Disorders and Phobias: A Cognitive Perspective, Basic Books', 'Foundational CBT-for-anxiety text.', null),
            sourceCard('AACAP (American Academy of Child & Adolescent Psychiatry)', 'aacap.org / Anxiety Disorders Resource Center', 'Evidence-based clinical guidance for adolescent anxiety.', 'https://www.aacap.org/AACAP/Families_and_Youth/Resource_Centers/Anxiety_Disorders_Resource_Center/Home.aspx'),
            sourceCard('Anxiety and Depression Association of America', 'adaa.org', 'Patient-facing resource hub. Free guides and clinician finder.', 'https://adaa.org/'),
            sourceCard('Walkup, J. T. et al. (2008)', '"Cognitive Behavioral Therapy, Sertraline, or a Combination in Childhood Anxiety," New England Journal of Medicine, 359, 2753-2766', 'Major RCT showing CBT effectiveness for adolescent anxiety.', null),
            sourceCard('Greenberger, D. and Padesky, C. A. (2015)', 'Mind Over Mood: Change How You Feel by Changing the Way You Think (2nd ed.), Guilford Press', 'The most-used CBT self-help workbook; includes worry skills.', null),
            sourceCard('Tolin, D. F. (2012)', 'Face Your Fears: A Proven Plan to Beat Anxiety, Panic, Phobias, and Obsessions, Wiley', 'Accessible CBT-for-anxiety workbook including exposure-based approaches.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _anxFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'These skills help with everyday anxiety and mild-to-moderate anxious symptoms. For diagnosable anxiety disorders, they work BEST as part of treatment with a clinician, not instead of one.'),
              h('li', null, 'Exposure therapy is the gold-standard CBT technique for specific phobias and social anxiety. This toolkit does NOT include exposure work because it requires careful clinical structuring — for that, a CBT therapist is the right move.'),
              h('li', null, 'Anxiety that is actually a SIGNAL about an unsafe environment is not a thinking problem. If your anxiety is appropriate to the situation (an actually unsafe home, an actually unjust school, real medical concerns), the work is on the situation, not on your thoughts.'),
              h('li', null, 'For students with significant trauma history, some of these tools (especially exposure-adjacent thinking) can backfire. Pair with a trauma-informed clinician.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(6,182,212,0.10)', borderTop: '1px solid rgba(6,182,212,0.3)', borderRight: '1px solid rgba(6,182,212,0.3)', borderBottom: '1px solid rgba(6,182,212,0.3)', borderLeft: '3px solid #06b6d4', fontSize: 12.5, color: _anxFg('#a5f3fc'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Anxiety Toolkit pairs naturally with Window of Tolerance, Stress Bucket, and the CBT Thought Record. For school psych practice: the patterns inventory is useful intake data; the worry tree is teachable in one session; worry time is a 1-2 week practice. For Crew: walk students through the worry tree on a low-stakes worry as a first lesson.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _anxBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _anxFg('#67e8f9'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _anxFg('#a5f3fc'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _anxFg('#a5f3fc'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _anxFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — patterns + decatastrophizing + parked worries
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var parked = d.parkedWorries || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(6,182,212,0.10)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _anxFg('#a5f3fc'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Patterns + decatastrophizing + parked worries — useful for a therapist or counselor conversation.'),
            h('button', { onClick: printNow, style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', color: _anxFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'anxiety-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _anxBg('#fff'), color: _anxFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#anxiety-print-region, #anxiety-print-region * { visibility: visible !important; } ' +
              '#anxiety-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0891b2' } },
              h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Anxiety Toolkit · My Patterns'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My anxiety patterns'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _anxFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // My patterns
            (d.myTriggers || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#b45309'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '⚡ My common triggers'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myTriggers.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myBodySigns || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#ef4444'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🫀 How anxiety shows up in my body'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myBodySigns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.mySigsThoughts || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#a855f7'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '💭 My common anxious thoughts'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.mySigsThoughts.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myWhatHelps || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#15803d'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🛟 What actually helps me'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myWhatHelps.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            // Recent decatastrophizing work
            (d.catastrophe || d.worstCase || d.mostLikely || d.copingPlan) ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#7c3aed'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🪜 Recent decatastrophizing work'),
              d.catastrophe ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'The worry'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.catastrophe)
              ) : null,
              d.worstCase ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Worst case'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.worstCase)
              ) : null,
              d.mostLikely ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Most likely (realistic)'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.mostLikely)
              ) : null,
              d.copingPlan ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'If the worst happened, I would'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.copingPlan)
              ) : null
            ) : null,

            // Parked worries
            parked.length > 0 ? h('div', { style: { marginBottom: 12 } },
              h('div', { style: { background: _anxBg('#0ea5e9'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🅿️ Recent parked worries (' + parked.length + ')'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12, lineHeight: 1.75 } },
                parked.slice(-10).map(function(w, i) { return h('li', { key: i }, h('span', { style: { color: _anxFg('#64748b'), fontFamily: 'ui-monospace, monospace', fontSize: 10 } }, w.date + '  '), w.text); })
              )
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _anxFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'CBT-for-anxiety: Beck Institute · Padesky · AACAP. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'triage') body = renderTriage();
      else if (view === 'tree') body = renderTree();
      else if (view === 'parking') body = renderParking();
      else if (view === 'decat') body = renderDecat();
      else if (view === 'ground') body = renderGround();
      else if (view === 'patterns') body = renderPatterns();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      // Hide section nav tabs while the user is on the triage gate — the gate
      // is a focused, single-purpose screen and the tabs would let users bypass
      // it sideways before they have made a choice.
      var showNav = view !== 'triage';

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Anxiety Toolkit' },
        header(),
        showNav ? navTabs() : null,
        body
      );
    }
  });

})();
}
