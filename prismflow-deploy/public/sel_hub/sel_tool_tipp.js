// ═══════════════════════════════════════════════════════════════
// sel_tool_tipp.js — TIPP: Distress Tolerance crisis-survival skill
// The four T-I-P-P skills from DBT (Linehan): Temperature, Intense
// exercise, Paced breathing, Paired muscle relaxation. Designed to
// down-regulate the body BEFORE trying to think your way out. Used
// in pediatric ERs and trauma-informed schools.
// Registered tool ID: "tipp"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('tipp'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-tipp')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-tipp';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  var SKILLS = [
    {
      id: 'temperature',
      letter: 'T',
      label: 'Temperature',
      icon: '❄️',
      color: '#0ea5e9',
      duration: 30,                  // seconds for a single round
      headline: 'Cold water on your face',
      steps: [
        'Fill a bowl with cold water (with ice if you have it).',
        'Hold your breath.',
        'Lean over and submerge your face from above the eyebrows to below the cheekbones, for 15-30 seconds. (If you cannot submerge, hold a cold pack or wet washcloth over your eyes and upper cheeks instead.)',
        'Come up and breathe normally.',
        'Repeat once if needed.'
      ],
      why: 'Cold on the face triggers the mammalian dive reflex: heart rate slows, blood shifts away from extremities, and the parasympathetic system activates. It works in seconds. This is the single fastest physiological way to interrupt extreme distress.',
      caution: 'AVOID if you have a heart condition, eating disorder, or any condition where slowing the heart rate could be dangerous. If unsure, ask a doctor or school nurse first. Water should be cold (~10-15°C or 50-60°F), not ice-cold.'
    },
    {
      id: 'intense',
      letter: 'I',
      label: 'Intense exercise',
      icon: '🏃',
      color: '#ef4444',
      duration: 600,
      headline: 'Burn off the activation',
      steps: [
        'For 5 to 10 minutes, do something physically intense.',
        'Options: sprint, jumping jacks, burpees, running stairs, push-ups to exhaustion, fast jump rope, hard dance.',
        'You want to actually be out of breath and feel your heart rate climb.',
        'Then slow down to a walk and let your body settle.'
      ],
      why: 'When you are hyperaroused (fight or flight), your body is flooded with stress hormones meant to be used. Intense exercise burns through the adrenaline and gives the body the "I did the thing" signal. Sitting still while hyperaroused keeps the engine revving.',
      caution: 'If you have a medical condition that limits exercise (cardiac, asthma, recent injury), use lower-intensity movement or pick a different TIPP skill. Do not do intense exercise to the point of injury.'
    },
    {
      id: 'paced',
      letter: 'P',
      label: 'Paced breathing',
      icon: '🫁',
      color: '#22c55e',
      duration: 120,
      headline: 'Exhale longer than you inhale',
      steps: [
        'Sit or lie down comfortably.',
        'Breathe in through your nose for a count of 4.',
        'Breathe out slowly through your mouth for a count of 6 to 8 (longer than your inhale).',
        'Keep this rhythm for 1 to 2 minutes.',
        'No need to push or strain; the LENGTHENED EXHALE is the active ingredient.'
      ],
      why: 'A longer exhale than inhale shifts the autonomic nervous system toward parasympathetic dominance ("rest and digest"). Studies of paced breathing find measurable drops in heart rate variability stress markers within 90 seconds. The point is not relaxation; it is biology.',
      caution: 'If breathing slowly makes you feel MORE anxious (which happens for some people with panic disorder or trauma), try a different TIPP skill. Do not force it.'
    },
    {
      id: 'paired',
      letter: 'P',
      label: 'Paired muscle relaxation',
      icon: '💪',
      color: '#a855f7',
      duration: 300,
      headline: 'Tense, then release, muscle by muscle',
      steps: [
        'Sit or lie down. Breathe in slowly.',
        'On the inhale, tense one muscle group hard (clench your fists, scrunch your shoulders, tighten your face).',
        'Hold the tension for 5 seconds.',
        'On the exhale, release the tension completely. Notice the difference between tense and released.',
        'Move through the body: hands, arms, shoulders, face, neck, chest, belly, legs, feet.',
        'Whole thing takes about 5 minutes.'
      ],
      why: 'Tensing a muscle to its max and then releasing produces deeper relaxation than just trying to relax (research from Jacobson on Progressive Muscle Relaxation, formalized in the 1930s). Pairing each release with an exhale stacks the two effects.',
      caution: 'If you have an injury, pain syndrome, or hypermobility, skip the muscle groups that hurt. The tension should be hard but never painful.'
    }
  ];

  function defaultState() {
    return {
      view: 'home',
      activeSkill: null,        // currently doing a skill (with timer)
      timerSeconds: 0,
      lastUsed: null,
      log: []                   // [{date, skill, helped}]  user records what helped
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('tipp', {
    icon: '🆘',
    label: 'TIPP',
    desc: 'Four DBT crisis-survival skills (Temperature, Intense exercise, Paced breathing, Paired muscle relaxation) for acute distress. Designed to down-regulate the body in 30 seconds to 10 minutes BEFORE you try to think your way out. Foundational DBT Distress Tolerance skill from Linehan.',
    color: 'red',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.tipp || defaultState();
      function setTIPP(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.tipp) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.log) next.lastUsed = todayISO();
          return Object.assign({}, prev, { tipp: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setTIPP({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fca5a5', fontSize: 22, fontWeight: 900 } }, '🆘 TIPP'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Four DBT crisis-survival skills for acute distress. Do, then think.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'I need this now', icon: '🆘' },
          { id: 'log', label: 'My log', icon: '📋' },
          { id: 'print', label: 'Pocket card', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'TIPP sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#ef4444' : '#334155'),
                background: active ? 'rgba(239,68,68,0.18)' : '#1e293b',
                color: active ? '#fecaca' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🆘 TIPP is for ACUTE distress, not everyday stress. '),
          'If you are in crisis right now (thinking about hurting yourself, in immediate danger), please use Crisis Companion in this SEL Hub or call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). TIPP can buy you the next 5 minutes; a human can be with you for longer.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'TIPP is a real DBT skill but it is not therapy. If you find yourself reaching for TIPP often, that is information; bring it to a counselor or school psych.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — pick a skill
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        if (d.activeSkill) return renderActiveSkill();

        return h('div', null,
          safetyBanner(),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(239,68,68,0.4)', marginBottom: 14, textAlign: 'center' } },
            h('div', { style: { fontSize: 38, marginBottom: 4 } }, '🆘'),
            h('h3', { style: { margin: '0 0 6px', color: '#fecaca', fontSize: 18 } }, 'Pick one. Do it. Notice if the dial moves.'),
            h('p', { style: { margin: 0, color: '#fde68a', fontSize: 13, lineHeight: 1.6 } },
              'You do not need to do all four. Pick the one that fits where you are right now. TIPP is FAST: 30 seconds to 10 minutes.'
            )
          ),

          // Skill grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 14 } },
            SKILLS.map(function(s) {
              return h('button', { key: s.id, onClick: function() { setTIPP({ activeSkill: s.id, timerSeconds: 0 }); },
                'aria-label': 'Start ' + s.label,
                style: { textAlign: 'left', padding: 14, borderRadius: 12, border: '2px solid ' + s.color, background: s.color + '14', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { style: { fontSize: 28 } }, s.icon),
                  h('div', null,
                    h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'T-I-P-P · ' + s.letter),
                    h('div', { style: { fontSize: 15, fontWeight: 800, color: s.color } }, s.label)
                  )
                ),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 } }, s.headline),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
                  s.duration < 60 ? '~' + s.duration + ' seconds' : '~' + Math.round(s.duration / 60) + ' min')
              );
            })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ACTIVE SKILL — guided walkthrough
      // ═══════════════════════════════════════════════════════════
      function renderActiveSkill() {
        var s = SKILLS.find(function(x) { return x.id === d.activeSkill; });
        if (!s) { setTIPP({ activeSkill: null }); return null; }

        function done(helped) {
          var entry = { date: todayISO(), skill: s.id, helped: !!helped };
          setTIPP({ activeSkill: null, timerSeconds: 0, log: (d.log || []).concat([entry]) });
          if (addToast) addToast(helped ? 'Logged — glad it helped.' : 'Logged — try a different TIPP next time.', 'info');
          if (announceToSR) announceToSR('TIPP session logged.');
        }

        function exit() { setTIPP({ activeSkill: null, timerSeconds: 0 }); }

        return h('div', null,
          h('div', { style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, ' + s.color + '22 0%, rgba(15,23,42,0.4) 60%)', border: '2px solid ' + s.color, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 48 } }, s.icon),
              h('div', { style: { flex: 1, minWidth: 180 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Active · ' + s.letter),
                h('h3', { style: { margin: '2px 0 0', color: s.color, fontSize: 22, fontWeight: 900 } }, s.label),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', marginTop: 4 } }, s.headline)
              )
            ),

            // Steps
            h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
              h('div', { style: { fontSize: 12, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Steps'),
              h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 } },
                s.steps.map(function(step, i) { return h('li', { key: i, style: { marginBottom: 6 } }, step); })
              )
            ),

            // Why it works
            h('details', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 8 } },
              h('summary', { style: { cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 700 } }, '🧠 Why this works'),
              h('p', { style: { margin: '8px 0 0', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } }, s.why)
            ),

            // Caution
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 11.5, color: '#fde68a', lineHeight: 1.6, marginBottom: 12 } },
              h('strong', null, '⚖️ Caution: '), s.caution
            ),

            // Done buttons
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: function() { done(true); }, 'aria-label': 'Done. This helped.',
                style: { padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 14 } }, '✓ Done. That helped.'),
              h('button', { onClick: function() { done(false); }, 'aria-label': 'Done. Try a different one.',
                style: { padding: '10px 18px', borderRadius: 10, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: '#fde68a', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '⤴ Try a different one'),
              h('button', { onClick: exit, 'aria-label': 'Exit without logging',
                style: { padding: '10px 18px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, 'Exit')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LOG
      // ═══════════════════════════════════════════════════════════
      function renderLog() {
        var log = (d.log || []).slice().reverse();
        var helpedCount = log.filter(function(e) { return e.helped; }).length;
        var counts = {};
        log.forEach(function(e) { counts[e.skill] = (counts[e.skill] || 0) + 1; });

        if (log.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📋'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14 } }, 'No TIPP sessions logged yet.'),
              h('div', { style: { color: '#94a3b8', fontSize: 12, marginTop: 4 } }, 'After you do a TIPP skill, log it to learn which ones work for you.')
            )
          );
        }

        return h('div', null,
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Total sessions'),
              h('div', { style: { fontSize: 22, color: '#fca5a5', fontWeight: 900 } }, log.length)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Helped'),
              h('div', { style: { fontSize: 22, color: '#22c55e', fontWeight: 900 } }, helpedCount + '/' + log.length)
            )
          ),

          h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'By skill'),
            SKILLS.map(function(s) {
              var c = counts[s.id] || 0;
              return h('div', { key: s.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' } },
                h('span', { style: { fontSize: 16 } }, s.icon),
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, s.label),
                h('span', { style: { fontSize: 13, color: s.color, fontWeight: 800 } }, c)
              );
            })
          ),

          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Recent sessions'),
          log.slice(0, 20).map(function(e, i) {
            var s = SKILLS.find(function(x) { return x.id === e.skill; });
            return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + (s ? s.color : '#64748b'), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', minWidth: 75 } }, e.date),
              h('span', { style: { fontSize: 18 } }, s ? s.icon : '?'),
              h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, s ? s.label : '(unknown)'),
              h('span', { style: { fontSize: 11, color: e.helped ? '#22c55e' : '#f59e0b' } }, e.helped ? '✓ helped' : '⤴ tried another')
            );
          })
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('tipp', h, ctx) : null),

          // Strong safety frame at top
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16 } }, '🆘 Read this first'),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'TIPP is for ACUTE distress: the moment you are about to do something you will regret, or feel like you cannot tolerate the next 5 minutes. It is NOT for everyday stress, low mood, or anxious thoughts. TIPP is fast, it is physical, and it is meant to buy you the next minutes so that talking, reflecting, or asking for help becomes possible again. If you are in crisis, please use Crisis Companion or call 988 / text HOME to 741741.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fca5a5', fontSize: 16 } }, 'What TIPP is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'TIPP is a set of four DBT crisis-survival skills that work directly on the body before they work on the mind. The idea is that when you are hyperaroused (heart racing, mind racing, ready to act on impulse), trying to "think your way out" rarely works because the thinking brain is offline. The body has to come back first.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Each TIPP skill uses a physiological mechanism that interrupts the stress response: cold on the face triggers the dive reflex, intense exercise burns adrenaline, paced breathing shifts the autonomic balance, and paired muscle relaxation produces post-tension release. They work in 30 seconds to 10 minutes, not in days.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fca5a5', fontSize: 16 } }, 'Where TIPP comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'TIPP is part of the Distress Tolerance module of Dialectical Behavior Therapy (DBT), developed by Marsha Linehan starting in the 1980s. Linehan developed DBT for people who experience emotion intensely and reactively, originally for chronically suicidal patients with borderline personality disorder. The Distress Tolerance skills are designed for "crisis survival" moments where the goal is just to not make things worse for the next few minutes. TIPP is now taught widely in pediatric mental health, trauma-informed schools, and outpatient DBT skills groups.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fca5a5', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for TIPP and DBT.'),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Manual (2nd ed.), Guilford Press', 'The standard manual; TIPP is in the Distress Tolerance module.', null),
            sourceCard('Linehan, M. M. (2014)', 'DBT Skills Training Handouts and Worksheets (2nd ed.), Guilford Press', 'Practical worksheets including TIPP handouts.', null),
            sourceCard('Behavioral Tech', 'behavioraltech.org', 'Linehan-founded organization for DBT training and certification.', 'https://behavioraltech.org/'),
            sourceCard('DBT Self Help', 'dbtselfhelp.com', 'Free open educational resource; covers TIPP and other Distress Tolerance skills.', 'https://dbtselfhelp.com/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'TIPP is a survival skill, not a fix. It helps you get through the next 5 minutes; it does not address why you are in distress.'),
              h('li', null, 'If you find yourself reaching for TIPP daily, that is a sign that something larger is happening in your life that deserves a counselor or therapist on it with you.'),
              h('li', null, 'TIPP works on hyperarousal (too activated). It does NOT work on hypoarousal (shut down, numb, dissociated); for that, a different DBT skill (Self-Soothe, ACCEPTS) or simply human connection is more useful.'),
              h('li', null, 'The cautions on each skill are real. Temperature is contraindicated for heart conditions and some eating disorders; intense exercise is contraindicated for some medical conditions; pace your way out if a skill feels wrong.'),
              h('li', null, 'TIPP is best LEARNED in a non-crisis moment so the skills are practiced before you need them. Doing them once during a calm period is the best preparation.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', fontSize: 12.5, color: '#fecaca', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'TIPP is most useful when students have practiced it once or twice during Crew time, not first encountered it in a crisis. A simple Crew protocol: walk through one TIPP skill together (paced breathing is the easiest in a classroom), name the other three, then point students to this tool. Pair with Crisis Companion for any student showing acute distress patterns.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fca5a5', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fecaca', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fecaca', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, '🖨 TIPP pocket card. '),
            'Print and fold; carry in a pocket, wallet, or planner. The point is to have the four skills with you BEFORE you need them. The pocket card prints onto one page; the cautions are kept because they matter.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),

          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#tipp-print-region, #tipp-print-region * { visibility: visible !important; } ' +
            '#tipp-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #000 !important; } ' +
            '#tipp-print-region * { background: transparent !important; color: #000 !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),

          h('div', { id: 'tipp-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'TIPP · Pocket Card'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'DBT Distress Tolerance · Linehan')
            ),
            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, 'When to use: '),
              'acute distress where you might do something you will regret. Do the body part first; talk later. If you are in crisis, call 988 or text HOME to 741741.'
            ),
            SKILLS.map(function(s, i) {
              return h('div', { key: s.id, style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
                  h('div', { style: { fontSize: 24, fontWeight: 900, color: '#0f172a', minWidth: 28 } }, s.letter),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: 15, fontWeight: 800, color: '#0f172a' } }, s.label + ' · ' + s.headline),
                    h('div', { style: { fontSize: 11, color: '#475569' } }, s.duration < 60 ? '~' + s.duration + ' seconds' : '~' + Math.round(s.duration / 60) + ' min')
                  )
                ),
                h('ol', { style: { margin: '4px 0 6px 22px', padding: 0, fontSize: 12, lineHeight: 1.55, color: '#0f172a' } },
                  s.steps.map(function(st, si) { return h('li', { key: si }, st); })
                ),
                h('div', { style: { fontSize: 10.5, color: '#7f1d1d', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 4, borderTop: '1px dashed #cbd5e1', marginTop: 4 } },
                  h('strong', null, 'Caution: '), s.caution
                )
              );
            }),
            h('div', { style: { marginTop: 12, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5, textAlign: 'center' } },
              'Practice TIPP once in a calm moment before you need it. Printed from AlloFlow SEL Hub. Source: Linehan, DBT Skills Training Manual (2014).'
            )
          )
        );
      }

      var body;
      if (view === 'log') body = renderLog();
      else if (view === 'about') body = renderAbout();
      else if (view === 'print') body = renderPrintView();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'TIPP crisis-survival skills' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
