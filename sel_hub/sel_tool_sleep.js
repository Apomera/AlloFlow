// ═══════════════════════════════════════════════════════════════
// sel_tool_sleep.js — Sleep & Rest Lab
// Adolescent sleep is a public-health crisis: ~75% of US high
// schoolers get less than the AAP-recommended 8-10 hours. Sleep
// deprivation has measurable effects on mood, anxiety, immune
// function, academic performance, and risk-taking.
// This tool: psychoeducation, sleep self-assessment, sleep diary,
// evidence-based sleep hygiene + CBT-I-adjacent skills, common
// barriers and what helps each, when to see a clinician.
// Sources: AAP, CDC, National Sleep Foundation, Stanford Sleep
// Medicine, Mary Carskadon (adolescent sleep researcher).
// Registered tool ID: "sleep"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('sleep'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-sleep')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-sleep';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Barriers + what helps
  var BARRIERS = [
    { id: 'screens', label: 'Screens at night', icon: '📱', color: '#3b82f6',
      what: 'Phones, tablets, and computers emit blue light that suppresses melatonin (the sleep hormone). Beyond the light, the CONTENT (social media, gaming, anxious news) keeps the brain activated.',
      helps: [
        'Hard rule: phone leaves the bedroom 60 minutes before sleep. Not in pocket; in another room.',
        'If you must use a screen, switch it to night mode AND keep it dim AND avoid socials.',
        'A real book or paper journal in the last 30 minutes is one of the most effective changes most people can make.'
      ]
    },
    { id: 'caffeine', label: 'Caffeine too late', icon: '☕', color: '#a16207',
      what: 'Caffeine has a half-life of 5-6 hours, meaning a 3pm energy drink is still HALF in your system at 9pm. Adolescent metabolism is variable.',
      helps: [
        'No caffeine after noon if you struggle to fall asleep.',
        'Be honest about hidden caffeine: many "energy" drinks, some teas, chocolate.',
        'If you need an afternoon boost, try a 10-minute walk, cold water on your face, or a brief nap (under 20 min, before 3pm).'
      ]
    },
    { id: 'schedule', label: 'Inconsistent schedule', icon: '⏰', color: '#0ea5e9',
      what: 'Your body has an internal clock (circadian rhythm) that LEARNS your sleep schedule. If you go to bed at 10pm on weekdays and 2am on weekends, your body never settles. Sunday-night insomnia is the result.',
      helps: [
        'Pick a target bedtime and wake time. Keep them within 1 hour even on weekends.',
        'The wake time matters more than the bedtime. If you wake at the same time daily, sleep tends to align.',
        'For adolescents whose biology shifts late: this is real (Carskadon\'s research), not laziness. Negotiate for sleep, not against your body.'
      ]
    },
    { id: 'stress', label: 'Stress / racing thoughts', icon: '🌪️', color: '#a855f7',
      what: 'When you lie down, the constant input from your day drops away — and the brain starts going. Worry, replay, anxiety. This is one of the most common reasons adolescents do not fall asleep.',
      helps: [
        'Worry time BEFORE bed (15-20 min, sitting up, not in bed). See the Anxiety Toolkit.',
        'Write down what is on your mind on paper. Externalize it.',
        'If you have been in bed more than 20 minutes unable to sleep: get UP, do something boring in dim light, come back when sleepy. (CBT-I "stimulus control.")'
      ]
    },
    { id: 'env', label: 'Bedroom environment', icon: '🛏️', color: '#22c55e',
      what: 'Bedrooms that are bright, warm, loud, or cluttered work against sleep. The brain reads the environment for "is it safe to sleep?"',
      helps: [
        'Cool (65-68°F / 18-20°C). Bodies sleep better cool.',
        'Dark. Blackout curtains or a sleep mask. Even small amounts of light disrupt deep sleep.',
        'Quiet. White noise, a fan, or earplugs if your environment is loud.',
        'Bed = sleep only. Not homework, not phone, not snacks. Train your brain to associate the bed with sleep.'
      ]
    },
    { id: 'naps', label: 'Long or late naps', icon: '😴', color: '#ef4444',
      what: 'A nap longer than 20-30 min, or any nap after 3pm, can mess with that night\'s sleep by reducing "sleep pressure" (the buildup of need-to-sleep that makes you tired at bedtime).',
      helps: [
        'If you nap: under 20 minutes, before 3pm.',
        'For most adolescents, ditching the nap entirely sleeps better at night.',
        'EXCEPTION: if you are catastrophically sleep-deprived (under 4 hours), a 20-min nap is better than nothing.'
      ]
    },
    { id: 'food', label: 'Late or heavy meals', icon: '🍔', color: '#f59e0b',
      what: 'Large meals close to bedtime keep the digestive system working when it should be slowing. Spicy and high-sugar foods also disrupt sleep architecture.',
      helps: [
        'Try to finish dinner 2-3 hours before bed.',
        'If hungry at bedtime, a light snack (small piece of cheese, banana, oats) is fine.',
        'Avoid alcohol and high-sugar foods late. They fragment sleep even when they make you feel sleepy.'
      ]
    },
    { id: 'medical', label: 'A medical / mental health condition', icon: '⚕️', color: '#dc2626',
      what: 'Some sleep problems are medical and not solved by sleep hygiene: sleep apnea, restless leg syndrome, narcolepsy, severe insomnia, depression, anxiety disorders, PTSD, ADHD, chronic pain.',
      helps: [
        'If you snore loudly, gasp in your sleep, or feel exhausted even after "enough" sleep: ask a doctor about sleep apnea screening.',
        'If you have racing thoughts that have not responded to the techniques in this tool: the underlying anxiety needs treatment.',
        'If sleep problems are severe or persistent (months), see a doctor. Sleep disorders are treatable.'
      ]
    }
  ];

  // 7 self-check items
  var SELF_CHECK = [
    { id: 'sc1', text: 'How many hours of sleep are you typically getting on a school night?', min: 4, max: 12, suffix: 'hrs', defaultV: 7 },
    { id: 'sc2', text: 'How long does it take you to fall asleep most nights, in minutes?', min: 0, max: 120, suffix: 'min', defaultV: 20 },
    { id: 'sc3', text: 'How many times do you wake up in the middle of the night?', min: 0, max: 8, suffix: 'times', defaultV: 1 },
    { id: 'sc4', text: 'How rested do you feel waking up? (0 = exhausted, 10 = fully rested)', min: 0, max: 10, suffix: '/10', defaultV: 5 },
    { id: 'sc5', text: 'How well do you function during the day? (0 = totally fried, 10 = sharp)', min: 0, max: 10, suffix: '/10', defaultV: 5 },
    { id: 'sc6', text: 'How many hours do you sleep on weekends?', min: 4, max: 14, suffix: 'hrs', defaultV: 9 },
    { id: 'sc7', text: 'Hours of screen time in bed in the last hour before sleep?', min: 0, max: 4, suffix: 'hrs', defaultV: 1 }
  ];

  function defaultState() {
    return {
      view: 'home',
      selfCheck: {},          // itemId -> number
      diary: [],              // [{date, bedtime, waketime, hours, quality, notes}]
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('sleep', {
    icon: '😴',
    label: 'Sleep & Rest',
    desc: 'Adolescent sleep is a public-health crisis: ~3 of 4 US high schoolers get less than the AAP-recommended 8-10 hours. This tool: sleep psychoeducation, a self-check, sleep diary, common barriers and what works for each, and clear signals for when to see a doctor. From AAP, CDC, National Sleep Foundation, Carskadon research.',
    color: 'indigo',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;

      var d = labToolData.sleep || defaultState();
      function setS(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.sleep) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { sleep: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setS({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '😴 Sleep & Rest'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'The most under-rated public-health intervention.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Why it matters', icon: '😴' },
          { id: 'check', label: 'My sleep check', icon: '✓' },
          { id: 'barriers', label: 'Barriers', icon: '🚧' },
          { id: 'diary', label: 'Sleep diary', icon: '📓' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Sleep sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#6366f1' : '#334155'),
                background: active ? 'rgba(99,102,241,0.18)' : '#1e293b',
                color: active ? '#c7d2fe' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Persistent sleep problems are medical, not just willpower. If 4+ weeks of good sleep hygiene have not helped, see a doctor. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — why sleep matters
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(99,102,241,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#c7d2fe', marginBottom: 4 } }, 'Sleep is not optional. It is foundation.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'The American Academy of Pediatrics recommends 8-10 hours of sleep per night for adolescents ages 13-18. About 3 in 4 US high schoolers get less. The result, at population scale: more anxiety, more depression, worse academic performance, worse driving, weaker immune systems, more risk-taking. The single biggest lever for adolescent wellbeing is probably sleep.'
            )
          ),

          // The biology
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #6366f1', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 10 } }, '🧠 Adolescent sleep biology is real'),
            h('p', { style: { margin: '0 0 8px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
              'At puberty, the body\'s circadian rhythm shifts later by about 2 hours. This is biology, not laziness. A 15-year-old who is wide awake at 11pm and groggy at 7am is doing what their body is built to do. Mary Carskadon\'s research at Brown established this in the 1990s and it has been replicated extensively.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
              'School start times that begin before 8:30am force adolescents to wake before their biological wake time. This is the structural cause of much adolescent sleep deprivation. The AAP, CDC, and AMA all officially recommend later school start times for middle and high school.'
            )
          ),

          // What it affects
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 8 } }, '⚠ Sleep deprivation affects (this is measurable, not theoretical):'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Mood (more irritable, more depressed, less emotional regulation)'),
              h('li', null, 'Anxiety (both ways — anxiety worsens sleep, sleep loss worsens anxiety)'),
              h('li', null, 'Memory and learning (you consolidate memories DURING sleep; less sleep = less learning sticks)'),
              h('li', null, 'Reaction time and decision-making (driving while sleep-deprived = driving while drunk, by measure)'),
              h('li', null, 'Immune function (more colds, slower recovery)'),
              h('li', null, 'Appetite hormones (less sleep = more hunger for high-calorie food)'),
              h('li', null, 'Risk-taking (less sleep = more impulsive choices)')
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Tools in this lab'),
          stepCard('✓ Quick sleep check', '7 questions to see where your sleep is right now. Takes 2 minutes.', function() { goto('check'); }, '#22c55e'),
          stepCard('🚧 Common barriers', 'The 8 most common things that block adolescent sleep, with what actually works for each.', function() { goto('barriers'); }, '#f59e0b'),
          stepCard('📓 Sleep diary', 'Track your sleep for 1-2 weeks to find patterns. Most useful tool for diagnosis.', function() { goto('diary'); }, '#0ea5e9'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SELF-CHECK
      // ═══════════════════════════════════════════════════════════
      function renderCheck() {
        function setItem(id, val) {
          var sc = Object.assign({}, (d.selfCheck || {}));
          sc[id] = val;
          setS({ selfCheck: sc });
        }

        var sc = d.selfCheck || {};
        var schoolNight = sc.sc1;
        var fallAsleep = sc.sc2;
        var rested = sc.sc4;
        var weekendDelta = (sc.sc6 !== undefined && schoolNight !== undefined) ? sc.sc6 - schoolNight : null;
        var screens = sc.sc7;

        var flags = [];
        if (schoolNight !== undefined && schoolNight < 8) flags.push({ severity: 'warning', text: 'You\'re below the AAP-recommended 8-10 hours on school nights.' });
        if (fallAsleep !== undefined && fallAsleep > 30) flags.push({ severity: 'warning', text: 'Taking more than 30 minutes to fall asleep regularly is a CBT-I flag. Look at the Barriers tab — stress and screens are the usual culprits.' });
        if (rested !== undefined && rested <= 4) flags.push({ severity: 'alert', text: 'Low rested rating + low daily function = real impact. Time to take this seriously.' });
        if (weekendDelta !== null && weekendDelta >= 3) flags.push({ severity: 'warning', text: 'Sleeping ' + weekendDelta + ' more hours on weekends than weekdays. Your body is paying back the debt; this is called "social jet lag." Try to narrow the gap.' });
        if (screens !== undefined && screens >= 1) flags.push({ severity: 'info', text: screens + ' hour(s) of screens in the last hour before bed is a high-impact change you could make. See the Screens barrier.' });

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 12.5, color: '#bbf7d0', lineHeight: 1.65 } },
            h('strong', null, '✓ Quick sleep check. '),
            'Use a typical week, not your best or worst. Honest answers help you see your real pattern.'
          ),

          SELF_CHECK.map(function(item) {
            var v = sc[item.id];
            var hasV = v !== undefined && v !== null;
            return h('div', { key: item.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #6366f1', marginBottom: 8 } },
              h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.6 } }, item.text),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                h('input', { type: 'range', min: item.min, max: item.max, value: hasV ? v : item.defaultV,
                  onChange: function(e) { setItem(item.id, parseFloat(e.target.value)); },
                  style: { flex: 1, minWidth: 200 }, 'aria-label': item.text }),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: hasV ? '#c7d2fe' : '#475569', minWidth: 60, textAlign: 'right' } }, hasV ? v + ' ' + item.suffix : '–'),
                !hasV ? h('button', { onClick: function() { setItem(item.id, item.defaultV); }, 'aria-label': 'Set this rating',
                  style: { padding: '4px 10px', borderRadius: 4, border: '1px solid #6366f1', background: 'transparent', color: '#c7d2fe', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'Set') : null
              )
            );
          }),

          // Flags / interpretation
          flags.length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10, marginTop: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 8 } }, '🚩 What stands out'),
            flags.map(function(f, i) {
              var color = f.severity === 'alert' ? '#ef4444' : f.severity === 'warning' ? '#f59e0b' : '#0ea5e9';
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '3px solid ' + color, marginBottom: 4, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } }, f.text);
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // BARRIERS
      // ═══════════════════════════════════════════════════════════
      function renderBarriers() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '🚧 The 8 most common barriers. '),
            'Find yours. Pick ONE to work on for a week — most people improve sleep significantly with one change. Stacking changes works, but one at a time is more sustainable.'
          ),

          BARRIERS.map(function(b) {
            return h('div', { key: b.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '4px solid ' + b.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 24 } }, b.icon),
                h('span', { style: { fontSize: 15, fontWeight: 800, color: b.color } }, b.label)
              ),
              h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } }, b.what),
              h('div', { style: { padding: 10, borderRadius: 6, background: '#1e293b' } },
                h('div', { style: { fontSize: 11, color: b.color, fontWeight: 700, marginBottom: 6 } }, '✓ What helps'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.75 } },
                  b.helps.map(function(s, i) { return h('li', { key: i, style: { marginBottom: 3 } }, s); })
                )
              )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // DIARY
      // ═══════════════════════════════════════════════════════════
      function renderDiary() {
        function addEntry() {
          var date = document.getElementById('sl-date').value;
          var bed = document.getElementById('sl-bed').value;
          var wake = document.getElementById('sl-wake').value;
          var hours = parseFloat(document.getElementById('sl-hours').value);
          var quality = parseInt(document.getElementById('sl-quality').value, 10);
          var notes = document.getElementById('sl-notes').value;
          if (!date) return;
          var entry = { date: date, bedtime: bed, waketime: wake, hours: hours, quality: quality, notes: notes };
          setS({ diary: (d.diary || []).concat([entry]) });
          document.getElementById('sl-notes').value = '';
        }
        function removeEntry(i) {
          var nx = (d.diary || []).slice();
          nx.splice(i, 1);
          setS({ diary: nx });
        }

        var diary = (d.diary || []).slice().reverse();
        var avgHours = 0;
        var avgQuality = 0;
        if (diary.length > 0) {
          var validHours = diary.filter(function(e) { return !isNaN(e.hours) && e.hours > 0; });
          var validQuality = diary.filter(function(e) { return !isNaN(e.quality); });
          avgHours = validHours.length > 0 ? (validHours.reduce(function(s, e) { return s + e.hours; }, 0) / validHours.length).toFixed(1) : 0;
          avgQuality = validQuality.length > 0 ? (validQuality.reduce(function(s, e) { return s + e.quality; }, 0) / validQuality.length).toFixed(1) : 0;
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 12.5, color: '#bae6fd', lineHeight: 1.65 } },
            h('strong', null, '📓 The sleep diary. '),
            'Log for 1-2 weeks to see your pattern. The diary is the single most useful tool for figuring out what is going on with your sleep — and what your doctor will ask for if you see one.'
          ),

          // Stats
          diary.length > 0 ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 } },
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #6366f1' } },
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Entries'),
              h('div', { style: { fontSize: 22, color: '#c7d2fe', fontWeight: 900 } }, diary.length)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Avg hours'),
              h('div', { style: { fontSize: 22, color: '#86efac', fontWeight: 900 } }, avgHours)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f59e0b' } },
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Avg quality / 10'),
              h('div', { style: { fontSize: 22, color: '#fde68a', fontWeight: 900 } }, avgQuality)
            )
          ) : null,

          // New entry
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bae6fd', marginBottom: 10 } }, '+ Add an entry'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 8 } },
              h('div', null,
                h('label', { htmlFor: 'sl-date', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Date'),
                h('input', { id: 'sl-date', type: 'date', defaultValue: todayISO(),
                  style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'sl-bed', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Bedtime'),
                h('input', { id: 'sl-bed', type: 'time', defaultValue: '22:30',
                  style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'sl-wake', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Wake time'),
                h('input', { id: 'sl-wake', type: 'time', defaultValue: '06:30',
                  style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'sl-hours', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Hours slept'),
                h('input', { id: 'sl-hours', type: 'number', min: 0, max: 14, step: 0.5, defaultValue: 7.5,
                  style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'sl-quality', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Quality 0-10'),
                h('input', { id: 'sl-quality', type: 'number', min: 0, max: 10, defaultValue: 6,
                  style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
              )
            ),
            h('label', { htmlFor: 'sl-notes', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Notes (caffeine, screens, what helped or hurt)'),
            h('input', { id: 'sl-notes', type: 'text', placeholder: 'Optional notes',
              style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12, marginBottom: 8 } }),
            h('button', { onClick: addEntry, 'aria-label': 'Add diary entry',
              style: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13 } }, '+ Add entry')
          ),

          // Entry list
          diary.length > 0 ? h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Recent entries'),
            diary.slice(0, 14).map(function(e, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', minWidth: 90 } }, e.date),
                h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '🛏 ' + (e.bedtime || '–') + ' → ⏰ ' + (e.waketime || '–')),
                h('span', { style: { fontSize: 13, color: '#c7d2fe', fontWeight: 700 } }, e.hours + 'h'),
                h('span', { style: { fontSize: 12, color: e.quality >= 7 ? '#86efac' : e.quality >= 4 ? '#fde68a' : '#fca5a5' } }, e.quality + '/10'),
                e.notes ? h('span', { style: { flex: 1, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', minWidth: 100 } }, e.notes) : h('span', { style: { flex: 1 } }),
                h('button', { onClick: function() { removeEntry(diary.length - 1 - i); }, 'aria-label': 'Remove entry',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('sleep', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'When sleep needs a doctor'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } }, 'See a doctor if:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'You snore loudly, gasp for air, or stop breathing in your sleep — possible sleep apnea.'),
              h('li', null, 'You feel exhausted after what should be enough sleep, more days than not — possible apnea, narcolepsy, or anemia.'),
              h('li', null, 'You experience leg discomfort that gets worse at night and disrupts sleep — possible restless leg syndrome.'),
              h('li', null, 'You have severe insomnia for more than 4 weeks despite good sleep hygiene.'),
              h('li', null, 'You have sleep paralysis episodes, vivid sleep hallucinations, or sudden muscle weakness when emotional — possible narcolepsy spectrum.'),
              h('li', null, 'Sleep problems started after a traumatic event — likely trauma-related, needs trauma-informed treatment.'),
              h('li', null, 'You\'re depressed, anxious, or experiencing significant impairment — sleep + mental health treated together is the right approach.')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#fde68a', fontSize: 13, lineHeight: 1.7 } },
              h('strong', null, 'CBT-I (Cognitive Behavioral Therapy for Insomnia) '),
              'is the gold-standard treatment for persistent insomnia and outperforms sleep medications long-term. Ask your doctor about CBT-I.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('AAP (American Academy of Pediatrics, 2014)', 'School Start Times for Adolescents (policy statement)', 'AAP official recommendation: middle and high schools should start no earlier than 8:30am.', 'https://publications.aap.org/pediatrics/article/134/3/642/74175/School-Start-Times-for-Adolescents'),
            sourceCard('CDC', 'Sleep in Middle and High School Students', 'CDC data on adolescent sleep deprivation, school start times, and health impact.', 'https://www.cdc.gov/healthyyouth/health_and_academics/sleep.htm'),
            sourceCard('National Sleep Foundation', 'thensf.org', 'Sleep recommendations by age group, research summaries, free resources.', 'https://www.thensf.org/'),
            sourceCard('Carskadon, M. A. (2011)', '"Sleep in Adolescents: The Perfect Storm," Pediatric Clinics of North America, 58(3), 637-647', 'Foundational paper on adolescent sleep biology.', null),
            sourceCard('Stanford Center for Sleep Sciences and Medicine', 'med.stanford.edu/sleepdivision', 'Open educational resources and research.', 'https://med.stanford.edu/sleepdivision.html'),
            sourceCard('Walker, M. (2017)', 'Why We Sleep: Unlocking the Power of Sleep and Dreams, Scribner', 'Accessible book on sleep science by a leading researcher.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Most adolescent sleep deprivation is STRUCTURAL: schools start too early, homework is too late, and many adolescents have jobs or caregiving responsibilities that compete with sleep. Sleep hygiene cannot solve a structural problem. It is real work to change schedules within structural constraints.'),
              h('li', null, 'Some students don\'t have a quiet, dark, cool bedroom they control. Sharing rooms, family schedules, neighborhood noise, climate without AC — all real and outside individual control. Adapt what you can; don\'t blame yourself for what you can\'t.'),
              h('li', null, 'Sleep hygiene works for most people. It doesn\'t work for everyone. If 4-6 weeks of good practice haven\'t helped, that\'s information; see a doctor or sleep specialist.'),
              h('li', null, 'Some sleep "advice" is overstated (the 8-hour rule is a population average, not an individual mandate; some people genuinely thrive on 7, some need 9-10). What matters is feeling rested and functioning well, not hitting a magic number.'),
              h('li', null, 'Naps are NOT bad; long or late naps disrupt night sleep. Cultures with siesta practices show naps can work as part of a sleep architecture.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', fontSize: 12.5, color: '#c7d2fe', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For Crew or advisory: a one-week sleep-diary commitment is genuinely transformative for many students. Discuss findings as a group (no judgment, just data). For school psych practice: sleep is often the first lever for adolescent anxiety and depression — treat sleep before assuming the symptoms are primarily psychological. Advocate for later school start times in your district.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#c7d2fe', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#c7d2fe', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — sleep diary + self-check summary, clinician-friendly
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var diary = (d.diary || []).slice().reverse();
        var sc = d.selfCheck || {};
        var avgHours = 0, avgQuality = 0;
        if (diary.length > 0) {
          var validHours = diary.filter(function(e) { return !isNaN(e.hours) && e.hours > 0; });
          var validQuality = diary.filter(function(e) { return !isNaN(e.quality); });
          avgHours = validHours.length > 0 ? (validHours.reduce(function(s, e) { return s + e.hours; }, 0) / validHours.length).toFixed(1) : 0;
          avgQuality = validQuality.length > 0 ? (validQuality.reduce(function(s, e) { return s + e.quality; }, 0) / validQuality.length).toFixed(1) : 0;
        }
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(99,102,241,0.10)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#c7d2fe', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Sleep diary + self-check summary — useful for a doctor, school nurse, or sleep clinic visit.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'sleep-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#sleep-print-region, #sleep-print-region * { visibility: visible !important; } ' +
              '#sleep-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Sleep Diary'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My sleep'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Self-check summary
            Object.keys(sc).length > 0 ? h('div', { style: { marginBottom: 18, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#4f46e5', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Self-check'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.85 } },
                SELF_CHECK.map(function(item) {
                  if (sc[item.id] === undefined || sc[item.id] === null) return null;
                  return h('li', { key: item.id }, item.text + ' ',
                    h('strong', null, sc[item.id] + ' ' + item.suffix));
                })
              )
            ) : null,

            // Diary summary stats
            diary.length > 0 ? h('div', { style: { marginBottom: 18, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Diary summary'),
              h('div', { style: { padding: '4px 12px', fontSize: 13, color: '#0f172a', lineHeight: 1.85 } },
                h('div', null, h('strong', null, 'Entries: '), diary.length),
                h('div', null, h('strong', null, 'Average hours slept: '), avgHours),
                h('div', null, h('strong', null, 'Average quality (0-10): '), avgQuality)
              )
            ) : null,

            // Diary entries table
            diary.length > 0 ? h('div', { style: { marginBottom: 18 } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 8, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Diary entries'),
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5, color: '#0f172a' } },
                h('thead', null,
                  h('tr', { style: { borderBottom: '2px solid #cbd5e1' } },
                    h('th', { style: { padding: 6, textAlign: 'left', fontWeight: 700 } }, 'Date'),
                    h('th', { style: { padding: 6, textAlign: 'left', fontWeight: 700 } }, 'Bedtime'),
                    h('th', { style: { padding: 6, textAlign: 'left', fontWeight: 700 } }, 'Wake'),
                    h('th', { style: { padding: 6, textAlign: 'right', fontWeight: 700 } }, 'Hours'),
                    h('th', { style: { padding: 6, textAlign: 'right', fontWeight: 700 } }, 'Quality'),
                    h('th', { style: { padding: 6, textAlign: 'left', fontWeight: 700 } }, 'Notes')
                  )
                ),
                h('tbody', null,
                  diary.map(function(e, i) {
                    return h('tr', { key: i, style: { borderBottom: '1px solid #e2e8f0' } },
                      h('td', { style: { padding: 5, fontFamily: 'ui-monospace, monospace' } }, e.date),
                      h('td', { style: { padding: 5 } }, e.bedtime || '–'),
                      h('td', { style: { padding: 5 } }, e.waketime || '–'),
                      h('td', { style: { padding: 5, textAlign: 'right', fontWeight: 700 } }, e.hours || '–'),
                      h('td', { style: { padding: 5, textAlign: 'right' } }, (e.quality !== undefined ? e.quality + '/10' : '–')),
                      h('td', { style: { padding: 5, fontSize: 11, fontStyle: 'italic' } }, e.notes || '')
                    );
                  })
                )
              )
            ) : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No diary entries yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Based on AAP / CDC adolescent sleep guidance. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'check') body = renderCheck();
      else if (view === 'barriers') body = renderBarriers();
      else if (view === 'diary') body = renderDiary();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Sleep and Rest Lab' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
