// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_climateExplorer.js — Climate Explorer
// Carbon calculator, renewables simulator, climate justice, solutions spotlight
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('climateExplorer'))) {

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime); o.stop(ac.currentTime + dur);
  }
  function playSound(type) {
    try {
      switch (type) {
        case 'tab':       playTone(660, 0.05, 'sine', 0.04); break;
        case 'calculate': playTone(440, 0.08, 'sine', 0.05); setTimeout(function(){playTone(554, 0.08, 'sine', 0.05);}, 60); break;
        case 'slider':    playTone(800, 0.03, 'sine', 0.03); break;
        case 'scenario':  playTone(330, 0.08, 'triangle', 0.04); setTimeout(function(){playTone(440, 0.08, 'triangle', 0.04);}, 70); setTimeout(function(){playTone(554, 0.08, 'triangle', 0.04);}, 140); break;
        case 'correct':   playTone(523, 0.1, 'sine', 0.06); setTimeout(function(){playTone(659, 0.1, 'sine', 0.06);}, 80); setTimeout(function(){playTone(784, 0.15, 'sine', 0.06);}, 160); break;
        case 'wrong':     playTone(220, 0.25, 'sawtooth', 0.04); break;
        case 'badge':     playTone(523, 0.1, 'sine', 0.06); setTimeout(function(){playTone(659, 0.1, 'sine', 0.06);}, 80); setTimeout(function(){playTone(784, 0.1, 'sine', 0.06);}, 160); setTimeout(function(){playTone(1047, 0.2, 'sine', 0.06);}, 240); break;
        case 'region':    playTone(380, 0.12, 'triangle', 0.04); break;
        case 'hope':      playTone(330, 0.1, 'triangle', 0.03); setTimeout(function(){playTone(440, 0.1, 'triangle', 0.03);}, 100); setTimeout(function(){playTone(554, 0.1, 'triangle', 0.03);}, 200); setTimeout(function(){playTone(659, 0.15, 'triangle', 0.03);}, 300); break;
        case 'action':    playTone(880, 0.04, 'sine', 0.05); break;
      }
    } catch(e) {}
  }

(function() {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-climateExplorer')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-climateExplorer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  if (!window.StemLab || !window.StemLab.registerTool) return;

  window.StemLab.registerTool('climateExplorer', {
    icon: '\uD83C\uDF0D',
    label: 'Climate Explorer',
    desc: 'Carbon calculator, renewables simulator, climate justice & solutions.',
    color: 'emerald',
    category: 'science',
    questHooks: [
      { id: 'calculate_footprint', label: 'Calculate your carbon footprint', icon: '\uD83D\uDC63', check: function(d) { return (d.ccTransport || 0) + (d.ccFood || 0) + (d.ccEnergy || 0) > 0; }, progress: function(d) { return (d.ccTransport || 0) + (d.ccFood || 0) + (d.ccEnergy || 0) > 0 ? 'Calculated!' : 'Adjust sliders'; } },
      { id: 'explore_renewables', label: 'Design a renewable energy mix', icon: '\u2600\uFE0F', check: function(d) { return d.renewablesDesigned || false; }, progress: function(d) { return d.renewablesDesigned ? 'Designed!' : 'Not yet'; } },
      { id: 'view_all_tabs', label: 'Explore all Climate Explorer sections', icon: '\uD83D\uDCCA', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 sections'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var el = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('climateExplorer', n); };
      var getStemXP = ctx.getXP;
      var callGemini = ctx.callGemini;
      var gradeLevel = ctx.gradeLevel || '5th Grade';
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      // ── State ──
      var d = (labToolData && labToolData.climateExplorer) || {};
      function upd(k, v) {
        setLabToolData(function(prev) {
          var copy = Object.assign({}, prev);
          copy.climateExplorer = Object.assign({}, copy.climateExplorer || {}, typeof k === 'object' ? k : (function() { var o = {}; o[k] = v; return o; })());
          return copy;
        });
      }

      var tab = d.tab || 'carbon';
      // Carbon state
      var ccTransport = d.ccTransport || 0;
      var ccFood = d.ccFood || 0;
      var ccEnergy = d.ccEnergy || 0;
      var ccWaste = d.ccWaste || 0;
      var ccScale = d.ccScale || 'school';
      var ccSchoolSize = d.ccSchoolSize || 500;
      // Renewables state
      var rsSolar = d.rsSolar != null ? d.rsSolar : 10;
      var rsWind = d.rsWind != null ? d.rsWind : 5;
      var rsHydro = d.rsHydro != null ? d.rsHydro : 15;
      var rsNuclear = d.rsNuclear != null ? d.rsNuclear : 10;
      var rsTimespan = d.rsTimespan || 25;
      // Justice state
      var cjRegion = d.cjRegion || null;
      var cjView = d.cjView || 'risk';
      // Solutions state
      var ssCategory = d.ssCategory || 'all';
      var ssExpanded = d.ssExpanded || null;
      var ssShowActions = d.ssShowActions || false;
      // AI state
      var aiLoading = d.aiLoading || false;
      var aiResponse = d.aiResponse || null;
      // Quiz
      var quizIdx = d.quizIdx || 0;
      var quizAnswer = d.quizAnswer;
      var quizCorrect = d.quizCorrect || 0;
      var quizTotal = d.quizTotal || 0;
      var quizOpen = d.quizOpen || false;
      // Badges
      var badges = d.badges || {};
      var tabsVisited = d.tabsVisited || {};

      // ── Grade Band ──
      function getGradeBand() {
        var gl = gradeLevel.toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'k2';
        if (/3rd|4th|5th/.test(gl)) return 'g35';
        if (/6th|7th|8th/.test(gl)) return 'g68';
        return 'g912';
      }
      var gradeBand = getGradeBand();

      // Badges
      var badgesOpen = d.badgesOpen || false;
      // Hope Meter
      var hopeMilestones = d.hopeMilestones || {};
      // Solutions viewed
      var solutionsViewed = d.solutionsViewed || {};
      var scenariosTried = d.scenariosTried || {};
      var scalesViewed = d.scalesViewed || {};

      // ── Badge definitions ──
      var BADGES = [
        { id: 'firstCalc', icon: '\uD83E\uDDEE', label: 'First Calculation', desc: 'Calculate your carbon footprint' },
        { id: 'lowFootprint', icon: '\uD83C\uDF33', label: 'Low Footprint', desc: 'Get below 2,000 kg CO\u2082/year' },
        { id: 'dataDiver', icon: '\uD83D\uDCCA', label: 'Data Diver', desc: 'Try all 3 scale views' },
        { id: 'netZero', icon: '\u2600\uFE0F', label: 'Net Zero Designer', desc: 'Design <5% fossil energy mix' },
        { id: 'scenarioTester', icon: '\u26A1', label: 'Scenario Tester', desc: 'Try all 4 energy scenarios' },
        { id: 'justiceExplorer', icon: '\u2696\uFE0F', label: 'Justice Explorer', desc: 'Explore 5+ vulnerable regions' },
        { id: 'solutionScholar', icon: '\uD83D\uDCA1', label: 'Solution Scholar', desc: 'Read all 8 solution cards' },
        { id: 'actionPlanner', icon: '\u270A', label: 'Action Planner', desc: 'Open the action plan' },
        { id: 'quizChampion', icon: '\uD83E\uDDE0', label: 'Quiz Champion', desc: 'Answer 8+ questions correctly' },
        { id: 'aiConsultant', icon: '\uD83E\uDD16', label: 'AI Consultant', desc: 'Get AI analysis of your mix' },
        { id: 'allTabs', icon: '\uD83C\uDF0D', label: 'Full Explorer', desc: 'Visit all six tabs' },
        { id: 'climateChampion', icon: '\uD83C\uDFC6', label: 'Climate Champion', desc: 'Earn 10+ badges' },
        { id: 'habitMaster', icon: '\uD83D\uDCCA', label: 'Habit Master', desc: 'Set 5+ detailed habit sliders' },
        { id: 'pledger', icon: '\u270A', label: 'Climate Pledger', desc: 'Commit to 3+ personal pledges' },
        { id: 'consistent', icon: '\uD83D\uDD25', label: 'On the Streak', desc: 'Check in on a pledge 7+ times' },
        { id: 'reporter', icon: '\uD83D\uDCC4', label: 'Climate Reporter', desc: 'Export your climate report' },
        { id: 'planner', icon: '\uD83C\uDFAF', label: 'Drawdown Planner', desc: 'Stack 5+ Drawdown solutions' },
        { id: 'gigaton', icon: '\uD83D\uDCAB', label: 'Gigaton Thinker', desc: 'Build a solution mix totaling 200+ Gt' }
      ];

      // ── Hope Meter milestones (moved after carbonTotal() definition) ──

      // ── Badge helper ──
      // ── Exportable Climate Report (markdown) ──
      function buildClimateReport() {
        var lines = [];
        var dt = new Date();
        var dateStamp = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        lines.push('# 🌍 Climate Explorer — Personal Report');
        lines.push('*Generated ' + dateStamp + ' — AlloFlow STEM Lab · Climate Explorer*');
        lines.push('');
        lines.push('## Overview');
        lines.push('- **Grade band:** ' + gradeLevel);
        lines.push('- **Sections explored:** ' + Object.keys(tabsVisited || {}).length + '/6');
        lines.push('- **Quiz score:** ' + (d.quizCorrect || 0) + '/' + (d.quizTotal || 0));
        lines.push('');
        // Quick estimate
        if (ct && ct.total) {
          lines.push('## Quick Footprint Estimate');
          lines.push('- **Total:** ' + ct.total.toLocaleString() + ' kg CO\u2082e/yr');
          lines.push('- Transport: ' + ct.transport + ' kg · Food: ' + ct.food + ' kg · Energy: ' + ct.energy + ' kg · Waste: ' + ct.waste + ' kg');
          lines.push('- Equivalent to ' + Math.round(ct.total / TREES_PER_YEAR) + ' trees working a whole year');
          lines.push('');
        }
        // Detailed footprint + breakdown
        if (granular.total > 0) {
          lines.push('## Detailed Footprint (from habit tracker)');
          lines.push('- **Total:** ' + (granular.total / 1000).toFixed(2) + ' t CO\u2082e/yr (' + Math.round(granular.total).toLocaleString() + ' kg)');
          lines.push('- **% of Paris-aligned target (2.3 t):** ' + (granular.total / 2300 * 100).toFixed(0) + '%');
          lines.push('');
          lines.push('### Breakdown by category');
          lines.push('| Category | kg CO\u2082e/yr |');
          lines.push('|---|---|');
          [
            { cat: 'transport', label: '🚗 Transportation' },
            { cat: 'food',      label: '🍽️ Food & Diet' },
            { cat: 'energy',    label: '⚡ Home Energy' },
            { cat: 'digital',   label: '📱 Digital & Streaming' },
            { cat: 'shopping',  label: '🛍️ Shopping' },
            { cat: 'waste',     label: '♻️ Waste (negative = avoided)' }
          ].forEach(function(row) {
            lines.push('| ' + row.label + ' | ' + Math.round(granular.byCat[row.cat] || 0).toLocaleString() + ' |');
          });
          lines.push('');
          // Active habits with nonzero frequency
          var activeHabits = [];
          Object.keys(GRANULAR_ITEMS).forEach(function(cat) {
            GRANULAR_ITEMS[cat].forEach(function(item) {
              var f = granularFreq[item.id] || 0;
              if (f > 0) activeHabits.push({ item: item, freq: f, kg: itemAnnualKg(item, f) });
            });
          });
          activeHabits.sort(function(a, b) { return b.kg - a.kg; });
          if (activeHabits.length > 0) {
            lines.push('### Active habits');
            activeHabits.forEach(function(h) {
              lines.push('- ' + h.item.emoji + ' **' + h.item.label + '** — ' + h.freq + ' ' + h.item.unit + ' → ' + Math.round(h.kg).toLocaleString() + ' kg/yr');
            });
            lines.push('');
          }
        }
        // National comparison
        if (granular.total > 0) {
          lines.push('## National Comparison');
          var nearestIdx = -1;
          var nearestDiff = 1e9;
          NATIONAL_AVERAGES.forEach(function(n, i) {
            var diff = Math.abs(n.kg - granular.total);
            if (diff < nearestDiff) { nearestDiff = diff; nearestIdx = i; }
          });
          if (nearestIdx >= 0) {
            var near = NATIONAL_AVERAGES[nearestIdx];
            lines.push('- Your footprint is closest to **' + near.emoji + ' ' + near.country + '** (' + (near.kg / 1000).toFixed(1) + ' t)');
          }
          lines.push('- Paris-aligned target by 2030: **2.3 t** per person');
          lines.push('- Global average: **4.5 t** per person');
          lines.push('');
        }
        // Energy mix
        if (rsSolar + rsWind + rsHydro + rsNuclear > 0) {
          lines.push('## Renewable Energy Design');
          lines.push('- Solar ' + rsSolar + '% · Wind ' + rsWind + '% · Hydro ' + rsHydro + '% · Nuclear ' + rsNuclear + '% · Fossil ' + rsFossil + '%');
          lines.push('- **Emission reduction vs. fossil baseline:** ' + rsReductionPct + '%');
          lines.push('- **Cumulative CO\u2082 avoided over ' + rsTimespan + ' years:** ' + cumulativeAvoided.toFixed(1) + ' Gt');
          lines.push('');
        }
        // Pledged actions
        var pledges = d.pledges || {};
        var pledgeIds = Object.keys(pledges);
        if (pledgeIds.length > 0) {
          lines.push('## 🎯 My Pledges');
          pledgeIds.forEach(function(pid) {
            var p = pledges[pid];
            // Find the item
            var found = null;
            Object.keys(GRANULAR_ITEMS).forEach(function(c) {
              GRANULAR_ITEMS[c].forEach(function(it) { if (it.id === pid) found = it; });
            });
            if (found) {
              lines.push('- ' + found.emoji + ' **' + found.label + '** — pledged to cut to ' + p.targetFreq + ' ' + found.unit + (p.checkins ? ' · ' + p.checkins + ' check-ins' : ''));
            }
          });
          lines.push('');
        }
        // Badges earned
        var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
        if (earnedBadges.length > 0) {
          lines.push('## 🏅 Badges Earned (' + earnedBadges.length + '/' + BADGES.length + ')');
          earnedBadges.forEach(function(b) { lines.push('- ' + b.icon + ' **' + b.label + '** — ' + b.desc); });
          lines.push('');
        }
        lines.push('---');
        lines.push('*Climate Explorer teaches atmospheric CO\u2082, tipping points, climate justice, renewable mix design, and personal action. Built for AlloFlow.*');
        return lines.join('\n');
      }

      function exportClimateReport() {
        var report = buildClimateReport();
        earnBadge('reporter');
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(report).then(function() {
            if (addToast) addToast('📋 Climate report copied to clipboard!', 'success');
            awardXP(10);
          }, function() {
            upd('exportedReport', report);
          });
        } else {
          upd('exportedReport', report);
        }
      }

      // ── Personal Pledge system ──
      function togglePledge(item) {
        var next = Object.assign({}, d.pledges || {});
        if (next[item.id]) {
          delete next[item.id];
          if (addToast) addToast('Pledge removed: ' + item.label, 'info');
        } else {
          // Default pledge target: half of current frequency, minimum 0
          var currentFreq = granularFreq[item.id] || 0;
          var targetFreq = Math.max(0, Math.floor(currentFreq / 2));
          next[item.id] = { targetFreq: targetFreq, started: Date.now(), checkins: 0 };
          if (addToast) addToast('🎯 Pledged: cut ' + item.label.toLowerCase() + ' to ' + targetFreq + ' ' + item.unit, 'success');
          playSound('hope');
          awardXP(10);
        }
        upd('pledges', next);
        if (Object.keys(next).length >= 3) earnBadge('pledger');
      }

      function pledgeCheckin(itemId) {
        var next = Object.assign({}, d.pledges || {});
        if (!next[itemId]) return;
        next[itemId] = Object.assign({}, next[itemId], { checkins: (next[itemId].checkins || 0) + 1, lastCheckin: Date.now() });
        if (addToast) addToast('✓ Check-in #' + next[itemId].checkins + ' recorded. Keep going!', 'success');
        playSound('correct');
        awardXP(3);
        upd('pledges', next);
        if (next[itemId].checkins >= 7) earnBadge('consistent');
      }

      // Award habitMaster badge when 5+ sliders have been set.
      // Reads granularFreq directly from toolData here because the local
      // `var granularFreq = d.granularFreq || {}` is declared further down
      // (line ~517) — the var IS hoisted but the assignment isn't, so at
      // this point the local would be `undefined` and Object.keys() would
      // throw "Cannot convert undefined or null to object" on first render.
      (function() {
        var _gf = (d && d.granularFreq) || {};
        var activeCount = 0;
        Object.keys(_gf).forEach(function(k) { if (_gf[k] > 0) activeCount++; });
        if (activeCount >= 5 && !badges.habitMaster) setTimeout(function() { earnBadge('habitMaster'); }, 0);
      })();

      function earnBadge(id) {
        if (badges[id]) return;
        var nb = Object.assign({}, badges);
        nb[id] = Date.now();
        upd('badges', nb);
        awardXP(15);
        playSound('badge');
        var b = BADGES.find(function(x) { return x.id === id; });
        if (addToast) addToast(b ? b.icon + ' ' + b.label + '!' : '\uD83C\uDFC5 Badge earned!', 'success');
        if (Object.keys(nb).length >= 10) { if (!nb.climateChampion) { nb.climateChampion = Date.now(); upd('badges', nb); } }
      }

      // ── Track tab visits ──
      function visitTab(tid) {
        upd('tab', tid);
        playSound('tab'); if (announceToSR) announceToSR(t.label + ' section.');
        if (!tabsVisited[tid]) {
          var nv = Object.assign({}, tabsVisited);
          nv[tid] = true;
          upd('tabsVisited', nv);
          awardXP(5);
          if (Object.keys(nv).length >= 6) earnBadge('allTabs');
        }
      }

      // ══════════════════════════════════════
      //  CARBON CALCULATOR DATA
      // ══════════════════════════════════════
      var CARBON = {
        transport: {
          label: 'How do you get to school?', emoji: '\uD83D\uDE8C',
          opts: [
            { label: 'Walk / Bike', emoji: '\uD83D\uDEB6', kg: 0, desc: 'Zero emissions! Your legs are the greenest engine.' },
            { label: 'School Bus', emoji: '\uD83D\uDE8C', kg: 300, desc: 'Shared ride \u2014 about 0.3 kg CO\u2082 per student per trip.' },
            { label: 'Car (alone)', emoji: '\uD83D\uDE97', kg: 1200, desc: 'A car emits ~0.21 kg CO\u2082/km. Solo trips add up fast.' },
            { label: 'Carpool', emoji: '\uD83D\uDE99', kg: 400, desc: 'Splitting rides cuts per-person emissions by 50-75%.' }
          ]
        },
        food: {
          label: 'What do you usually eat?', emoji: '\uD83C\uDF5E',
          opts: [
            { label: 'Mostly plant-based', emoji: '\uD83E\uDD57', kg: 600, desc: 'Fruits, veggies, grains, beans \u2014 lowest food footprint.' },
            { label: 'A mix of everything', emoji: '\uD83C\uDF71', kg: 1200, desc: 'Some meat, some veggies. Average diet.' },
            { label: 'Lots of meat & dairy', emoji: '\uD83E\uDD69', kg: 2500, desc: 'Beef produces 60 kg CO\u2082 per kg of meat.' }
          ]
        },
        energy: {
          label: 'What powers your home?', emoji: '\u26A1',
          opts: [
            { label: 'Solar / Wind', emoji: '\u2600\uFE0F', kg: 200, desc: 'Near-zero operational emissions.' },
            { label: 'Grid average', emoji: '\uD83D\uDD0C', kg: 2000, desc: 'US grid: ~0.4 kg CO\u2082 per kWh.' },
            { label: 'Mostly fossil fuels', emoji: '\uD83C\uDFED', kg: 4000, desc: 'Coal-heavy grids: up to 1 kg CO\u2082/kWh.' }
          ]
        },
        waste: {
          label: 'What happens to your trash?', emoji: '\u267B\uFE0F',
          opts: [
            { label: 'Compost & recycle', emoji: '\uD83C\uDF31', kg: 100, desc: 'Composting diverts methane-producing waste.' },
            { label: 'Recycle some', emoji: '\u267B\uFE0F', kg: 500, desc: 'Recycling saves ~1 ton CO\u2082 per ton of material.' },
            { label: 'Mostly landfill', emoji: '\uD83D\uDDD1\uFE0F', kg: 1000, desc: 'Landfills produce methane (28\u00D7 more potent than CO\u2082).' }
          ]
        }
      };

      var TREES_PER_YEAR = 22; // kg CO2 per tree per year

      // ══════════════════════════════════════
      //  GRANULAR HABIT TRACKER
      //  kg CO₂e per activity (sourced from IPCC AR6, Our World in Data, Poore & Nemecek 2018,
      //  Berners-Lee "How Bad Are Bananas?" 3rd ed., IEA, Netflix sustainability report)
      // ══════════════════════════════════════
      // Each item: id, emoji, label, kg (per activity occurrence), unit ('days/week' or 'per year'),
      // max (max frequency for slider), default freq, category, freqLabel
      var GRANULAR_ITEMS = {
        transport: [
          { id: 'car_solo',    emoji: '🚗', label: 'Drive solo (avg 25 km trip)',   kg: 5.3,  max: 14, unit: 'trips/week', note: 'Typical US gas car: 0.21 kg CO₂e/km.' },
          { id: 'car_pool',    emoji: '🚙', label: 'Carpool (25 km, split ×3)',     kg: 1.8,  max: 14, unit: 'trips/week', note: 'Carpool of 3 cuts per-person emissions 65%.' },
          { id: 'bus',         emoji: '🚌', label: 'Bus ride (25 km)',              kg: 1.2,  max: 14, unit: 'trips/week', note: 'City bus avg: 0.05 kg/passenger-km.' },
          { id: 'train',       emoji: '🚆', label: 'Train / subway (25 km)',       kg: 0.9,  max: 14, unit: 'trips/week', note: 'Electric rail is 4× cleaner than a car.' },
          { id: 'ev',          emoji: '🔌', label: 'EV on mixed grid (25 km)',     kg: 1.3,  max: 14, unit: 'trips/week', note: 'Improves as the grid decarbonizes.' },
          { id: 'walk_bike',   emoji: '🚴', label: 'Walk / bike (any distance)',   kg: 0,    max: 14, unit: 'trips/week', note: 'Zero emissions. Also health benefits.' },
          { id: 'flight_short',emoji: '✈️', label: 'Short flight (1,500 km)',     kg: 250,  max: 12, unit: 'flights/year', note: 'Aviation has 2-3× warming impact beyond CO₂ alone.' },
          { id: 'flight_long', emoji: '🛫', label: 'Long flight (8,000 km)',      kg: 1600, max: 12, unit: 'flights/year', note: 'One long-haul round-trip = ~3 tons — a year of driving for many.' }
        ],
        food: [
          { id: 'beef',        emoji: '🥩', label: 'Beef meal',                   kg: 7.5,  max: 21, unit: 'meals/week', note: '60 kg CO₂e per kg of beef — highest of any food.' },
          { id: 'lamb',        emoji: '🐑', label: 'Lamb meal',                   kg: 5.9,  max: 21, unit: 'meals/week', note: 'Second-highest emitter, after beef.' },
          { id: 'pork',        emoji: '🥓', label: 'Pork meal',                   kg: 2.3,  max: 21, unit: 'meals/week', note: 'Moderate — 7 kg CO₂e/kg.' },
          { id: 'chicken',     emoji: '🍗', label: 'Chicken / poultry meal',     kg: 1.6,  max: 21, unit: 'meals/week', note: 'Lowest-emission meat.' },
          { id: 'fish',        emoji: '🐟', label: 'Fish meal',                   kg: 1.4,  max: 21, unit: 'meals/week', note: 'Varies: farmed salmon higher, wild cod lower.' },
          { id: 'cheese',      emoji: '🧀', label: 'Cheese / dairy serving',     kg: 0.7,  max: 21, unit: 'servings/week', note: 'Dairy cattle also produce methane.' },
          { id: 'vegetarian',  emoji: '🥗', label: 'Vegetarian meal',             kg: 0.6,  max: 21, unit: 'meals/week', note: 'About 1/10 the impact of a beef meal.' },
          { id: 'vegan',       emoji: '🥬', label: 'Vegan meal',                  kg: 0.4,  max: 21, unit: 'meals/week', note: 'Beans + rice + veggies = lowest possible footprint.' },
          { id: 'coffee',      emoji: '☕', label: 'Coffee (take-out cup)',       kg: 0.21, max: 21, unit: 'cups/week', note: 'Disposable cups add ~50% vs. home-brewed.' },
          { id: 'foodwaste',   emoji: '🗑️', label: 'Food thrown away (1 meal)',   kg: 1.3,  max: 21, unit: 'meals/week', note: 'Food waste = 8% of global emissions.' }
        ],
        energy: [
          { id: 'heat_gas',    emoji: '🔥', label: 'Gas heating running (1 hr)',  kg: 1.5,  max: 168, unit: 'hours/week', note: 'Natural gas: ~2 kg/therm. Winter-only.' },
          { id: 'ac',          emoji: '❄️', label: 'AC running (1 hr)',           kg: 0.9,  max: 168, unit: 'hours/week', note: 'US grid average; lower in CA, higher in WV.' },
          { id: 'heat_pump',   emoji: '🌡️', label: 'Heat pump (1 hr heating)',   kg: 0.3,  max: 168, unit: 'hours/week', note: '4× more efficient than gas furnace.' },
          { id: 'shower',      emoji: '🚿', label: '10-minute hot shower',        kg: 0.7,  max: 14,  unit: 'showers/week', note: 'Shorter shower = linear savings.' },
          { id: 'laundry_warm',emoji: '👕', label: 'Laundry load (warm wash)',    kg: 0.8,  max: 14,  unit: 'loads/week', note: 'Cold wash saves 75% of this.' },
          { id: 'dryer',       emoji: '🌀', label: 'Electric clothes dryer',      kg: 2.4,  max: 14,  unit: 'loads/week', note: 'Line drying = zero emissions.' },
          { id: 'dishwasher',  emoji: '🍽️', label: 'Dishwasher cycle',            kg: 0.5,  max: 14,  unit: 'cycles/week', note: 'Full loads 2× more efficient.' }
        ],
        digital: [
          { id: 'netflix_hd',  emoji: '📺', label: 'Streaming HD video (1 hr)',   kg: 0.036, max: 50, unit: 'hours/week', note: 'Netflix 2023 report — lower than older estimates.' },
          { id: 'stream_4k',   emoji: '🎬', label: 'Streaming 4K video (1 hr)',   kg: 0.12,  max: 50, unit: 'hours/week', note: '4K uses ~4× the bandwidth of HD.' },
          { id: 'gaming',      emoji: '🎮', label: 'Console gaming (1 hr)',       kg: 0.1,   max: 50, unit: 'hours/week', note: 'PS5/Xbox draw 150-200W.' },
          { id: 'videocall',   emoji: '📹', label: 'Video call (1 hr)',           kg: 0.06,  max: 40, unit: 'hours/week', note: 'Camera-off reduces by ~95%.' },
          { id: 'pc_work',     emoji: '💻', label: 'PC work / school (1 hr)',     kg: 0.05,  max: 50, unit: 'hours/week', note: 'Laptop ~1/3 of desktop.' },
          { id: 'ai_text',     emoji: '💬', label: 'AI text chat (ChatGPT/Claude/Gemini)', kg: 0.003, max: 500, unit: 'queries/week', note: '~3g CO\u2082e per text prompt. Long-context (1M token) queries cost ~3× more.' },
          { id: 'ai_image',    emoji: '🎨', label: 'AI image generation',                   kg: 0.015, max: 100, unit: 'images/week', note: 'DALL-E / Midjourney / Stable Diffusion: ~10–30g per image. 5–10× heavier than text.' },
          { id: 'ai_video',    emoji: '🎥', label: 'AI video generation (short clip)',      kg: 0.15,  max: 50,  unit: 'clips/week', note: 'Sora / Runway / Kling: ~100–500g per clip. Scales linearly with clip length + resolution. 50×+ heavier than text.' },
          { id: 'ai_voice',    emoji: '🎙️', label: 'AI voice / TTS generation',            kg: 0.002, max: 100, unit: 'clips/week', note: 'ElevenLabs / Murf / OpenAI TTS: ~1–3g per short clip.' },
          { id: 'ai_code',     emoji: '👨‍💻', label: 'AI code assistant completion',         kg: 0.005, max: 500, unit: 'completions/week', note: 'Copilot / Cursor / Claude Code: long-context code prompts ~5g each.' }
        ],
        shopping: [
          { id: 'tshirt',      emoji: '👕', label: 'New T-shirt',                 kg: 7,   max: 52, unit: 'purchases/year', note: 'Polyester = lifetime of oil extraction.' },
          { id: 'jeans',       emoji: '👖', label: 'New jeans',                   kg: 33,  max: 20, unit: 'purchases/year', note: 'Secondhand = ~zero emissions.' },
          { id: 'smartphone',  emoji: '📱', label: 'New smartphone',              kg: 70,  max: 4,  unit: 'purchases/year', note: 'Keep phones 3+ years to halve annual impact.' },
          { id: 'laptop',      emoji: '💻', label: 'New laptop',                  kg: 300, max: 4,  unit: 'purchases/year', note: 'Manufacturing dominates laptop emissions.' },
          { id: 'online_order',emoji: '📦', label: 'Online shipment (single box)',kg: 0.5, max: 52, unit: 'orders/week', note: '2-day shipping = 3× slower shipping.' },
          { id: 'fastfashion', emoji: '🛍️', label: 'Fast fashion bundle',         kg: 25,  max: 24, unit: 'purchases/year', note: 'Shein/Temu avg: 25 kg per order.' }
        ],
        waste: [
          { id: 'landfill',    emoji: '🗑️', label: 'Landfill trash (1 bag)',      kg: 4.5, max: 7,  unit: 'bags/week', note: 'Landfills produce methane (28× more potent than CO₂).' },
          { id: 'recycle',     emoji: '♻️', label: 'Recycling diverted (1 bag)',  kg: -1.5, max: 7, unit: 'bags/week', note: 'Negative! Recycling avoids emissions.' },
          { id: 'compost',     emoji: '🌱', label: 'Composting (1 bag)',          kg: -2,  max: 7,  unit: 'bags/week', note: 'Avoids methane AND builds soil carbon.' },
          { id: 'bottled_water',emoji: '💧', label: 'Bottled water',              kg: 0.08, max: 50, unit: 'bottles/week', note: 'Tap water = ~500× cleaner emissions-wise.' }
        ]
      };

      // Annual per-capita CO₂e (kg) — 2023 Our World in Data + EDGAR
      var NATIONAL_AVERAGES = [
        { country: 'Qatar',         emoji: '🇶🇦', kg: 35500, rank: 'highest' },
        { country: 'USA',           emoji: '🇺🇸', kg: 14700, rank: 'high' },
        { country: 'Australia',     emoji: '🇦🇺', kg: 15100, rank: 'high' },
        { country: 'Canada',        emoji: '🇨🇦', kg: 14200, rank: 'high' },
        { country: 'Russia',        emoji: '🇷🇺', kg: 11400, rank: 'high' },
        { country: 'Germany',       emoji: '🇩🇪', kg: 8100,  rank: 'moderate' },
        { country: 'Japan',         emoji: '🇯🇵', kg: 7900,  rank: 'moderate' },
        { country: 'China',         emoji: '🇨🇳', kg: 7400,  rank: 'moderate' },
        { country: 'UK',            emoji: '🇬🇧', kg: 5200,  rank: 'moderate' },
        { country: 'Global avg',    emoji: '🌍', kg: 4500,  rank: 'global', highlight: true },
        { country: 'Mexico',        emoji: '🇲🇽', kg: 2900,  rank: 'low' },
        { country: 'India',         emoji: '🇮🇳', kg: 1900,  rank: 'low' },
        { country: 'Paris-aligned', emoji: '🎯', kg: 2300,  rank: 'target', highlight: true, note: 'What every person needs to reach by 2030 to stay below 1.5°C.' },
        { country: 'Bangladesh',    emoji: '🇧🇩', kg: 600,   rank: 'low' },
        { country: 'Kenya',         emoji: '🇰🇪', kg: 400,   rank: 'low' }
      ];

      function carbonTotal() {
        var tr = CARBON.transport.opts[ccTransport].kg;
        var fd = CARBON.food.opts[ccFood].kg;
        var en = CARBON.energy.opts[ccEnergy].kg;
        var ws = CARBON.waste.opts[ccWaste].kg;
        return { transport: tr, food: fd, energy: en, waste: ws, total: tr + fd + en + ws };
      }

      var ct = carbonTotal();

      // ── Granular calculator state & helpers ──
      var granularFreq = d.granularFreq || {}; // { itemId: frequency }
      var granularExpanded = d.granularExpanded || {}; // { category: true }
      var granularCompareOpen = d.granularCompareOpen || false;

      // Compute annual kg for a single item given current frequency
      function itemAnnualKg(item, freq) {
        if (!freq) return 0;
        if (item.unit === 'flights/year' || item.unit === 'purchases/year') return item.kg * freq;
        return item.kg * freq * 52; // weekly frequency × 52 weeks
      }

      // Total annual + breakdown across granular items
      function granularAnnual() {
        var total = 0;
        var byCat = {};
        Object.keys(GRANULAR_ITEMS).forEach(function(cat) {
          byCat[cat] = 0;
          GRANULAR_ITEMS[cat].forEach(function(item) {
            var freq = granularFreq[item.id] || 0;
            var annual = itemAnnualKg(item, freq);
            byCat[cat] += annual;
            total += annual;
          });
        });
        return { total: Math.max(0, total), byCat: byCat };
      }
      var granular = granularAnnual();

      // Helper: set frequency for a single item
      function setItemFreq(itemId, freq) {
        var next = Object.assign({}, granularFreq);
        next[itemId] = freq;
        upd('granularFreq', next);
        playSound('slider');
      }

      // ── Hope Meter milestones ──
      var HOPE_MILESTONES = [
        { id: 'started', label: 'Started Exploring', check: function() { return Object.keys(tabsVisited).length > 0; } },
        { id: 'calculated', label: 'Calculated Footprint', check: function() { return !!badges.firstCalc; } },
        { id: 'lowCarbon', label: 'Low-Carbon Lifestyle', check: function() { return ct.total < 2000; } },
        { id: 'designedMix', label: 'Designed Energy Mix', check: function() { return rsSolar + rsWind + rsHydro + rsNuclear > 60; } },
        { id: 'netZero', label: 'Near Net-Zero Mix', check: function() { return !!badges.netZero; } },
        { id: 'justiceAware', label: 'Explored Justice', check: function() { return Object.keys(d.regionsViewed || {}).length >= 3; } },
        { id: 'solutions', label: 'Learned Solutions', check: function() { return Object.keys(solutionsViewed).length >= 4; } },
        { id: 'action', label: 'Took Action', check: function() { return !!badges.actionPlanner; } },
        { id: 'quizAce', label: 'Aced the Quiz', check: function() { return quizCorrect >= 5; } },
        { id: 'allTabs', label: 'Explored Everything', check: function() { return !!badges.allTabs; } }
      ];
      var hopePts = HOPE_MILESTONES.filter(function(m) { return m.check(); }).length;
      var hopePct = Math.round(hopePts / HOPE_MILESTONES.length * 100);

      var scaleMult = ccScale === 'school' ? ccSchoolSize : ccScale === 'city' ? 100000 : 330000000;
      var scaleLabel = ccScale === 'school' ? ccSchoolSize + ' students' : ccScale === 'city' ? '100K city' : 'USA (330M)';

      // ══════════════════════════════════════
      //  RENEWABLES SIMULATOR
      // ══════════════════════════════════════
      var EMISSIONS_FACTOR = { solar: 40, wind: 11, hydro: 24, nuclear: 12, fossil: 820 }; // g CO2/kWh
      var BASELINE_GT = 37; // Gt CO2/year global energy

      var rsFossil = Math.max(0, 100 - rsSolar - rsWind - rsHydro - rsNuclear);
      var rsGCO2 = (rsSolar / 100 * EMISSIONS_FACTOR.solar + rsWind / 100 * EMISSIONS_FACTOR.wind +
        rsHydro / 100 * EMISSIONS_FACTOR.hydro + rsNuclear / 100 * EMISSIONS_FACTOR.nuclear +
        rsFossil / 100 * EMISSIONS_FACTOR.fossil);
      var rsTargetGt = BASELINE_GT * (rsGCO2 / EMISSIONS_FACTOR.fossil);
      var rsReductionPct = Math.round((1 - rsTargetGt / BASELINE_GT) * 100);

      function buildTimeline() {
        var tl = [];
        for (var y = 0; y <= rsTimespan; y++) {
          var p = rsTimespan > 0 ? y / rsTimespan : 1;
          var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var gt = BASELINE_GT + (rsTargetGt - BASELINE_GT) * eased;
          tl.push({ year: 2025 + y, gt: Math.max(0, gt) });
        }
        return tl;
      }
      var timeline = buildTimeline();
      var cumulativeAvoided = 0;
      for (var ti = 1; ti < timeline.length; ti++) cumulativeAvoided += BASELINE_GT - timeline[ti].gt;

      var SCENARIOS = [
        { label: '100% Solar City', mix: [100, 0, 0, 0], desc: 'Cities like Burlington, VT already run on 100% renewable electricity!', hope: 'Solar is now the cheapest electricity source in history.' },
        { label: 'Balanced Green Mix', mix: [30, 30, 20, 15], desc: 'A diverse portfolio is the most resilient approach.', hope: 'Sweden and France already achieve over 90% clean electricity.' },
        { label: 'Wind-Powered Future', mix: [10, 60, 10, 10], desc: 'Denmark gets 55% of electricity from wind already.', hope: 'Wind turbines can be built on farms \u2014 land beneath still grows crops.' },
        { label: 'Current Pace', mix: [15, 12, 15, 10], desc: 'The world adds renewables faster than ever.', hope: 'Solar capacity doubles every 2-3 years worldwide.' }
      ];

      // ══════════════════════════════════════
      //  CLIMATE JUSTICE DATA
      // ══════════════════════════════════════
      var REGIONS = [
        { id: 'pacific', name: 'Pacific Island Nations', emoji: '\uD83C\uDDEB\uD83C\uDDEF', risk: 'extreme', type: 'Sea level rise, coral bleaching', emPct: 0.03, pop: '12M',
          story: 'Tuvalu, Kiribati, and the Marshall Islands may face severe flooding by 2100, yet produce less than 0.03% of global emissions. Young activists like Litokne Kabua lead advocacy campaigns.',
          resilience: 'Coral reef restoration, floating architecture, legal sovereignty campaigns' },
        { id: 'arctic', name: 'Arctic Communities', emoji: '\u2744\uFE0F', risk: 'extreme', type: 'Permafrost thaw, habitat loss', emPct: 0.1, pop: '4M',
          story: 'Indigenous Arctic peoples have sustained cultures for millennia. Warming is 3-4\u00D7 faster here. Traditional food systems are changing, but communities lead climate monitoring.',
          resilience: 'Traditional ecological knowledge, community monitoring networks, ice cellars' },
        { id: 'sahel', name: 'Sahel Region (Africa)', emoji: '\uD83C\uDDFF\uD83C\uDDE6', risk: 'extreme', type: 'Drought, desertification, food insecurity', emPct: 0.5, pop: '400M',
          story: 'The Sahel spans 5,400 km across Africa. Despite minimal emissions, it faces severe drought cycles. The Great Green Wall project aims to restore 100 million hectares.',
          resilience: 'Great Green Wall reforestation, solar-powered irrigation, drought-resistant crops' },
        { id: 'bangladesh', name: 'Bangladesh & South Asia', emoji: '\uD83C\uDDE7\uD83C\uDDE9', risk: 'extreme', type: 'Flooding, cyclones, displacement', emPct: 0.4, pop: '170M',
          story: 'Bangladesh contributes 0.4% of emissions but faces some of the worst flooding. Millions may be displaced by 2050. Yet Bangladeshi engineers pioneer floating schools and farms.',
          resilience: 'Floating schools, cyclone shelters, mangrove restoration, early warning systems' },
        { id: 'caribbean', name: 'Caribbean Islands', emoji: '\uD83C\uDDF1\uD83C\uDDE8', risk: 'high', type: 'Hurricanes, coral loss, tourism collapse', emPct: 0.2, pop: '44M',
          story: 'Caribbean nations face intensifying hurricanes. Hurricane Maria (2017) devastated Dominica and Puerto Rico. Islands now lead in renewable energy transitions.',
          resilience: 'Hurricane-resilient building codes, community solar, coral nurseries' },
        { id: 'ej_usa', name: 'US Environmental Justice', emoji: '\uD83C\uDDFA\uD83C\uDDF8', risk: 'high', type: 'Air pollution, heat islands, toxic waste', emPct: 15.0, pop: '~40M affected',
          story: 'In the US, communities of color are 75% more likely to live near polluting facilities. Heat islands in cities can be 10\u00B0F hotter. Environmental justice movements fight for equitable protection.',
          resilience: 'Community air monitoring, urban tree canopy programs, clean energy access initiatives' },
        { id: 'seasia', name: 'Southeast Asia Coastal', emoji: '\uD83C\uDDFB\uD83C\uDDF3', risk: 'high', type: 'Typhoons, sea level, saltwater intrusion', emPct: 4.0, pop: '680M',
          story: 'Vietnam, Philippines, and Indonesia face rising seas and intensifying storms. Jakarta is sinking so fast Indonesia is building a new capital. Communities lead mangrove restoration.',
          resilience: 'Mangrove planting, floating communities, aquaculture adaptation' },
        { id: 'andes', name: 'Andean Communities', emoji: '\uD83C\uDDF5\uD83C\uDDEA', risk: 'high', type: 'Glacier retreat, water scarcity', emPct: 1.0, pop: '50M',
          story: 'Andean glaciers provide drinking water for millions. They have lost 30-50% of volume since the 1970s. Indigenous communities combine traditional and modern water management.',
          resilience: 'Ancient qocha (reservoir) systems, glacier monitoring, watershed reforestation' }
      ];

      var riskColors = { extreme: '#ef4444', high: '#f59e0b', moderate: '#3b82f6' };

      // ══════════════════════════════════════
      //  HISTORICAL CUMULATIVE CO₂ EMISSIONS (1850–2024, Gt)
      //  Source: Carbon Brief 2023 analysis + Our World in Data
      //  Shows who is actually responsible for the CO₂ already in the atmosphere
      // ══════════════════════════════════════
      var HISTORICAL_EMISSIONS = [
        { country: 'USA',            emoji: '🇺🇸', gt: 509, pctGlobal: 25.0 },
        { country: 'China',          emoji: '🇨🇳', gt: 284, pctGlobal: 14.0 },
        { country: 'Russia/USSR',    emoji: '🇷🇺', gt: 172, pctGlobal: 8.5 },
        { country: 'Brazil',         emoji: '🇧🇷', gt: 113, pctGlobal: 5.6 },
        { country: 'Indonesia',      emoji: '🇮🇩', gt: 103, pctGlobal: 5.1 },
        { country: 'Germany',        emoji: '🇩🇪', gt: 88,  pctGlobal: 4.3 },
        { country: 'UK',             emoji: '🇬🇧', gt: 78,  pctGlobal: 3.9 },
        { country: 'Japan',          emoji: '🇯🇵', gt: 68,  pctGlobal: 3.3 },
        { country: 'India',          emoji: '🇮🇳', gt: 54,  pctGlobal: 2.7 },
        { country: 'Canada',         emoji: '🇨🇦', gt: 34,  pctGlobal: 1.7 },
        { country: 'France',         emoji: '🇫🇷', gt: 34,  pctGlobal: 1.7 },
        { country: 'All of Africa',  emoji: '🌍', gt: 65,  pctGlobal: 3.2, note: '1.4 billion people.' }
      ];

      // ══════════════════════════════════════
      //  YOUTH CLIMATE LEADERS
      //  A small global spotlight — real activists making measurable impact
      // ══════════════════════════════════════
      var YOUTH_LEADERS = [
        { name: 'Greta Thunberg', country: '🇸🇪 Sweden', age: 'since age 15', emoji: '📢',
          what: 'Started Fridays for Future — a weekly school-strike movement that spread to 170+ countries. Her "How Dare You" speech at the UN in 2019 galvanized millions.',
          quote: '"We cannot solve a crisis without treating it as a crisis."' },
        { name: 'Vanessa Nakate', country: '🇺🇬 Uganda', age: 'since age 22', emoji: '🌍',
          what: 'Founded Rise Up Movement. Pushed climate coverage to include African voices after being cropped from a famous youth activist photo. Leads the Green Schools project in East Africa.',
          quote: '"You cannot have climate justice without racial justice."' },
        { name: 'Autumn Peltier', country: '🇨🇦 Canada', age: 'since age 8', emoji: '💧',
          what: 'Anishinaabe water protector. Named Chief Water Commissioner of the Anishinabek Nation at 14. Addresses UN on First Nations water rights and climate.',
          quote: '"We can\'t eat money or drink oil."' },
        { name: 'Mari Copeny ("Little Miss Flint")', country: '🇺🇸 USA', age: 'since age 8', emoji: '🚰',
          what: 'Raised millions for Flint, Michigan water crisis. Distributed 1M+ bottles of water + 25,000+ backpacks of supplies. Connects water quality to environmental justice.',
          quote: '"I\'m just a kid trying to save the world."' },
        { name: 'Xiye Bastida', country: '🇲🇽 Mexico/🇺🇸 USA', age: 'since age 13', emoji: '🌾',
          what: 'Otomi-Toltec climate organizer. Co-founded Re-Earth Initiative. Featured speaker at UN, COP26, and TIME Earth Awards. Bridges Indigenous knowledge with climate action.',
          quote: '"Indigenous people carry the solutions we need."' },
        { name: 'Disha Ravi', country: '🇮🇳 India', age: 'since age 21', emoji: '🌱',
          what: 'Co-founded Fridays for Future India. Jailed briefly in 2021 for sharing a climate protest toolkit with farmers — then released on bail after global outcry defending digital activism.',
          quote: '"You can\'t arrest the movement."' }
      ];

      // ══════════════════════════════════════
      //  SOLUTIONS SPOTLIGHT
      // ══════════════════════════════════════
      var SOLUTIONS = [
        { id: 'solar', cat: 'energy', emoji: '\u2600\uFE0F', title: 'Solar Power Revolution', what: 'Panels that turn sunlight into electricity \u2014 on roofs, in fields, even floating on lakes.', where: 'Worldwide. India, China, and the US lead in new solar capacity.', impact: 'Solar is now the cheapest electricity in history. Could power 40% of US electricity from rooftops alone.' },
        { id: 'wind', cat: 'energy', emoji: '\uD83C\uDF2C\uFE0F', title: 'Wind Energy', what: 'Turbines that capture wind energy. Offshore wind farms can power entire cities.', where: 'Denmark (55% wind-powered), UK, US, China.', impact: 'One offshore turbine can power 16,000 homes. Wind jobs are among the fastest-growing.' },
        { id: 'evs', cat: 'transport', emoji: '\uD83D\uDE97', title: 'Electric Vehicles', what: 'Cars, buses, and trucks powered by batteries instead of gasoline.', where: 'Norway (80% of new cars are electric), China, Europe, US.', impact: 'EVs produce 50-70% less lifetime emissions than gas cars, improving as grids get cleaner.' },
        { id: 'forests', cat: 'nature', emoji: '\uD83C\uDF33', title: 'Forest Restoration', what: 'Planting billions of trees and protecting existing forests \u2014 nature\'s carbon capture.', where: 'Ethiopia planted 350M trees in one day. Great Green Wall spans Africa.', impact: 'Forests absorb 2.6 billion tons of CO\u2082/year \u2014 about 30% of human emissions.' },
        { id: 'capture', cat: 'capture', emoji: '\uD83C\uDFED', title: 'Carbon Capture', what: 'Machines that pull CO\u2082 from the air and store it underground or turn it into stone.', where: 'Iceland (Climeworks Orca plant), US, Norway.', impact: 'Still early \u2014 current plants capture 36,000 tons/year. Goal: billions by 2050.' },
        { id: 'kelp', cat: 'nature', emoji: '\uD83C\uDF3F', title: 'Ocean Kelp Farms', what: 'Kelp grows 60\u00D7 faster than land trees, absorbing massive CO\u2082 while creating habitat.', where: 'Australia, US Pacific coast, Norway, South Korea.', impact: 'Could sequester 1-10 Gt CO\u2082/year while providing food, fertilizer, and biofuel.' },
        { id: 'cities', cat: 'transport', emoji: '\uD83C\uDFD9\uFE0F', title: 'Green Cities', what: 'Bike lanes, electric buses, urban gardens, green roofs, and walkable neighborhoods.', where: 'Copenhagen, Amsterdam, Singapore, Bogot\u00E1, Portland.', impact: 'Cities produce 70% of emissions. Redesigning them is the highest-impact change.' },
        { id: 'youth', cat: 'all', emoji: '\u270A', title: 'Youth Climate Movement', what: 'Students leading climate action through innovation, activism, and policy advocacy.', where: 'Every continent. Fridays for Future (170+ countries), Sunrise Movement.', impact: 'Youth pressure helped pass the EU Green Deal and influenced the Paris Agreement.', highlight: true }
      ];

      // ══════════════════════════════════════
      //  KEELING CURVE DATA (Mauna Loa annual mean CO₂, ppm)
      //  Source: NOAA Global Monitoring Laboratory
      // ══════════════════════════════════════
      var KEELING_DATA = [
        { y: 1958, ppm: 315.0 }, { y: 1960, ppm: 316.9 }, { y: 1965, ppm: 320.0 },
        { y: 1970, ppm: 325.7 }, { y: 1975, ppm: 331.1 }, { y: 1980, ppm: 338.7 },
        { y: 1985, ppm: 346.1 }, { y: 1990, ppm: 354.4 }, { y: 1995, ppm: 360.9 },
        { y: 2000, ppm: 369.5 }, { y: 2005, ppm: 379.8 }, { y: 2010, ppm: 389.9 },
        { y: 2013, ppm: 396.5 }, { y: 2015, ppm: 401.0 }, { y: 2018, ppm: 408.5 },
        { y: 2020, ppm: 414.2 }, { y: 2022, ppm: 418.5 }, { y: 2024, ppm: 422.8 }
      ];
      // Global mean surface temperature anomaly (°C above 1880-1910 baseline)
      // Source: NASA GISS GISTEMP v4
      var GLOBAL_TEMP = [
        { y: 1958, t: 0.07 }, { y: 1965, t: -0.10 }, { y: 1970, t: 0.04 },
        { y: 1975, t: 0.01 }, { y: 1980, t: 0.27 }, { y: 1985, t: 0.13 },
        { y: 1990, t: 0.46 }, { y: 1995, t: 0.46 }, { y: 2000, t: 0.42 },
        { y: 2005, t: 0.69 }, { y: 2010, t: 0.72 }, { y: 2015, t: 0.90 },
        { y: 2018, t: 0.85 }, { y: 2020, t: 1.01 }, { y: 2022, t: 0.89 },
        { y: 2023, t: 1.17 }, { y: 2024, t: 1.28 }
      ];
      var KEELING_MILESTONES = [
        { ppm: 280, label: 'Pre-industrial (1750)', note: 'Stable for 10,000 years. Holocene climate that all human civilization grew up in.' },
        { ppm: 315, label: 'Keeling starts measuring (1958)', note: 'Charles David Keeling begins continuous CO\u2082 monitoring at Mauna Loa. His curve proved human-caused warming was real.' },
        { ppm: 350, label: '350 ppm (1988)', note: 'Climate scientist James Hansen tells US Congress warming has begun. 350 ppm is considered the "safe" ceiling by 350.org.' },
        { ppm: 400, label: '400 ppm (2013)', note: 'First time atmospheric CO\u2082 crossed 400 ppm in 3+ million years. Earth\'s last 400 ppm era: tropical forests at the poles.' },
        { ppm: 420, label: '420 ppm (2023)', note: 'Current level. Highest in at least 800,000 years (from ice cores). Equivalent to ~1.2\u00B0C warming.' },
        { ppm: 450, label: '450 ppm (projected ~2035)', note: 'Threshold associated with 2\u00B0C warming if sustained. Paris Agreement target: keep below 1.5\u00B0C.' }
      ];

      // ══════════════════════════════════════
      //  TIPPING POINTS — Earth system thresholds
      //  Sources: IPCC AR6, Armstrong McKay et al. 2022 (Science)
      // ══════════════════════════════════════
      var TIPPING_POINTS = [
        { id: 'coral', emoji: '\uD83E\uDEB8', name: 'Tropical Coral Reef Die-off', threshold: 1.5, status: 'happening',
          desc: 'Mass coral bleaching events hit the Great Barrier Reef in 2016, 2017, 2020, 2022, and 2024. At 1.5\u00B0C warming, 70\u201390% of tropical coral reefs die. At 2\u00B0C, 99% die.',
          cascade: 'Loss of 25% of marine biodiversity; collapse of fisheries feeding 500M people; loss of coastal storm protection.' },
        { id: 'greenland', emoji: '\u2744\uFE0F', name: 'Greenland Ice Sheet Collapse', threshold: 1.5, status: 'at-risk',
          desc: 'The Greenland ice sheet holds enough water to raise sea levels 7 meters (23 ft). At ~1.5\u00B0C sustained, melt becomes irreversible over centuries to millennia.',
          cascade: 'Multi-meter sea level rise over centuries. Coastal cities flooded. Freshwater pulse disrupts Atlantic circulation (see AMOC).' },
        { id: 'amoc', emoji: '\uD83C\uDF0A', name: 'AMOC Collapse (Gulf Stream)', threshold: 2.0, status: 'weakening',
          desc: 'The Atlantic Meridional Overturning Circulation moves heat from the tropics to Europe. It has weakened 15% since 1950. A full shutdown would cool northern Europe dramatically while disrupting monsoons in Africa and Asia.',
          cascade: 'Europe cools 5\u201310\u00B0C. African/Asian monsoons fail. Sea levels rise on US East Coast. Food systems disrupted for billions.' },
        { id: 'amazon', emoji: '\uD83C\uDF34', name: 'Amazon Rainforest Dieback', threshold: 3.5, status: 'at-risk',
          desc: 'The Amazon generates half its own rainfall. With 20\u201325% deforestation + rising temperatures, it risks flipping from rainforest to savanna. Some studies suggest the threshold is closer to 2\u00B0C with current deforestation rates.',
          cascade: 'Releases 200+ billion tons of stored carbon. Disrupts South American agriculture. Loss of 10%+ of Earth\'s species.' },
        { id: 'permafrost', emoji: '\uD83E\uDDCA', name: 'Permafrost Methane Release', threshold: 1.5, status: 'happening',
          desc: 'Arctic permafrost holds twice the carbon currently in the atmosphere. Warming 3\u20134\u00D7 faster than global average, it is already thawing and releasing CO\u2082 and methane (28\u00D7 more potent than CO\u2082 over 100 years).',
          cascade: 'Self-reinforcing feedback loop: more warming \u2192 more permafrost thaw \u2192 more emissions \u2192 more warming.' },
        { id: 'westantarctic', emoji: '\uD83D\uDDFB', name: 'West Antarctic Ice Sheet', threshold: 1.5, status: 'at-risk',
          desc: 'Marine-based ice sheets anchored below sea level. Warm ocean water is eroding them from beneath. Thwaites Glacier ("Doomsday Glacier") is the main risk. Collapse would raise sea levels 3.3 meters (11 ft).',
          cascade: 'Multi-meter sea level rise. Bangladesh, Florida, Pacific island nations face existential threat.' },
        { id: 'boreal', emoji: '\uD83C\uDF32', name: 'Boreal Forest Die-off', threshold: 4.0, status: 'future-risk',
          desc: 'Northern coniferous forests (Russia, Canada, Scandinavia) are stressed by warming, bark beetles, and wildfires. A full transition to grassland could release vast amounts of stored carbon.',
          cascade: 'Release of stored carbon. Habitat loss for Arctic species. Changes to global weather patterns.' }
      ];

      // ══════════════════════════════════════
      //  PROJECT DRAWDOWN — climate solutions ranked by Gt CO₂e avoidance potential
      //  Source: Paul Hawken's Project Drawdown (2020 Table of Solutions)
      //  Gt values = cumulative avoidance 2020–2050 in most-ambitious scenario
      // ══════════════════════════════════════
      var DRAWDOWN_SOLUTIONS = [
        { id: 'wind_onshore',  emoji: '🌬️', label: 'Onshore Wind Turbines',     gt: 147, cat: 'energy',    note: 'Cheapest electricity worldwide in 2024. Doubling capacity annually in several regions.' },
        { id: 'solar_farms',   emoji: '☀️', label: 'Utility-Scale Solar Farms',  gt: 42,  cat: 'energy',    note: 'Cheapest electricity in history. Grid integration is the main challenge now.' },
        { id: 'solar_roof',    emoji: '🏠', label: 'Rooftop Solar',              gt: 25,  cat: 'energy',    note: 'Distributed + resilient. Typical 5kW system payback: 6–10 years.' },
        { id: 'reduced_waste', emoji: '🍽️', label: 'Reduced Food Waste',         gt: 88,  cat: 'food',      note: '1/3 of food is wasted. Preventing waste avoids methane from landfills AND the emissions to grow the food.' },
        { id: 'plant_rich',    emoji: '🥗', label: 'Plant-Rich Diets',           gt: 65,  cat: 'food',      note: 'Not 100% vegan — even cutting beef 3× a week has huge impact. Frees land for reforestation.' },
        { id: 'tropical_forest',emoji: '🌳', label: 'Tropical Forest Restoration', gt: 85, cat: 'nature',  note: 'Restore 125M hectares. Protects biodiversity + draws down CO\u2082 via photosynthesis.' },
        { id: 'temperate_forest',emoji: '🌲', label: 'Temperate Forest Restoration', gt: 19, cat: 'nature', note: 'Plant where natural conditions support growth. Co-benefits: cooling, watershed protection.' },
        { id: 'silvopasture',  emoji: '🐄', label: 'Silvopasture',               gt: 42,  cat: 'food',      note: 'Integrating trees into grazing land. Livestock get shade; soil stores 4× more carbon than bare pasture.' },
        { id: 'regen_ag',      emoji: '🌾', label: 'Regenerative Agriculture',   gt: 14,  cat: 'food',      note: 'No-till + cover crops + diverse rotations. Builds soil carbon while maintaining yields.' },
        { id: 'peatlands',     emoji: '🏞️', label: 'Peatlands Protection',       gt: 26,  cat: 'nature',    note: 'Peatlands store 3× more carbon than forests globally. Drained peat = major emitter.' },
        { id: 'refrigerants',  emoji: '❄️', label: 'Refrigerant Management',     gt: 57,  cat: 'industry', note: 'HFCs are 1,000–9,000× more potent than CO\u2082. Kigali Amendment (2016) is phasing them out.' },
        { id: 'evs_personal',  emoji: '🚗', label: 'Electric Vehicles (personal)',gt: 11,  cat: 'transport', note: 'EVs produce 50–70% less lifetime emissions than gas — improves as grid cleans up.' },
        { id: 'efficient_transit', emoji: '🚆', label: 'Public Transit + Rail',   gt: 23,  cat: 'transport', note: 'Electric trains move a passenger-km at 1/10 the emissions of a car.' },
        { id: 'cycling_walking', emoji: '🚴', label: 'Bike Infrastructure',      gt: 5,   cat: 'transport', note: 'Dutch cycling cities have 1/3 the transport emissions. Infrastructure creates the behavior.' },
        { id: 'buildings_retrofit', emoji: '🏢', label: 'Building Retrofits',    gt: 33,  cat: 'energy',   note: 'Insulation + heat pumps + LED lighting. US buildings use 40% of primary energy.' },
        { id: 'heat_pumps',    emoji: '🌡️', label: 'Heat Pumps',                 gt: 9,   cat: 'energy',    note: '3–4× more efficient than gas furnaces. Work to −15°C in modern cold-climate models.' },
        { id: 'girls_education',emoji: '👩‍🎓', label: 'Girls\' Education & Family Planning', gt: 85, cat: 'social', note: 'Consistently top-ranked. Educated women have fewer children AND higher-impact lives. Compounds across generations.' },
        { id: 'clean_cooking', emoji: '🍳', label: 'Clean Cookstoves',           gt: 16,  cat: 'social',    note: 'Replaces wood/charcoal fires. Benefits: climate + indoor air pollution (kills 4M/yr) + deforestation.' },
        { id: 'kelp_forests',  emoji: '🌿', label: 'Kelp Reforestation (ocean)', gt: 10,  cat: 'nature',    note: 'Grows 60× faster than land trees. Sequesters CO\u2082 + restores fisheries + fertilizer.' }
      ];

      // ══════════════════════════════════════
      //  GLOBAL EMISSIONS BY SECTOR (2023, % of total ~54 Gt CO₂e including land use)
      //  Source: WRI Climate Watch / Our World in Data
      // ══════════════════════════════════════
      var EMISSIONS_BY_SECTOR = [
        { id: 'electricity', emoji: '⚡', name: 'Electricity & Heat',    pct: 25, color: '#ef4444', lever: 'Fastest lever: renewable grids, heat pumps, energy efficiency.' },
        { id: 'agriculture', emoji: '🌾', name: 'Agriculture + Land Use',pct: 24, color: '#fbbf24', lever: 'Reduce beef/dairy, restore forests and peatlands, prevent food waste.' },
        { id: 'industry',    emoji: '🏭', name: 'Industry',              pct: 21, color: '#a855f7', lever: 'Green steel (hydrogen), cement chemistry reform, circular manufacturing.' },
        { id: 'transport',   emoji: '🚗', name: 'Transport',             pct: 16, color: '#3b82f6', lever: 'EVs + rail + transit-friendly cities. Aviation is the hardest.' },
        { id: 'buildings',   emoji: '🏢', name: 'Buildings',             pct: 6,  color: '#22c55e', lever: 'Insulation + heat pumps + fossil-fuel-free construction.' },
        { id: 'other',       emoji: '🌐', name: 'Other (waste, fugitive, aviation bunkers)', pct: 8, color: '#94a3b8', lever: 'Methane leaks from oil & gas, landfill capture, shipping fuels.' }
      ];

      // ══════════════════════════════════════
      //  CARBON BUDGET (remaining emissions for 50% chance of staying below warming limit)
      //  Source: IPCC AR6 WG1 Table 5.8 + annual update for 2024
      // ══════════════════════════════════════
      var CARBON_BUDGETS = [
        { limit: 1.5, gtRemaining: 250, color: '#ef4444', badge: 'lockout' },
        { limit: 1.7, gtRemaining: 550, color: '#f97316', badge: 'severe' },
        { limit: 2.0, gtRemaining: 900, color: '#fbbf24', badge: 'major risk' }
      ];
      var GLOBAL_EMISSIONS_RATE = 40; // Gt CO₂/year (approximate 2023/2024)

      // ══════════════════════════════════════
      //  IPCC FUTURE SCENARIOS (SSP pathways)
      //  Source: IPCC AR6 WG1 SPM.8 (temperature by 2100, relative to 1850-1900)
      // ══════════════════════════════════════
      var IPCC_SCENARIOS = [
        { id: 'ssp119', label: 'SSP1-1.9', name: 'Very Low Emissions — Paris-Aligned',
          temp2100: 1.4, tempRange: [1.0, 1.8], emissions2050: 0, color: '#22c55e',
          likelihood: 'requires unprecedented global cooperation',
          requires: 'Net-zero CO\u2082 by ~2050. Rapid deployment of all Drawdown solutions. Fossil fuels phased out by 2040 in developed economies.',
          impacts: 'Limits warming near 1.5°C. Most coral reefs still lost but ecosystems hold. Sea level rise: 0.3–0.5m by 2100.' },
        { id: 'ssp126', label: 'SSP1-2.6', name: 'Low Emissions — Strong Action',
          temp2100: 1.8, tempRange: [1.3, 2.4], emissions2050: 7, color: '#84cc16',
          likelihood: 'achievable with current commitments if fully implemented',
          requires: 'Net-zero CO\u2082 by ~2075. Rapid renewable expansion + moderate carbon capture. Strong but slower than SSP1-1.9.',
          impacts: 'Warming around 2°C. Some tipping points triggered (coral bleaching, Greenland slow loss). Sea level rise: 0.4–0.7m.' },
        { id: 'ssp245', label: 'SSP2-4.5', name: 'Middle of the Road — Current Pledges',
          temp2100: 2.7, tempRange: [2.1, 3.5], emissions2050: 25, color: '#fbbf24',
          likelihood: 'roughly where current policies are heading',
          requires: 'Gradual shift from fossil fuels. Renewable growth continues but not fast enough.',
          impacts: 'Warming ~2.7°C. Major tipping points likely (AMOC weakening, Amazon stress, coral reefs mostly gone). Sea level rise: 0.5–0.9m.' },
        { id: 'ssp370', label: 'SSP3-7.0', name: 'High Emissions — Regional Rivalry',
          temp2100: 3.6, tempRange: [2.8, 4.6], emissions2050: 55, color: '#f97316',
          likelihood: 'emissions still rising; weak policy',
          requires: 'Continued fossil fuel expansion. Limited climate cooperation between countries.',
          impacts: 'Warming ~3.6°C. Multiple cascading tipping points. Amazon dieback likely. Sea level rise: 0.6–1.1m by 2100, multi-meter locked in long-term.' },
        { id: 'ssp585', label: 'SSP5-8.5', name: 'Very High — Fossil-Fueled Growth',
          temp2100: 4.4, tempRange: [3.3, 5.7], emissions2050: 85, color: '#ef4444',
          likelihood: 'requires active acceleration of coal/oil/gas use',
          requires: 'Quadrupling coal use, massive fossil fuel expansion. Considered unlikely but reveals worst-case physics.',
          impacts: 'Warming 4°C+. Mass tipping-point cascade. Parts of Earth uninhabitable for humans in summer. Sea level rise: 0.7–1.4m by 2100, 5+ m locked in.' }
      ];

      var ACTIONS = [
        { emoji: '\uD83D\uDEB6', text: 'Walk, bike, or bus to school', impact: 'Saves up to 1,200 kg CO\u2082/year', diff: 'easy' },
        { emoji: '\uD83E\uDD57', text: 'Try one meatless meal per week', impact: 'Saves ~200 kg CO\u2082/year', diff: 'easy' },
        { emoji: '\uD83D\uDCA1', text: 'Turn off lights & unplug chargers', impact: 'Saves 100-400 kWh/year', diff: 'easy' },
        { emoji: '\uD83D\uDDE3\uFE0F', text: 'Talk to your family about energy choices', impact: 'One conversation can change household habits', diff: 'medium' },
        { emoji: '\uD83C\uDF31', text: 'Plant a tree or start a school garden', impact: '1 tree absorbs ~22 kg CO\u2082/year', diff: 'medium' },
        { emoji: '\uD83D\uDCDD', text: 'Write a letter to your representative', impact: 'Policy changes affect millions', diff: 'medium' },
        { emoji: '\u267B\uFE0F', text: 'Start a recycling program at school', impact: 'Diverts 30-50% of waste from landfills', diff: 'hard' },
        { emoji: '\uD83D\uDCE2', text: 'Organize a climate awareness event', impact: 'Reaching 100 people multiplies impact 100\u00D7', diff: 'hard' }
      ];

      // ══════════════════════════════════════
      //  QUIZ DATA
      // ══════════════════════════════════════
      var QUIZ = [
        { q: 'What gas do cars produce that warms the Earth?', opts: ['Oxygen', 'Carbon dioxide', 'Nitrogen'], a: 1 },
        { q: 'Which uses less energy: walking or driving?', opts: ['Walking', 'Driving', 'They\'re the same'], a: 0 },
        { q: 'Solar panels get energy from...', opts: ['Wind', 'The Sun', 'Coal'], a: 1 },
        { q: 'How much CO\u2082 does one tree absorb per year?', opts: ['~2 kg', '~22 kg', '~220 kg'], a: 1 },
        { q: 'Which energy source has the LOWEST lifecycle emissions?', opts: ['Natural gas', 'Wind', 'Solar'], a: 1 },
        { q: 'Climate justice means...', opts: ['Weather forecasting', 'Fair distribution of climate impacts', 'Carbon trading'], a: 1 },
        { q: 'The Paris Agreement aims to limit warming to...', opts: ['0.5\u00B0C', '1.5\u00B0C above pre-industrial', '5\u00B0C'], a: 1 },
        { q: 'Which sector produces the most greenhouse emissions?', opts: ['Transportation', 'Energy & electricity', 'Buildings'], a: 1 },
        { q: 'Methane is how many times more potent than CO\u2082?', opts: ['2\u00D7', '10\u00D7', '28\u00D7'], a: 2 },
        { q: 'What is the Great Green Wall?', opts: ['A border wall', 'A reforestation project across Africa', 'A type of solar panel'], a: 1 },
        // ── Expanded: Keeling Curve & atmospheric CO₂ ──
        { q: 'In what year did atmospheric CO\u2082 first cross 400 parts per million?', opts: ['1970', '1990', '2013', '2023'], a: 2 },
        { q: 'The Keeling Curve measures CO\u2082 at what famous location?', opts: ['Antarctica', 'Mauna Loa, Hawaii', 'The North Pole', 'Mount Everest'], a: 1 },
        { q: 'Pre-industrial atmospheric CO\u2082 was about:', opts: ['180 ppm', '280 ppm', '380 ppm', '480 ppm'], a: 1 },
        // ── Tipping points ──
        { q: 'Which climate "tipping point" may already be triggered at just 1.5\u00B0C warming?', opts: ['The Sahara turning green', 'Mass coral reef bleaching', 'The Gulf Stream reversing', 'The Moon\'s orbit'], a: 1 },
        { q: 'The AMOC (Atlantic Meridional Overturning Circulation) is famous because it:', opts: ['Moves deep-sea creatures', 'Regulates European climate', 'Creates hurricanes', 'Produces oxygen'], a: 1 },
        { q: 'Why does permafrost melting worry climate scientists?', opts: ['It floods coastlines', 'It releases trapped methane', 'It changes the compass', 'It kills all plants'], a: 1 },
        // ── Phenology / pollinator link ──
        { q: 'Climate change is disrupting which critical timing for pollinators?', opts: ['Egg laying', 'Flower bloom vs. bee emergence', 'Hibernation depth', 'Wing molting'], a: 1 },
        { q: 'A "phenological mismatch" happens when:', opts: ['Clocks change seasons', 'Flowers bloom before pollinators are active', 'Birds fly upside down', 'Trees grow sideways'], a: 1 },
        // ── Energy / grid facts ──
        { q: 'Which country generates the highest share of its electricity from wind?', opts: ['United States', 'China', 'Denmark', 'Japan'], a: 2 },
        { q: 'A modern offshore wind turbine can power approximately how many homes?', opts: ['~160', '~1,600', '~16,000', '~160,000'], a: 2 },
        // ── Justice ──
        { q: 'What share of global emissions comes from the richest 10% of people?', opts: ['~5%', '~20%', '~50%', '~80%'], a: 2 },
        // ── New content coverage: sectors, Drawdown, budget ──
        { q: 'What single sector produces roughly 25% of global greenhouse emissions?', opts: ['Transportation', 'Electricity & heat', 'Aviation', 'Agriculture'], a: 1 },
        { q: 'Agriculture + land use accounts for roughly what share of global emissions?', opts: ['~5%', '~10%', '~24%', '~50%'], a: 2 },
        { q: 'According to Project Drawdown, which solution has the largest gigaton avoidance potential by 2050?', opts: ['Electric vehicles', 'Onshore wind turbines', 'Rooftop solar', 'Direct air capture'], a: 1 },
        { q: 'One of Drawdown\'s top-ranked solutions is not a technology — it is:', opts: ['Skyscrapers', 'Girls\' education + family planning', 'Nuclear fission', 'Carbon trading'], a: 1 },
        { q: 'Roughly how many years of emissions remain in the 1.5°C carbon budget at today\'s burn rate?', opts: ['~60 years', '~25 years', '~6 years', 'Already exceeded'], a: 2 },
        { q: 'Which AI workload has the LARGEST per-use carbon footprint?', opts: ['Text chat', 'Image generation', 'Video generation', 'Voice TTS'], a: 2 },
        { q: 'Global temperature has risen approximately how much above pre-industrial levels (as of 2024)?', opts: ['+0.3°C', '+1.3°C', '+2.5°C', '+4.0°C'], a: 1 },
        // ── IPCC scenarios ──
        { q: 'Which IPCC scenario stays closest to the Paris Agreement 1.5°C target?', opts: ['SSP1-1.9', 'SSP2-4.5', 'SSP3-7.0', 'SSP5-8.5'], a: 0 },
        { q: 'Current policies put the world roughly on which IPCC pathway?', opts: ['SSP1-1.9 (Paris-aligned)', 'SSP1-2.6 (strong action)', 'SSP2-4.5 (middle)', 'SSP5-8.5 (fossil-fueled)'], a: 2 },
        { q: 'What does "SSP" stand for in IPCC future scenarios?', opts: ['Solar and Storage Plan', 'Shared Socioeconomic Pathway', 'State Science Policy', 'Sustainable Systems Project'], a: 1 },
        // ── Historical responsibility ──
        { q: 'Which single country is responsible for approximately 25% of all historical CO\u2082 emissions since 1850?', opts: ['China', 'Russia', 'United States', 'India'], a: 2 },
        { q: 'What is the "Loss & Damage" fund (created at COP27, 2022)?', opts: ['A climate insurance company', 'A pool where high-emitting countries pay vulnerable nations', 'A carbon trading scheme', 'A weather disaster loan'], a: 1 },
        { q: 'Greta Thunberg\'s global school strike movement is called:', opts: ['Sunrise Movement', 'Fridays for Future', '350.org', 'Extinction Rebellion'], a: 1 }
      ];

      // ═══ CANVAS: Donut Chart ═══
      function drawDonut(canvas, ct) {
        if (!canvas) return;
        var key = ct.transport + '|' + ct.food + '|' + ct.energy + '|' + ct.waste;
        if (canvas._donutKey === key) return;
        canvas._donutKey = key;
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.offsetWidth || 300, h = 180;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.height = h + 'px';
        var c = canvas.getContext('2d');
        c.scale(dpr, dpr);
        var cx = w / 2, cy = h / 2, r = 65, inner = 40;
        var segs = [
          { val: ct.transport, color: '#3b82f6', label: 'Transport' },
          { val: ct.food, color: '#f59e0b', label: 'Food' },
          { val: ct.energy, color: '#ef4444', label: 'Energy' },
          { val: ct.waste, color: '#22c55e', label: 'Waste' }
        ];
        var total = ct.total || 1;
        var angle = -Math.PI / 2;
        segs.forEach(function(s) {
          var sweep = (s.val / total) * Math.PI * 2;
          c.beginPath(); c.arc(cx, cy, r, angle, angle + sweep); c.arc(cx, cy, inner, angle + sweep, angle, true); c.closePath();
          c.fillStyle = s.color; c.fill();
          // Label
          var mid = angle + sweep / 2;
          var lx = cx + Math.cos(mid) * (r + 16), ly = cy + Math.sin(mid) * (r + 16);
          c.fillStyle = s.color; c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
          if (s.val > 0) c.fillText(s.label, lx, ly);
          angle += sweep;
        });
        // Center text
        c.fillStyle = ct.total < 2000 ? '#4ade80' : ct.total < 5000 ? '#fbbf24' : '#f87171';
        c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(ct.total.toLocaleString(), cx, cy - 6);
        c.fillStyle = '#94a3b8'; c.font = '600 9px system-ui';
        c.fillText('kg CO\u2082/yr', cx, cy + 12);
      }

      // ═══ CANVAS: Emissions Timeline ═══
      function drawTimeline(canvas, tl, baseline) {
        if (!canvas || !tl.length) return;
        var key = tl.map(function(p) { return p.gt.toFixed(1); }).join(',');
        if (canvas._tlKey === key) return;
        canvas._tlKey = key;
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.offsetWidth || 600, h = 160;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.height = h + 'px';
        var c = canvas.getContext('2d');
        c.scale(dpr, dpr);
        var pad = { l: 40, r: 16, t: 16, b: 24 };
        var gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
        var maxGt = Math.max(baseline * 1.05, 40);
        function x(i) { return pad.l + (i / (tl.length - 1)) * gw; }
        function y(gt) { return pad.t + (1 - gt / maxGt) * gh; }
        // Grid
        c.strokeStyle = 'rgba(148,163,184,0.1)'; c.lineWidth = 1;
        for (var g = 0; g <= maxGt; g += 10) { c.beginPath(); c.moveTo(pad.l, y(g)); c.lineTo(w - pad.r, y(g)); c.stroke(); }
        // Baseline
        c.strokeStyle = 'rgba(239,68,68,0.3)'; c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(pad.l, y(baseline)); c.lineTo(w - pad.r, y(baseline)); c.stroke();
        c.setLineDash([]);
        // 1.5C target (~20 Gt)
        c.strokeStyle = 'rgba(34,197,94,0.4)'; c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(pad.l, y(20)); c.lineTo(w - pad.r, y(20)); c.stroke();
        c.setLineDash([]);
        c.fillStyle = 'rgba(34,197,94,0.6)'; c.font = '600 8px system-ui'; c.textAlign = 'left';
        c.fillText('1.5\u00B0C target', pad.l + 4, y(20) - 4);
        // Filled area
        var grad = c.createLinearGradient(0, y(baseline), 0, y(0));
        grad.addColorStop(0, 'rgba(239,68,68,0.3)'); grad.addColorStop(0.5, 'rgba(245,158,11,0.2)'); grad.addColorStop(1, 'rgba(34,197,94,0.15)');
        c.beginPath(); c.moveTo(x(0), y(tl[0].gt));
        for (var i = 1; i < tl.length; i++) c.lineTo(x(i), y(tl[i].gt));
        c.lineTo(x(tl.length - 1), y(0)); c.lineTo(x(0), y(0)); c.closePath();
        c.fillStyle = grad; c.fill();
        // Line
        c.beginPath(); c.moveTo(x(0), y(tl[0].gt));
        for (var j = 1; j < tl.length; j++) c.lineTo(x(j), y(tl[j].gt));
        var endGt = tl[tl.length - 1].gt;
        c.strokeStyle = endGt > baseline * 0.7 ? '#ef4444' : endGt > baseline * 0.4 ? '#f59e0b' : '#22c55e';
        c.lineWidth = 2.5; c.stroke();
        // Endpoint dot
        c.beginPath(); c.arc(x(tl.length - 1), y(endGt), 4, 0, Math.PI * 2);
        c.fillStyle = c.strokeStyle; c.fill();
        // Y-axis labels
        c.fillStyle = '#94a3b8'; c.font = '600 8px system-ui'; c.textAlign = 'right';
        for (var yl = 0; yl <= maxGt; yl += 10) c.fillText(yl + ' Gt', pad.l - 4, y(yl) + 3);
        // X-axis labels
        c.textAlign = 'center';
        var step = Math.max(1, Math.floor(tl.length / 5));
        for (var xi = 0; xi < tl.length; xi += step) c.fillText(tl[xi].year, x(xi), h - 4);
        if (tl.length - 1 > 0) c.fillText(tl[tl.length - 1].year, x(tl.length - 1), h - 4);
      }

      // ═══ HELPER: section card ═══
      function card(props, children) {
        return el('div', { style: Object.assign({ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }, props.style || {}) }, children);
      }

      // ═══ HELPER: stat pill ═══
      function pill(label, value, color) {
        return el('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: color + '15', border: '1px solid ' + color + '30', fontSize: 11, fontWeight: 700, color: color } },
          el('span', null, label + ': '), el('span', { style: { fontWeight: 900 } }, value));
      }

      // ═══ HELPER: option button ═══
      function optBtn(isActive, onClick, emoji, label, sub) {
        return el('button', { onClick: onClick, style: {
          padding: '10px 14px', borderRadius: 10, border: isActive ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
          background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 80, transition: 'all 0.2s'
        } },
          el('span', { style: { fontSize: 20 } }, emoji),
          el('span', { style: { fontSize: 11, fontWeight: 700, color: isActive ? '#4ade80' : '#94a3b8' } }, label),
          sub && el('span', { style: { fontSize: 11, color: '#94a3b8' } }, sub)
        );
      }

      // ═══ HELPER: slider ═══
      function slider(label, emoji, value, color, onChange) {
        return el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
          el('span', { style: { fontSize: 16, width: 24, textAlign: 'center' } }, emoji),
          el('span', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 60 } }, label),
          el('input', { type: 'range', min: 0, max: 100, value: value, onChange: onChange,
            'aria-label': label + ' slider',
            style: { flex: 1, accentColor: color, height: 6 } }),
          el('span', { style: { fontSize: 13, fontWeight: 900, color: color, width: 40, textAlign: 'right', fontFamily: 'monospace' } }, value + '%')
        );
      }

      // ══════════════════════════════════════════════════
      //  RENDER
      // ══════════════════════════════════════════════════
      // ── Keyboard shortcuts (WCAG 2.1.1): 1-6 switch tabs, Q toggles quiz ──
      var _CE_TABS = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions'];
      var _CE_TAB_LABELS = { carbon: 'Carbon Calculator', renewables: 'Renewables', keeling: 'Keeling Curve', tipping: 'Tipping Points', justice: 'Climate Justice', solutions: 'Solutions' };
      function onCeKey(e) {
        var tgt = e.target || {};
        var tn = (tgt.tagName || '').toUpperCase();
        if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
        var k = e.key;
        if (k >= '1' && k <= '6') {
          var idx = parseInt(k, 10) - 1;
          if (_CE_TABS[idx]) {
            e.preventDefault();
            visitTab(_CE_TABS[idx]);
            if (announceToSR) announceToSR('Switched to ' + _CE_TAB_LABELS[_CE_TABS[idx]] + '.');
          }
        } else if (k === 'q' || k === 'Q') {
          e.preventDefault();
          upd('quizOpen', !quizOpen);
          if (announceToSR) announceToSR(quizOpen ? 'Quiz closed.' : 'Quiz opened.');
        }
      }
      return el('div', {
        style: { background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 50%, #064e3b 100%)', borderRadius: 16, minHeight: '70vh', padding: 0, boxShadow: '0 0 40px rgba(34,197,94,0.15)', outline: 'none' },
        role: 'region',
        'aria-label': 'Climate Explorer. Keyboard shortcuts: 1 through 6 switch tabs, Q toggles quiz.',
        tabIndex: 0,
        onKeyDown: onCeKey
      },

        // ── Header ──
        el('div', { style: { padding: '20px 24px 16px', borderBottom: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 12 } },
          el('button', { onClick: function() { setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab', style: { background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 16 } }, '\u2190'),
          el('div', { style: { fontSize: 28 } }, '\uD83C\uDF0D'),
          el('div', null,
            el('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, background: 'linear-gradient(90deg, #22c55e, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Climate Explorer'),
            el('p', { style: { margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, 'Understand \u2022 Calculate \u2022 Act')
          ),
          el('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
            el('button', { onClick: exportClimateReport, title: 'Export your climate report to clipboard',
              style: { padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDCC4 Export'),
            el('button', { onClick: function() { upd('quizOpen', !quizOpen); }, style: { padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: quizOpen ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.08)', color: '#c084fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83E\uDDE0 Quiz'),
            el('div', { style: { padding: '4px 12px', borderRadius: 20, background: 'linear-gradient(135deg, #22c55e, #16a34a)', fontSize: 11, fontWeight: 900, color: '#fff' } }, '\u2B50 ' + (getStemXP ? getStemXP('climateExplorer') : 0) + ' XP'),
            el('button', { onClick: function() { upd('badgesOpen', !badgesOpen); }, style: { padding: '4px 10px', borderRadius: 20, background: badgesOpen ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700, color: '#fbbf24', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + Object.keys(badges).length + '/' + BADGES.length)
          )
        ),

        // ── Hope Meter ──
        el('div', { style: { padding: '0 24px 0', margin: '8px 0 0' } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
            el('span', { style: { fontSize: hopePct >= 80 ? 16 : 13, filter: hopePct >= 80 ? 'drop-shadow(0 0 4px #fbbf24)' : 'none', transition: 'all 0.3s' } }, hopePct >= 100 ? '\uD83C\uDF1F' : hopePct >= 60 ? '\u2600\uFE0F' : '\uD83C\uDF31'),
            el('span', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 700 } }, 'Hope Meter'),
            el('span', { style: { color: '#94a3b8', fontSize: 11, marginLeft: 'auto' } }, hopePts + '/' + HOPE_MILESTONES.length)
          ),
          el('div', { style: { width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
            el('div', { style: { width: hopePct + '%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #22c55e, #3b82f6, #a855f7)', transition: 'width 0.8s ease-out', boxShadow: hopePct >= 50 ? '0 0 8px rgba(34,197,94,0.4)' : 'none' } })
          )
        ),

        // ── Badge Panel (collapsible) ──
        badgesOpen && el('div', { style: { padding: '12px 24px', borderBottom: '1px solid rgba(245,158,11,0.1)' } },
          el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 } },
            BADGES.map(function(b) {
              var earned = !!badges[b.id];
              return el('div', { key: b.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: earned ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (earned ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'), opacity: earned ? 1 : 0.5 } },
                el('span', { style: { fontSize: 18, filter: earned ? 'none' : 'grayscale(1)' } }, b.icon),
                el('div', null,
                  el('div', { style: { fontSize: 10, fontWeight: 800, color: earned ? '#fbbf24' : '#475569' } }, b.label),
                  el('div', { style: { fontSize: 11, color: '#94a3b8' } }, b.desc)
                )
              );
            })
          )
        ),

        // ── Tab Bar ──
        el('div', { style: { display: 'flex', borderBottom: '1px solid rgba(34,197,94,0.1)', padding: '0 16px', overflowX: 'auto' }, role: 'tablist', 'aria-label': 'Climate Explorer sections' },
          [
            { id: 'carbon', icon: '\uD83E\uDDEE', label: 'Carbon Calculator' },
            { id: 'renewables', icon: '\u26A1', label: 'Renewables' },
            { id: 'keeling', icon: '\uD83D\uDCC8', label: 'Keeling Curve' },
            { id: 'tipping', icon: '\u26A0\uFE0F', label: 'Tipping Points' },
            { id: 'justice', icon: '\u2696\uFE0F', label: 'Climate Justice' },
            { id: 'solutions', icon: '\uD83D\uDCA1', label: 'Solutions' }
          ].map(function(t) {
            var active = tab === t.id;
            return el('button', { key: t.id, onClick: function() { visitTab(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '12px 16px', border: 'none', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', background: 'none', color: active ? '#4ade80' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' } },
              el('span', null, t.icon), t.label);
          })
        ),

        // ── Topic-accent hero band (swaps with the active tab) ──
        (function() {
          var TAB_META = {
            carbon:     { accent: '#22c55e', soft: 'rgba(34,197,94,0.12)',  icon: '\uD83E\uDDEE', title: 'Carbon Calculator',     hint: 'Average US household emits ~16 tons CO\u2082/yr. The biggest levers are home heating, transport, and diet \u2014 not plastic straws.' },
            renewables: { accent: '#f59e0b', soft: 'rgba(245,158,11,0.12)', icon: '\u26A1',         title: 'Renewable energy',      hint: 'Solar + wind are now cheaper than new fossil plants in most markets. The hard part is grid integration, not generation cost.' },
            keeling:    { accent: '#06b6d4', soft: 'rgba(6,182,212,0.12)',  icon: '\uD83D\uDCC8', title: 'The Keeling Curve',     hint: 'Continuous CO\u2082 measurement at Mauna Loa since 1958 \u2014 the longest-running atmospheric record. Sawtooth pattern from N. Hemisphere photosynthesis.' },
            tipping:    { accent: '#ef4444', soft: 'rgba(239,68,68,0.12)',  icon: '\u26A0\uFE0F', title: 'Climate tipping points', hint: 'Thresholds where the system shifts state and stays there \u2014 Greenland melt, Amazon dieback, AMOC slowdown. Recent work suggests several may be closer than thought.' },
            justice:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.12)', icon: '\u2696\uFE0F',  title: 'Climate justice',       hint: 'The countries that emitted the least face the worst impacts. Climate is an equity issue first \u2014 vulnerability tracks income, geography, and historical responsibility.' },
            solutions:  { accent: '#3b82f6', soft: 'rgba(59,130,246,0.12)', icon: '\uD83D\uDCA1', title: 'Solutions toolkit',     hint: 'Drawdown ranks 100 solutions by gigatons of CO\u2082 avoided. Refrigerants, food waste, and educating girls top the list \u2014 not what most people guess.' }
          };
          var meta = TAB_META[tab] || TAB_META.carbon;
          return el('div', {
            style: {
              margin: '12px 24px 0',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
            }
          },
            el('div', { style: { fontSize: 32, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            el('div', { style: { flex: 1, minWidth: 220 } },
              el('h3', { style: { color: meta.accent, fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              el('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ── Content ──
        el('div', { style: { padding: 20 } },

          // ═══ QUIZ PANEL ═══
          quizOpen && el('div', { style: { maxWidth: 600, margin: '0 auto 20px', padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(168,85,247,0.25)' } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
              el('div', { style: { color: '#c084fc', fontSize: 14, fontWeight: 900 } }, '\uD83E\uDDE0 Climate Quiz'),
              el('div', { style: { color: '#94a3b8', fontSize: 11 } }, quizCorrect + '/' + quizTotal + ' correct')
            ),
            (function() {
              var q = QUIZ[quizIdx % QUIZ.length];
              return el('div', null,
                el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 12 } }, q.q),
                q.opts.map(function(opt, oi) {
                  var isAnswer = quizAnswer != null;
                  var isCorrect = oi === q.a;
                  var isChosen = oi === quizAnswer;
                  return el('button', { key: oi, disabled: isAnswer,
                    onClick: function() {
                      upd('quizAnswer', oi);
                      upd('quizTotal', quizTotal + 1);
                      playSound(oi === q.a ? 'correct' : 'wrong');
                      if (oi === q.a) { upd('quizCorrect', quizCorrect + 1); awardXP(10); if (announceToSR) announceToSR('Correct! Plus 10 XP.'); } else { if (announceToSR) announceToSR('Incorrect. The correct answer was option ' + (q.a + 1) + '.'); }
                      if (quizCorrect + (oi === q.a ? 1 : 0) >= 8) earnBadge('quizChampion');
                    },
                    style: { display: 'block', width: '100%', padding: '10px 14px', marginBottom: 6, borderRadius: 8, textAlign: 'left',
                      border: isAnswer ? (isCorrect ? '2px solid #22c55e' : isChosen ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)') : '1px solid rgba(255,255,255,0.1)',
                      background: isAnswer ? (isCorrect ? 'rgba(34,197,94,0.1)' : isChosen ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)') : 'rgba(255,255,255,0.04)',
                      color: isAnswer ? (isCorrect ? '#4ade80' : isChosen ? '#fca5a5' : '#94a3b8') : '#cbd5e1',
                      fontSize: 12, fontWeight: 600, cursor: isAnswer ? 'default' : 'pointer', transition: 'all 0.2s' } },
                    opt);
                }),
                isAnswer && el('button', { onClick: function() { upd('quizIdx', quizIdx + 1); upd('quizAnswer', undefined); },
                  style: { marginTop: 10, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Next Question \u2192')
              );
              var isAnswer = quizAnswer != null;
            })()
          ),

          // ═══ TAB: CARBON CALCULATOR ═══
          tab === 'carbon' && el('div', { style: { maxWidth: 680, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 16 } },
              el('div', { style: { color: '#4ade80', fontSize: 16, fontWeight: 900 } }, '\uD83E\uDDEE Your Carbon Footprint'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'See how your daily choices add up \u2014 and how small changes make a big difference')
            ),

            // ── Global Emissions by Sector (context panel) ──
            (function() {
              var sectorsExpanded = d.sectorsExpanded;
              return el('div', { style: { marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(148,163,184,0.15)' } },
                el('button', { onClick: function() { upd('sectorsExpanded', !sectorsExpanded); playSound('tab'); },
                  'aria-expanded': !!sectorsExpanded,
                  style: { width: '100%', padding: 0, border: 'none', background: 'transparent', color: '#cbd5e1', textAlign: 'left', cursor: 'pointer' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sectorsExpanded ? 10 : 0 } },
                    el('div', null,
                      el('span', { style: { color: '#cbd5e1', fontSize: 13, fontWeight: 900 } }, (sectorsExpanded ? '▼ ' : '▶ ') + '🌐 Global Emissions by Sector'),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, marginTop: 2 } }, 'Personal action matters. Structural change matters more. Here\'s where global emissions actually come from.')
                    ),
                    el('span', { style: { color: '#60a5fa', fontSize: 11, fontWeight: 700 } }, '~54 Gt CO\u2082e/yr')
                  )
                ),
                sectorsExpanded && el('div', { style: { marginTop: 4 } },
                  EMISSIONS_BY_SECTOR.map(function(sec) {
                    return el('div', { key: sec.id, style: { marginBottom: 8 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                        el('span', { style: { fontSize: 14, width: 20 } }, sec.emoji),
                        el('span', { style: { flex: 1, color: '#e2e8f0', fontSize: 11, fontWeight: 700 } }, sec.name),
                        el('span', { style: { color: sec.color, fontSize: 12, fontWeight: 900, fontFamily: 'monospace' } }, sec.pct + '%')
                      ),
                      el('div', { style: { height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 } },
                        el('div', { style: { width: (sec.pct * 3.5) + '%', height: '100%', background: sec.color } })
                      ),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5, paddingLeft: 26, fontStyle: 'italic' } }, sec.lever)
                    );
                  }),
                  el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', color: '#cbd5e1', fontSize: 10, lineHeight: 1.6 } },
                    el('strong', { style: { color: '#60a5fa' } }, '🔑 Why this matters:'),
                    ' Personal footprint lives mostly inside transport + buildings + food choices (~28% of total emissions). The other ~72% — electricity, industry, agriculture at scale — requires policy, infrastructure, and corporate change. Both matter. The biggest personal leverage is voting + advocacy + demanding structural change.')
                )
              );
            })(),

            // Activity categories
            Object.keys(CARBON).map(function(catKey) {
              var cat = CARBON[catKey];
              var stateKey = catKey === 'transport' ? 'ccTransport' : catKey === 'food' ? 'ccFood' : catKey === 'energy' ? 'ccEnergy' : 'ccWaste';
              var val = catKey === 'transport' ? ccTransport : catKey === 'food' ? ccFood : catKey === 'energy' ? ccEnergy : ccWaste;
              return el('div', { key: catKey, style: { marginBottom: 16 } },
                el('div', { style: { color: '#94a3b8', fontSize: 12, fontWeight: 800, marginBottom: 8 } }, cat.emoji + ' ' + cat.label),
                el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  cat.opts.map(function(opt, oi) {
                    return optBtn(val === oi, function() {
                      upd(stateKey, oi);
                      playSound('calculate');
                      if (!badges.firstCalc) { earnBadge('firstCalc'); }
                      // Check low footprint after update
                      var newTotal = carbonTotal().total; // recompute
                      if (newTotal < 2000 && !badges.lowFootprint) earnBadge('lowFootprint');
                    }, opt.emoji, opt.label, opt.kg + ' kg/yr');
                  })
                ),
                el('div', { style: { marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: 10, fontStyle: 'italic' } },
                  cat.opts[val].desc)
              );
            }),

            // Results
            el('div', { style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(34,197,94,0.2)', marginTop: 8 } },
              // Canvas donut chart
              el('canvas', { ref: function(c) { if (c) setTimeout(function() { drawDonut(c, ct); }, 0); },
                'aria-label': 'Interactive climate explorer carbon footprint donut chart visualization', role: 'img',
                style: { width: '100%', height: 180, display: 'block', marginBottom: 8 } }),
              // Legend
              el('div', { style: { display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 } },
                [
                  { label: 'Transport', kg: ct.transport, color: '#3b82f6' },
                  { label: 'Food', kg: ct.food, color: '#f59e0b' },
                  { label: 'Energy', kg: ct.energy, color: '#ef4444' },
                  { label: 'Waste', kg: ct.waste, color: '#22c55e' }
                ].map(function(b) {
                  return el('div', { key: b.label, style: { display: 'flex', alignItems: 'center', gap: 4 } },
                    el('div', { style: { width: 10, height: 10, borderRadius: 3, background: b.color } }),
                    el('span', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8' } }, b.label + ': ' + b.kg.toLocaleString() + ' kg')
                  );
                })
              ),

              // Tree comparison
              el('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
                el('div', { style: { fontSize: 24 } }, '\uD83C\uDF33'),
                el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900 } }, 'That\'s like ' + Math.round(ct.total / TREES_PER_YEAR) + ' trees working for a whole year'),
                el('div', { style: { color: '#94a3b8', fontSize: 10, marginTop: 2 } }, 'Each tree absorbs about 22 kg CO\u2082 per year')
              )
            ),

            // Scale toggle
            el('div', { style: { marginTop: 16, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } },
              el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800, marginBottom: 10 } }, '\uD83C\uDF0D What if everyone made your choices?'),
              el('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
                ['school', 'city', 'country'].map(function(s) {
                  var labels = { school: '\uD83C\uDFEB School', city: '\uD83C\uDFD9\uFE0F City', country: '\uD83C\uDDFA\uD83C\uDDF8 Country' };
                  return el('button', { key: s, onClick: function() { upd('ccScale', s); awardXP(5); playSound('calculate'); var nsc = Object.assign({}, scalesViewed); nsc[s] = true; upd('scalesViewed', nsc); if (Object.keys(nsc).length >= 3 && !badges.dataDiver) earnBadge('dataDiver'); },
                    style: { flex: 1, padding: '8px', borderRadius: 8, border: ccScale === s ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', background: ccScale === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', color: ccScale === s ? '#a5b4fc' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    labels[s]);
                })
              ),
              el('div', { style: { textAlign: 'center' } },
                el('div', { style: { color: '#e2e8f0', fontSize: 20, fontWeight: 900 } }, (ct.total * scaleMult / 1000000).toFixed(1) + ' million tons CO\u2082/yr'),
                el('div', { style: { color: '#94a3b8', fontSize: 11 } }, 'If all ' + scaleLabel + ' made these choices'),
                ct.total < 2000 && el('div', { style: { marginTop: 8, color: '#4ade80', fontSize: 12, fontWeight: 700 } }, '\u2728 Great job! Your footprint is below average. Imagine if everyone did this!')
              )
            ),

            // ═══ DETAILED HABIT TRACKER ═══
            el('div', { style: { marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(34,197,94,0.15)' } },
              el('div', { style: { textAlign: 'center', marginBottom: 14 } },
                el('div', { style: { color: '#60a5fa', fontSize: 15, fontWeight: 900 } }, '🔬 Detailed Habit Tracker'),
                el('div', { style: { color: '#94a3b8', fontSize: 11, marginTop: 2 } }, 'Quantify ' + Object.keys(GRANULAR_ITEMS).reduce(function(n, c) { return n + GRANULAR_ITEMS[c].length; }, 0) + ' specific habits across ' + Object.keys(GRANULAR_ITEMS).length + ' categories. Move sliders to match your life.')
              ),
              // Running total banner
              el('div', { style: { padding: 14, marginBottom: 16, borderRadius: 12, background: granular.total > 12000 ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))' : granular.total > 5000 ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))' : 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(59,130,246,0.08))', border: '1px solid ' + (granular.total > 12000 ? 'rgba(239,68,68,0.3)' : granular.total > 5000 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.25)'), textAlign: 'center' } },
                el('div', { style: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 4 } }, 'Your detailed footprint'),
                el('div', { style: { color: granular.total > 12000 ? '#fca5a5' : granular.total > 5000 ? '#fbbf24' : '#4ade80', fontSize: 28, fontWeight: 900 } },
                  (granular.total / 1000).toFixed(2) + ' t CO\u2082e/yr'),
                el('div', { style: { color: '#94a3b8', fontSize: 11, marginTop: 4 } },
                  Math.round(granular.total).toLocaleString() + ' kg \u00B7 ' +
                  Math.round(granular.total / TREES_PER_YEAR) + ' trees/yr worth \u00B7 ' +
                  (granular.total / 2300 * 100).toFixed(0) + '% of Paris-aligned target (2.3 t)')
              ),
              // Category breakdown bars
              el('div', { style: { marginBottom: 16 } },
                [
                  { cat: 'transport', emoji: '🚗', color: '#3b82f6' },
                  { cat: 'food',      emoji: '🍽️', color: '#f59e0b' },
                  { cat: 'energy',    emoji: '⚡',  color: '#ef4444' },
                  { cat: 'digital',   emoji: '📱', color: '#a855f7' },
                  { cat: 'shopping',  emoji: '🛍️', color: '#ec4899' },
                  { cat: 'waste',     emoji: '♻️', color: '#22c55e' }
                ].map(function(catMeta) {
                  var catKg = granular.byCat[catMeta.cat] || 0;
                  var pct = granular.total > 0 ? Math.min(100, (Math.abs(catKg) / granular.total) * 100) : 0;
                  return el('div', { key: catMeta.cat, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    el('span', { style: { fontSize: 14, width: 22 } }, catMeta.emoji),
                    el('div', { style: { flex: 1, height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' } },
                      el('div', { style: { width: pct + '%', height: '100%', background: catMeta.color, transition: 'width 0.3s' } }),
                      el('div', { style: { position: 'absolute', left: 6, top: 2, color: '#e2e8f0', fontSize: 10, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.6)' } }, catMeta.cat)
                    ),
                    el('span', { style: { width: 80, textAlign: 'right', color: '#cbd5e1', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' } }, Math.round(catKg).toLocaleString() + ' kg')
                  );
                })
              ),
              // Per-category accordion with sliders
              Object.keys(GRANULAR_ITEMS).map(function(cat) {
                var items = GRANULAR_ITEMS[cat];
                var isOpen = !!granularExpanded[cat];
                var catLabels = { transport: '🚗 Transportation', food: '🍽️ Food & Diet', energy: '⚡ Home Energy', digital: '📱 Digital & Streaming', shopping: '🛍️ Shopping & Consumer', waste: '♻️ Waste' };
                return el('div', { key: cat, style: { marginBottom: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(30,41,59,0.3)', overflow: 'hidden' } },
                  el('button', { onClick: function() { var ne = Object.assign({}, granularExpanded); ne[cat] = !isOpen; upd('granularExpanded', ne); playSound('tab'); },
                    'aria-expanded': isOpen,
                    style: { width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                    el('span', null, (isOpen ? '▼ ' : '▶ ') + (catLabels[cat] || cat)),
                    el('span', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 600 } }, Math.round(granular.byCat[cat] || 0).toLocaleString() + ' kg/yr')
                  ),
                  isOpen && el('div', { style: { padding: '4px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' } },
                    items.map(function(item) {
                      var freq = granularFreq[item.id] || 0;
                      var thisAnnual = itemAnnualKg(item, freq);
                      // "What if I cut 1 per week" impact preview
                      var cutFreq = Math.max(0, freq - 1);
                      var savings = thisAnnual - itemAnnualKg(item, cutFreq);
                      return el('div', { key: item.id, style: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' } },
                        el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                          el('span', { style: { fontSize: 16, width: 22 } }, item.emoji),
                          el('div', { style: { flex: 1 } },
                            el('div', { style: { color: '#cbd5e1', fontSize: 12, fontWeight: 700 } }, item.label),
                            el('div', { style: { color: '#94a3b8', fontSize: 10, fontStyle: 'italic', marginTop: 1 } }, item.note)
                          ),
                          el('div', { style: { minWidth: 90, textAlign: 'right' } },
                            el('div', { style: { color: thisAnnual > 500 ? '#fca5a5' : thisAnnual > 50 ? '#fbbf24' : thisAnnual > 0 ? '#cbd5e1' : '#94a3b8', fontSize: 12, fontWeight: 800, fontFamily: 'monospace' } }, Math.round(thisAnnual).toLocaleString() + ' kg/yr'),
                            savings > 1 && el('div', { style: { color: '#60a5fa', fontSize: 9, fontWeight: 700, marginTop: 2 } }, '\u2212' + Math.round(savings) + ' kg if cut 1')
                          )
                        ),
                        el('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                          el('input', { type: 'range', min: 0, max: item.max, step: 1, value: freq,
                            onChange: function(e) { setItemFreq(item.id, parseInt(e.target.value, 10)); },
                            'aria-label': item.label + ' frequency',
                            style: { flex: 1, accentColor: '#60a5fa' } }),
                          el('span', { style: { minWidth: 95, textAlign: 'right', color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' } },
                            freq + ' ' + item.unit),
                          // Pledge toggle (only makes sense when user has a current freq)
                          freq > 0 && (function() {
                            var isPledged = !!((d.pledges || {})[item.id]);
                            return el('button', { onClick: function() { togglePledge(item); },
                              title: isPledged ? 'Remove pledge' : 'Pledge to cut this habit',
                              'aria-label': isPledged ? 'Remove pledge on ' + item.label : 'Pledge to reduce ' + item.label,
                              style: { padding: '3px 8px', borderRadius: 6, border: '1px solid ' + (isPledged ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'), background: isPledged ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.03)', color: isPledged ? '#4ade80' : '#94a3b8', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                              isPledged ? '🎯 Pledged' : '+ Pledge');
                          })()
                        )
                      );
                    })
                  )
                );
              }),
              // National comparison
              el('div', { style: { marginTop: 20 } },
                el('button', { onClick: function() { upd('granularCompareOpen', !granularCompareOpen); playSound('action'); },
                  style: { width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid rgba(96,165,250,0.3)', background: granularCompareOpen ? 'rgba(96,165,250,0.12)' : 'rgba(96,165,250,0.04)', color: '#60a5fa', fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
                  (granularCompareOpen ? '▼ ' : '▶ ') + '🌐 How do I compare to different countries?'),
                granularCompareOpen && el('div', { style: { marginTop: 12 } },
                  NATIONAL_AVERAGES.slice().sort(function(a, b) { return b.kg - a.kg; }).map(function(nat) {
                    var maxKg = 20000; // scale cap for visual
                    var pct = Math.min(100, (nat.kg / maxKg) * 100);
                    var youPct = Math.min(100, (granular.total / maxKg) * 100);
                    var isUser = false;
                    return el('div', { key: nat.country, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, padding: '3px 6px', borderRadius: 6, background: nat.highlight ? 'rgba(251,191,36,0.06)' : 'transparent' } },
                      el('span', { style: { width: 22, fontSize: 14 } }, nat.emoji),
                      el('span', { style: { width: 110, color: nat.highlight ? '#fbbf24' : '#cbd5e1', fontSize: 11, fontWeight: 700 } }, nat.country),
                      el('div', { style: { flex: 1, height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 3, position: 'relative', overflow: 'hidden' } },
                        el('div', { style: { width: pct + '%', height: '100%', background: nat.rank === 'highest' ? '#991b1b' : nat.rank === 'high' ? '#ef4444' : nat.rank === 'moderate' ? '#f59e0b' : nat.rank === 'global' ? '#60a5fa' : nat.rank === 'target' ? '#22c55e' : '#475569' } }),
                        // User position indicator
                        granular.total > 0 && el('div', { style: { position: 'absolute', left: 'calc(' + youPct + '% - 1px)', top: -2, width: 2, height: 16, background: '#fff', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }, title: 'Your footprint: ' + Math.round(granular.total) + ' kg' })
                      ),
                      el('span', { style: { width: 72, textAlign: 'right', color: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' } }, (nat.kg / 1000).toFixed(1) + ' t')
                    );
                  }),
                  el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } },
                    el('div', { style: { color: '#4ade80', fontSize: 11, fontWeight: 800, marginBottom: 4 } }, '🎯 Paris Agreement target'),
                    el('div', { style: { color: '#cbd5e1', fontSize: 10, lineHeight: 1.6 } },
                      'To stay below 1.5°C warming, every person on Earth needs to reach ~2.3 t CO\u2082e/yr by 2030. ' +
                      (granular.total > 0 ? (granular.total <= 2300 ? 'You\'re already there — incredible!' : granular.total <= 4500 ? 'You\'re below global average. Next step: Paris-aligned target.' : granular.total <= 8000 ? 'About global average. Focus on top categories above.' : 'Above average — biggest impact comes from cutting flights, beef, and driving.') : 'Start the sliders above to see where you land.')
                    )
                  )
                )
              ),
              // Top-impact "what if" suggestions (based on current highest items)
              granular.total > 0 && (function() {
                var suggestions = [];
                Object.keys(GRANULAR_ITEMS).forEach(function(cat) {
                  GRANULAR_ITEMS[cat].forEach(function(item) {
                    var freq = granularFreq[item.id] || 0;
                    if (freq > 0 && item.kg > 0) {
                      var cutOne = itemAnnualKg(item, freq) - itemAnnualKg(item, Math.max(0, freq - 1));
                      if (cutOne > 5) suggestions.push({ item: item, savings: cutOne, currentFreq: freq });
                    }
                  });
                });
                suggestions.sort(function(a, b) { return b.savings - a.savings; });
                suggestions = suggestions.slice(0, 3);
                if (suggestions.length === 0) return null;
                return el('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.08))', border: '1px solid rgba(168,85,247,0.2)' } },
                  el('div', { style: { color: '#c084fc', fontSize: 12, fontWeight: 800, marginBottom: 8 } }, '💡 Your biggest-leverage changes'),
                  suggestions.map(function(s, si) {
                    return el('div', { key: si, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 4 } },
                      el('span', { style: { fontSize: 16 } }, s.item.emoji),
                      el('div', { style: { flex: 1, color: '#cbd5e1', fontSize: 11 } },
                        'Cut ', el('strong', null, s.item.label.toLowerCase()), ' by one ',
                        el('strong', null, s.item.unit.replace(/s$/, '').split('/')[0]), ' per week:'),
                      el('div', { style: { color: '#4ade80', fontSize: 12, fontWeight: 800, fontFamily: 'monospace' } }, '−' + Math.round(s.savings) + ' kg/yr')
                    );
                  })
                );
              })(),
              // ═══ MY PLEDGES TRACKER ═══
              (function() {
                var pledges = d.pledges || {};
                var pledgeIds = Object.keys(pledges);
                if (pledgeIds.length === 0) return null;
                return el('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.25)' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                    el('div', { style: { color: '#4ade80', fontSize: 13, fontWeight: 900 } }, '🎯 My Climate Pledges (' + pledgeIds.length + ')'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10 } }, 'Check in weekly to build the habit')
                  ),
                  pledgeIds.map(function(pid) {
                    var pledge = pledges[pid];
                    var item = null;
                    Object.keys(GRANULAR_ITEMS).forEach(function(c) {
                      GRANULAR_ITEMS[c].forEach(function(it) { if (it.id === pid) item = it; });
                    });
                    if (!item) return null;
                    var currentFreq = granularFreq[pid] || 0;
                    var onTrack = currentFreq <= pledge.targetFreq;
                    return el('div', { key: pid, style: { padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + (onTrack ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'), marginBottom: 6 } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                        el('span', { style: { fontSize: 18 } }, item.emoji),
                        el('div', { style: { flex: 1 } },
                          el('div', { style: { color: '#e2e8f0', fontSize: 12, fontWeight: 700 } }, item.label),
                          el('div', { style: { color: '#94a3b8', fontSize: 10 } },
                            'Target: ≤ ' + pledge.targetFreq + ' ' + item.unit + ' · Currently: ' + currentFreq + ' ' + item.unit)
                        ),
                        el('span', { style: { padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, background: onTrack ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)', color: onTrack ? '#4ade80' : '#fbbf24' } },
                          onTrack ? '✓ On track' : '⚠ Off target')
                      ),
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                        el('div', { style: { flex: 1, color: '#94a3b8', fontSize: 10 } },
                          '🔥 ' + (pledge.checkins || 0) + ' check-ins' + (pledge.checkins >= 7 ? ' · streak!' : '')),
                        el('button', { onClick: function() { pledgeCheckin(pid); },
                          style: { padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                          '+ Check in'),
                        el('button', { onClick: function() { togglePledge(item); },
                          style: { padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                          '✕')
                      )
                    );
                  })
                );
              })(),
              // Export fallback modal
              d.exportedReport && el('div', { style: { marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(96,165,250,0.3)' } },
                el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                  el('div', { style: { color: '#60a5fa', fontSize: 12, fontWeight: 800 } }, '📄 Climate Report — Copy Manually'),
                  el('button', { onClick: function() { upd('exportedReport', null); }, style: { padding: '2px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, '✕ Close')
                ),
                el('p', { style: { color: '#94a3b8', fontSize: 10, marginBottom: 6 } }, 'Select all (Ctrl/Cmd+A), then copy:'),
                el('textarea', { readOnly: true, value: d.exportedReport, style: { width: '100%', height: 220, fontFamily: 'monospace', fontSize: 10, padding: 8, borderRadius: 6, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(96,165,250,0.15)', color: '#cbd5e1' } })
              )
            )
          ),

          // ═══ TAB: RENEWABLES SIMULATOR ═══
          tab === 'renewables' && el('div', { style: { maxWidth: 680, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 12 } },
              el('div', { style: { color: '#fbbf24', fontSize: 16, fontWeight: 900 } }, '\u26A1 Renewables Impact Simulator'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Design an energy mix and see how it changes our future')
            ),

            // \u2500\u2500 Goal banner: makes the implicit win condition explicit \u2500\u2500
            // The Net-Zero badge earns at fossil <= 5%, but until now that
            // target was nowhere visible to the student. Now stated up
            // front so the four sliders feel like a target, not a sandbox.
            el('div', {
              style: {
                marginBottom: 16, padding: '10px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(245,158,11,0.10) 100%)',
                border: '1px solid rgba(34,197,94,0.30)', borderLeft: '4px solid #22c55e',
                color: '#ecfdf5'
              }
            },
              el('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 4 } }, '\uD83C\uDFAF Goal: drive fossil share to 5% or lower'),
              el('div', { style: { fontSize: 11, lineHeight: 1.5, color: '#bbf7d0' } },
                'The four sliders are your renewable mix. Whatever they do not add up to gets filled by fossil fuels. ',
                'Hit Fossil at or below 5% to earn the Net-Zero badge. Below the sliders you will see total gigatons of CO\u2082 avoided over 25 years for your design, with an AI analysis of trade-offs.'
              )
            ),

            // Scenario presets
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
              SCENARIOS.map(function(sc, si) {
                return el('button', { key: si, onClick: function() { upd({ rsSolar: sc.mix[0], rsWind: sc.mix[1], rsHydro: sc.mix[2], rsNuclear: sc.mix[3] }); playSound('scenario'); var ns = Object.assign({}, scenariosTried); ns[si] = true; upd('scenariosTried', ns); if (Object.keys(ns).length >= 4 && !badges.scenarioTester) earnBadge('scenarioTester'); },
                  style: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                  sc.label);
              })
            ),

            // Energy mix sliders
            el('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 } },
              el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' } }, 'Design Your Energy Mix'),
              slider('Solar', '\u2600\uFE0F', rsSolar, '#f59e0b', function(e) { upd('rsSolar', parseInt(e.target.value)); playSound('slider'); }),
              slider('Wind', '\uD83C\uDF2C\uFE0F', rsWind, '#60a5fa', function(e) { upd('rsWind', parseInt(e.target.value)); playSound('slider'); }),
              slider('Hydro', '\uD83D\uDCA7', rsHydro, '#22d3ee', function(e) { upd('rsHydro', parseInt(e.target.value)); playSound('slider'); }),
              slider('Nuclear', '\u2622\uFE0F', rsNuclear, '#a78bfa', function(e) { upd('rsNuclear', parseInt(e.target.value)); playSound('slider'); }),
              el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', borderRadius: 8, background: rsFossil > 50 ? 'rgba(239,68,68,0.1)' : rsFossil > 20 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)' } },
                el('span', { style: { fontSize: 16 } }, '\uD83C\uDFED'),
                el('span', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 60 } }, 'Fossil'),
                el('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                  el('div', { style: { width: rsFossil + '%', height: '100%', borderRadius: 4, background: rsFossil > 50 ? '#ef4444' : rsFossil > 20 ? '#f59e0b' : '#22c55e', transition: 'all 0.5s' } })
                ),
                el('span', { style: { fontSize: 13, fontWeight: 900, color: rsFossil > 50 ? '#ef4444' : rsFossil > 20 ? '#f59e0b' : '#22c55e', width: 40, textAlign: 'right', fontFamily: 'monospace' } }, rsFossil + '%')
              ),
              rsFossil <= 5 && !badges.netZero && (function() { earnBadge('netZero'); return null; })()
            ),

            // Timespan selector
            el('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 } },
              [5, 10, 25, 50].map(function(y) {
                return el('button', { key: y, onClick: function() { upd('rsTimespan', y); },
                  style: { padding: '6px 14px', borderRadius: 8, border: rsTimespan === y ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', background: rsTimespan === y ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)', color: rsTimespan === y ? '#4ade80' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                  y + ' years');
              })
            ),

            // Results
            el('div', { style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)' } },
              el('div', { style: { display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 } },
                el('div', null,
                  el('div', { style: { color: rsReductionPct > 50 ? '#4ade80' : rsReductionPct > 20 ? '#fbbf24' : '#f87171', fontSize: 28, fontWeight: 900 } }, rsReductionPct + '%'),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Emissions Reduction')
                ),
                el('div', null,
                  el('div', { style: { color: '#60a5fa', fontSize: 28, fontWeight: 900 } }, cumulativeAvoided.toFixed(0)),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Gt CO\u2082 Avoided')
                ),
                el('div', null,
                  el('div', { style: { color: '#a78bfa', fontSize: 28, fontWeight: 900 } }, timeline[timeline.length - 1].gt.toFixed(1)),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Gt/yr by ' + (2025 + rsTimespan))
                )
              ),
              // Canvas emissions timeline
              el('canvas', { ref: function(c) { if (c) setTimeout(function() { drawTimeline(c, timeline, BASELINE_GT); }, 0); },
                'aria-label': 'Interactive climate explorer emissions timeline visualization', role: 'img',
                style: { width: '100%', height: 160, display: 'block', borderRadius: 8, marginBottom: 12, background: 'rgba(0,0,0,0.15)' } }),

              // Hopeful message
              el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
                el('div', { style: { color: '#4ade80', fontSize: 13, fontWeight: 800 } },
                  rsReductionPct >= 80 ? '\uD83C\uDF1F Amazing! This mix could help us meet the Paris Agreement goals!' :
                  rsReductionPct >= 50 ? '\u26A1 Great progress! Every percentage point of clean energy compounds over time.' :
                  rsReductionPct >= 20 ? '\uD83C\uDF31 A good start! Try adding more renewables to see bigger impact.' :
                  '\uD83D\uDCA1 The world is transitioning \u2014 try increasing solar and wind to see the difference!'
                ),
                rsReductionPct >= 50 && el('div', { style: { color: '#6ee7b7', fontSize: 11, marginTop: 4 } },
                  'Fun fact: Solar capacity has grown 300\u00D7 since 2000. The clean energy revolution is accelerating.')
              )
            ),

            // AI scenario
            callGemini && el('div', { style: { marginTop: 16, textAlign: 'center' } },
              el('button', { onClick: function() {
                  if (aiLoading) return;
                  upd('aiLoading', true);
                  var prompt = 'You are a hopeful climate science educator for a ' + gradeBand + ' student. They designed an energy mix: ' + rsSolar + '% solar, ' + rsWind + '% wind, ' + rsHydro + '% hydro, ' + rsNuclear + '% nuclear, ' + rsFossil + '% fossil. Give a 2-3 sentence encouraging analysis of their mix. Mention one real-world country or city doing something similar. End with an inspiring fact. Keep it under 80 words. Do NOT use markdown.';
                  callGemini(prompt, true, false, 0.8).then(function(r) { upd({ aiResponse: r, aiLoading: false }); playSound('scenario'); if (!badges.aiConsultant) earnBadge('aiConsultant'); }).catch(function() { upd('aiLoading', false); });
                }, disabled: aiLoading,
                style: { padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: aiLoading ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.08)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer' } },
                aiLoading ? '\u23F3 Analyzing...' : '\uD83E\uDD16 AI Analysis of Your Mix'),
              aiResponse && el('div', { style: { marginTop: 10, padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', color: '#94a3b8', fontSize: 12, lineHeight: 1.7, textAlign: 'left' } }, aiResponse)
            )
          ),

          // ═══ TAB: KEELING CURVE ═══
          tab === 'keeling' && el('div', { style: { maxWidth: 720, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 16 } },
              el('div', { style: { color: '#60a5fa', fontSize: 16, fontWeight: 900 } }, '\uD83D\uDCC8 The Keeling Curve'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'The most important graph in climate science \u2014 60+ years of atmospheric CO\u2082 from Mauna Loa, Hawaii')
            ),
            // Chart
            el('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(96,165,250,0.2)', marginBottom: 16 } },
              el('canvas', { ref: function(cv) {
                if (!cv) return;
                var dpr = window.devicePixelRatio || 1;
                var w = cv.offsetWidth || 600, h = 260;
                cv.width = w * dpr; cv.height = h * dpr;
                cv.style.height = h + 'px';
                var c = cv.getContext('2d'); c.scale(dpr, dpr);
                c.clearRect(0, 0, w, h);
                // Axes
                var padL = 50, padR = 20, padT = 20, padB = 40;
                var plotW = w - padL - padR, plotH = h - padT - padB;
                var minY = 280, maxY = 440;
                var minX = 1950, maxX = 2030;
                var x2px = function(y) { return padL + ((y - minX) / (maxX - minX)) * plotW; };
                var y2py = function(p) { return padT + plotH - ((p - minY) / (maxY - minY)) * plotH; };
                // Background gradient (warming zone)
                var grad = c.createLinearGradient(0, padT, 0, padT + plotH);
                grad.addColorStop(0, 'rgba(239,68,68,0.08)');
                grad.addColorStop(0.5, 'rgba(245,158,11,0.05)');
                grad.addColorStop(1, 'rgba(34,197,94,0.05)');
                c.fillStyle = grad; c.fillRect(padL, padT, plotW, plotH);
                // Horizontal milestone lines
                KEELING_MILESTONES.forEach(function(m) {
                  var py = y2py(m.ppm);
                  if (py < padT || py > padT + plotH) return;
                  c.strokeStyle = 'rgba(148,163,184,0.25)'; c.lineWidth = 1; c.setLineDash([4, 4]);
                  c.beginPath(); c.moveTo(padL, py); c.lineTo(padL + plotW, py); c.stroke();
                  c.setLineDash([]);
                  c.fillStyle = '#94a3b8'; c.font = '9px system-ui'; c.textAlign = 'left';
                  c.fillText(m.ppm + ' ppm', padL + 4, py - 2);
                });
                // X-axis grid
                c.strokeStyle = 'rgba(148,163,184,0.1)'; c.lineWidth = 1;
                for (var gx = 1960; gx <= 2020; gx += 20) {
                  var xp = x2px(gx);
                  c.beginPath(); c.moveTo(xp, padT); c.lineTo(xp, padT + plotH); c.stroke();
                  c.fillStyle = '#94a3b8'; c.font = '10px system-ui'; c.textAlign = 'center';
                  c.fillText(String(gx), xp, h - padB + 16);
                }
                // Pre-industrial reference line (280 ppm)
                var piY = y2py(280);
                c.strokeStyle = 'rgba(34,197,94,0.6)'; c.lineWidth = 1.5; c.setLineDash([6, 3]);
                c.beginPath(); c.moveTo(padL, piY); c.lineTo(padL + plotW, piY); c.stroke();
                c.setLineDash([]);
                c.fillStyle = '#4ade80'; c.font = 'bold 10px system-ui'; c.textAlign = 'left';
                c.fillText('Pre-industrial 280 ppm', padL + 4, piY + 12);
                // The Keeling data line (CO₂)
                c.strokeStyle = '#60a5fa'; c.lineWidth = 2.5;
                c.beginPath();
                KEELING_DATA.forEach(function(pt, i) {
                  var px = x2px(pt.y), py = y2py(pt.ppm);
                  if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
                });
                c.stroke();
                // Data points
                KEELING_DATA.forEach(function(pt) {
                  var px = x2px(pt.y), py = y2py(pt.ppm);
                  c.fillStyle = '#3b82f6';
                  c.beginPath(); c.arc(px, py, 3, 0, 6.28); c.fill();
                });
                // ── Global temperature anomaly (secondary Y-axis, red line) ──
                var minT = -0.5, maxT = 2.0;
                var t2py = function(temp) { return padT + plotH - ((temp - minT) / (maxT - minT)) * plotH; };
                // Secondary Y-axis grid + labels on right
                [0, 0.5, 1.0, 1.5].forEach(function(tmark) {
                  var ty = t2py(tmark);
                  c.fillStyle = '#f87171'; c.font = '9px system-ui'; c.textAlign = 'right';
                  c.fillText(tmark.toFixed(1) + '°C', w - padR + 4, ty + 3);
                });
                // Paris 1.5°C danger line
                var parisY = t2py(1.5);
                c.strokeStyle = 'rgba(239,68,68,0.6)'; c.lineWidth = 1; c.setLineDash([2, 3]);
                c.beginPath(); c.moveTo(padL, parisY); c.lineTo(padL + plotW, parisY); c.stroke();
                c.setLineDash([]);
                c.fillStyle = '#ef4444'; c.font = 'bold 9px system-ui'; c.textAlign = 'right';
                c.fillText('Paris 1.5°C', w - padR - 4, parisY - 3);
                // Temperature line
                c.strokeStyle = '#ef4444'; c.lineWidth = 2;
                c.beginPath();
                GLOBAL_TEMP.forEach(function(pt, i) {
                  var px = x2px(pt.y), py = t2py(pt.t);
                  if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
                });
                c.stroke();
                // Temperature dots
                GLOBAL_TEMP.forEach(function(pt) {
                  var px = x2px(pt.y), py = t2py(pt.t);
                  c.fillStyle = '#ef4444';
                  c.beginPath(); c.arc(px, py, 2.5, 0, 6.28); c.fill();
                });
                // Current level callouts
                var last = KEELING_DATA[KEELING_DATA.length - 1];
                var lastT = GLOBAL_TEMP[GLOBAL_TEMP.length - 1];
                c.fillStyle = '#fbbf24'; c.font = 'bold 11px system-ui'; c.textAlign = 'right';
                c.fillText('Today: ' + last.ppm + ' ppm', w - padR - 4, y2py(last.ppm) - 8);
                c.fillStyle = '#fca5a5'; c.font = 'bold 11px system-ui'; c.textAlign = 'right';
                c.fillText('+' + lastT.t.toFixed(2) + '°C', w - padR - 4, t2py(lastT.t) + 14);
                // Legend
                c.fillStyle = '#60a5fa'; c.fillRect(padL + 6, 4, 10, 3);
                c.fillStyle = '#93c5fd'; c.font = '9px system-ui'; c.textAlign = 'left';
                c.fillText('CO\u2082 (left axis)', padL + 20, 10);
                c.fillStyle = '#ef4444'; c.fillRect(padL + 110, 4, 10, 3);
                c.fillStyle = '#fca5a5'; c.fillText('Temp anomaly (right axis)', padL + 124, 10);
                // Y-axis labels
                c.save(); c.translate(12, padT + plotH / 2); c.rotate(-Math.PI / 2);
                c.fillStyle = '#94a3b8'; c.font = '11px system-ui'; c.textAlign = 'center';
                c.fillText('CO\u2082 (ppm)', 0, 0); c.restore();
                c.save(); c.translate(w - 4, padT + plotH / 2); c.rotate(Math.PI / 2);
                c.fillStyle = '#f87171'; c.font = '11px system-ui'; c.textAlign = 'center';
                c.fillText('\u0394T (°C)', 0, 0); c.restore();
              }, style: { display: 'block', width: '100%', height: '260px' }, role: 'img', 'aria-label': 'Dual-axis chart showing atmospheric CO2 rising from 315 to ' + KEELING_DATA[KEELING_DATA.length - 1].ppm + ' ppm alongside global temperature anomaly rising from 0 to ' + GLOBAL_TEMP[GLOBAL_TEMP.length - 1].t.toFixed(2) + ' degrees Celsius' })
            ),
            // Causation note
            el('div', { style: { padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 } },
              el('div', { style: { color: '#fca5a5', fontSize: 11, fontWeight: 800, marginBottom: 4 } }, '🔥 CO₂ drives warming — the two lines track together'),
              el('div', { style: { color: '#cbd5e1', fontSize: 10, lineHeight: 1.6 } },
                'Atmospheric CO\u2082 has risen from 315 ppm (1958) to ' + KEELING_DATA[KEELING_DATA.length - 1].ppm + ' ppm today. Global temperature has risen from near 0°C to +' + GLOBAL_TEMP[GLOBAL_TEMP.length - 1].t.toFixed(2) + '°C above pre-industrial. This correlation isn\'t coincidence — it\'s causation, proven by physics (the greenhouse effect) and observation (matching patterns over 800,000 years of ice-core records).')
            ),
            // Milestones list
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10, marginBottom: 16 } },
              KEELING_MILESTONES.map(function(m) {
                var isCurrent = Math.abs(m.ppm - KEELING_DATA[KEELING_DATA.length - 1].ppm) < 5;
                return el('div', { key: m.ppm, style: { padding: 12, borderRadius: 10, background: isCurrent ? 'rgba(251,191,36,0.08)' : 'rgba(96,165,250,0.04)', border: '1px solid ' + (isCurrent ? 'rgba(251,191,36,0.25)' : 'rgba(96,165,250,0.15)') } },
                  el('div', { style: { color: isCurrent ? '#fbbf24' : '#60a5fa', fontSize: 12, fontWeight: 800, marginBottom: 2 } }, m.ppm + ' ppm'),
                  el('div', { style: { color: '#cbd5e1', fontSize: 11, fontWeight: 700, marginBottom: 4 } }, m.label),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } }, m.note)
                );
              })
            ),
            // Why it matters
            el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.06))', border: '1px solid rgba(96,165,250,0.2)' } },
              el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800, marginBottom: 6 } }, '\uD83D\uDD2C Why the Keeling Curve matters'),
              el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.7 } },
                'Charles David Keeling\'s Mauna Loa measurements (starting 1958) are the single most important dataset in climate science. They proved two things the fossil-fuel industry long denied: (1) atmospheric CO\u2082 is rising, and (2) the rise is human-caused \u2014 the isotopic signature of the CO\u2082 matches burned fossil carbon, not volcanic or ocean sources. Ice cores push the record back 800,000 years: CO\u2082 has never been this high during that entire span.')
            )
          ),

          // ═══ TAB: TIPPING POINTS ═══
          tab === 'tipping' && el('div', { style: { maxWidth: 720, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 16 } },
              el('div', { style: { color: '#f87171', fontSize: 16, fontWeight: 900 } }, '\u26A0\uFE0F Climate Tipping Points'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Thresholds beyond which Earth-system changes become self-reinforcing and irreversible on human timescales')
            ),

            // ═══ CARBON BUDGET CLOCK ═══
            (function() {
              var userBurnRate = d.budgetBurnRate != null ? d.budgetBurnRate : GLOBAL_EMISSIONS_RATE;
              return el('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(251,146,60,0.08))', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16 } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                  el('span', { style: { fontSize: 20 } }, '🕐'),
                  el('div', null,
                    el('div', { style: { color: '#fca5a5', fontSize: 14, fontWeight: 900 } }, 'The Carbon Budget Clock'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10 } }, 'How much CO\u2082 can we still emit before warming passes key thresholds?')
                  )
                ),
                // Budget rows
                CARBON_BUDGETS.map(function(b) {
                  var yearsLeft = userBurnRate > 0 ? (b.gtRemaining / userBurnRate) : 999;
                  var pctUsedIfConstant = yearsLeft < 1 ? 100 : 0;
                  return el('div', { key: b.limit, style: { marginBottom: 10 } },
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      el('div', { style: { minWidth: 80, color: b.color, fontSize: 13, fontWeight: 900 } }, '+' + b.limit + '°C'),
                      el('div', { style: { flex: 1 } },
                        el('div', { style: { color: '#cbd5e1', fontSize: 11, fontWeight: 700 } }, b.gtRemaining + ' Gt CO\u2082 remaining'),
                        el('div', { style: { color: '#94a3b8', fontSize: 10 } }, '→ ' + yearsLeft.toFixed(1) + ' years at ' + userBurnRate + ' Gt/yr pace')
                      ),
                      el('div', { style: { padding: '3px 8px', borderRadius: 10, background: b.color + '20', color: b.color, fontSize: 10, fontWeight: 800 } },
                        yearsLeft < 10 ? '🔥 urgent' : yearsLeft < 20 ? '⚠️ close' : '✅ feasible')
                    ),
                    el('div', { style: { height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' } },
                      el('div', { style: { width: Math.min(100, (yearsLeft / 30) * 100) + '%', height: '100%', background: b.color } })
                    )
                  );
                }),
                // Interactive burn rate slider
                el('div', { style: { marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                    el('span', { style: { color: '#cbd5e1', fontSize: 11, fontWeight: 700 } }, '🎛️ Annual emission rate (slide to simulate action)'),
                    el('span', { style: { color: '#fbbf24', fontSize: 13, fontWeight: 900, fontFamily: 'monospace' } }, userBurnRate + ' Gt/yr')
                  ),
                  el('input', { type: 'range', min: 0, max: 50, step: 1, value: userBurnRate,
                    onChange: function(e) { upd('budgetBurnRate', parseInt(e.target.value, 10)); playSound('slider'); },
                    'aria-label': 'Annual global CO2 emission rate',
                    style: { width: '100%', accentColor: '#ef4444' } }),
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 9, marginTop: 2 } },
                    el('span', null, '0 (net-zero)'),
                    el('span', null, '20 (halved)'),
                    el('span', null, '40 (today ▼)'),
                    el('span', null, '50 (growth)')
                  ),
                  el('div', { style: { marginTop: 8, color: '#94a3b8', fontSize: 10, lineHeight: 1.6 } },
                    userBurnRate === 0 ? '🌟 Net-zero: budgets stop shrinking. Warming stabilizes.' :
                    userBurnRate <= 10 ? '✨ Aggressive decline. Warming slowdown becomes possible.' :
                    userBurnRate <= 20 ? '👍 Halved from today. 1.5°C budget lasts 25 years instead of 6.' :
                    userBurnRate <= 30 ? '⚠️ Modest reduction. Blows the 1.5°C budget but 2°C may hold.' :
                    userBurnRate <= 40 ? '🔥 Business-as-usual. 1.5°C budget exhausted by ~2030.' :
                    '🚨 Growth trajectory. Paris targets impossible. 2°C likely breached.')
                ),
                el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } },
                  '📚 Budgets are from IPCC AR6 WG1 (50% probability of staying below limit). Every Gt emitted permanently reduces the remaining budget — unlike a bank, there\'s no way to "earn it back." Negative emissions (direct air capture) are still early and expensive. Emission reduction is far cheaper per ton.')
              );
            })(),

            // ═══ IPCC FUTURE SCENARIOS EXPLORER ═══
            (function() {
              var pickedId = d.scenarioPicked || 'ssp245';
              var picked = IPCC_SCENARIOS.find(function(s) { return s.id === pickedId; }) || IPCC_SCENARIOS[2];
              return el('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(30,41,59,0.4)', border: '1px solid ' + picked.color + '40', marginBottom: 16 } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                  el('span', { style: { fontSize: 20 } }, '🔮'),
                  el('div', null,
                    el('div', { style: { color: '#e2e8f0', fontSize: 14, fontWeight: 900 } }, 'IPCC Future Scenarios Explorer'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10 } }, 'Five pathways the IPCC uses to project climate futures. Your choices + policy choices decide which one we live in.')
                  )
                ),
                // Scenario buttons
                el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, marginBottom: 14 } },
                  IPCC_SCENARIOS.map(function(s) {
                    var isActive = pickedId === s.id;
                    return el('button', { key: s.id, onClick: function() { upd('scenarioPicked', s.id); playSound('scenario'); },
                      'aria-pressed': isActive,
                      style: { padding: '10px 6px', borderRadius: 8, border: '2px solid ' + (isActive ? s.color : 'rgba(255,255,255,0.1)'), background: isActive ? s.color + '20' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' } },
                      el('div', { style: { color: s.color, fontSize: 11, fontWeight: 900, marginBottom: 2 } }, s.label),
                      el('div', { style: { color: '#cbd5e1', fontSize: 16, fontWeight: 900, fontFamily: 'monospace' } }, '+' + s.temp2100.toFixed(1) + '°C'),
                      el('div', { style: { color: '#94a3b8', fontSize: 9, marginTop: 2 } }, 'by 2100')
                    );
                  })
                ),
                // Selected scenario detail
                el('div', { style: { padding: 14, borderRadius: 10, background: picked.color + '12', border: '1px solid ' + picked.color + '35' } },
                  el('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 } },
                    el('div', { style: { color: picked.color, fontSize: 13, fontWeight: 900 } }, picked.label),
                    el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 700 } }, picked.name)
                  ),
                  el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.5, marginBottom: 10 } },
                    el('strong', { style: { color: '#94a3b8' } }, 'Temperature by 2100: '),
                    '+' + picked.temp2100.toFixed(1) + '°C (likely range ' + picked.tempRange[0] + '–' + picked.tempRange[1] + '°C)'),
                  el('div', { style: { marginBottom: 8 } },
                    el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, '📉 Emissions required by 2050'),
                    el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.5 } },
                      picked.emissions2050 + ' Gt CO\u2082/year (today: ~' + GLOBAL_EMISSIONS_RATE + ' Gt)' +
                      (picked.emissions2050 === 0 ? ' — net-zero!' : picked.emissions2050 < 20 ? ' — major cuts.' : picked.emissions2050 > 40 ? ' — increased from today.' : ''))
                  ),
                  el('div', { style: { marginBottom: 8 } },
                    el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, '🛠️ What it requires'),
                    el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, picked.requires)
                  ),
                  el('div', { style: { marginBottom: 8 } },
                    el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, '🌊 Impacts at this level'),
                    el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, picked.impacts)
                  ),
                  el('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: picked.color, fontSize: 11, fontWeight: 700, fontStyle: 'italic' } },
                    '📌 Current likelihood: ' + picked.likelihood)
                ),
                el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(148,163,184,0.06)', color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } },
                  '📚 Scenarios from IPCC AR6 Working Group I. SSP = "Shared Socioeconomic Pathway". The number pair (e.g., 1-2.6) combines societal storyline (1–5) with radiative forcing in W/m² by 2100. Current policies put us on track for roughly SSP2-4.5. Each incremental action steers toward the lower-warming lanes.')
              );
            })(),

            // Warming-level scale visual
            el('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: 16 } },
              el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 10, textAlign: 'center', fontWeight: 700 } }, 'Global warming above pre-industrial (°C) \u2014 we are here: ~1.2°C (2024)'),
              el('div', { style: { position: 'relative', height: 40, borderRadius: 6, background: 'linear-gradient(to right, #22c55e 0%, #fbbf24 30%, #f97316 55%, #ef4444 80%, #991b1b 100%)', marginBottom: 8 } },
                // Tick markers at 1, 1.5, 2, 3, 4°C
                [1.0, 1.5, 2.0, 3.0, 4.0].map(function(temp) {
                  var pct = (temp / 5.0) * 100;
                  return el('div', { key: temp, style: { position: 'absolute', left: pct + '%', top: -4, height: 48, width: 1, background: 'rgba(255,255,255,0.4)' } });
                }),
                // Current position marker
                el('div', { style: { position: 'absolute', left: ((1.2 / 5.0) * 100) + '%', top: -10, transform: 'translateX(-50%)', color: '#fff', fontSize: 14 } }, '▼'),
                // Paris 1.5 marker
                el('div', { style: { position: 'absolute', left: ((1.5 / 5.0) * 100) + '%', top: 44, color: '#fbbf24', fontSize: 9, fontWeight: 800, transform: 'translateX(-50%)' } }, '1.5°C Paris'),
                el('div', { style: { position: 'absolute', left: ((2.0 / 5.0) * 100) + '%', top: 44, color: '#f97316', fontSize: 9, fontWeight: 800, transform: 'translateX(-50%)' } }, '2.0°C')
              )
            ),
            // Tipping point cards
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 } },
              TIPPING_POINTS.map(function(tp) {
                var statusColors = { 'happening': '#ef4444', 'weakening': '#f97316', 'at-risk': '#fbbf24', 'future-risk': '#60a5fa' };
                var statusLabels = { 'happening': '🔥 HAPPENING NOW', 'weakening': '📉 WEAKENING', 'at-risk': '⚠️ AT RISK', 'future-risk': '🔮 FUTURE RISK' };
                var sc = statusColors[tp.status] || '#94a3b8';
                return el('div', { key: tp.id, style: { padding: 14, borderRadius: 12, background: 'rgba(30,41,59,0.4)', border: '1px solid ' + sc + '40' } },
                  el('div', { style: { display: 'flex', alignItems: 'start', gap: 10, marginBottom: 8 } },
                    el('span', { style: { fontSize: 28 } }, tp.emoji),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 800, marginBottom: 2 } }, tp.name),
                      el('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                        el('span', { style: { padding: '2px 8px', borderRadius: 10, background: sc + '20', color: sc, fontSize: 9, fontWeight: 800 } }, statusLabels[tp.status] || tp.status),
                        el('span', { style: { padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 9, fontWeight: 700 } }, 'Threshold: ~' + tp.threshold + '°C')
                      )
                    )
                  ),
                  el('p', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6, marginBottom: 8 } }, tp.desc),
                  el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid ' + sc } },
                    el('div', { style: { color: sc, fontSize: 10, fontWeight: 800, marginBottom: 2 } }, '💥 Cascade effect'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } }, tp.cascade)
                  )
                );
              })
            ),
            // ═══ SEA LEVEL RISE EXPLORER ═══
            (function() {
              var slr = d.slrMeters != null ? d.slrMeters : 1;
              var SLR_IMPACTS = {
                0:  { displaced: 0,    cities: [], desc: 'Baseline — today\'s coastlines.' },
                1:  { displaced: 150,  cities: ['Miami Beach', 'parts of New Orleans', 'Maldives'],
                      desc: 'Locked in at ~1.5°C sustained warming. Most coastal adaptation still possible with seawalls, managed retreat.' },
                2:  { displaced: 280,  cities: ['Most of Bangladesh coast', 'Alexandria (Egypt)', 'Shanghai waterfront', 'Jakarta (already sinking)'],
                      desc: 'Associated with ~2.5°C warming. Displaces more people than any war in history. Hurricane surge becomes catastrophic for inland areas.' },
                3:  { displaced: 410,  cities: ['Florida peninsula mostly submerged', 'Netherlands without dikes', 'Bangkok'],
                      desc: 'Likely by 2300 at 3°C. Entire nations lose viable territory. New Orleans, Venice, much of Vietnam.' },
                5:  { displaced: 700,  cities: ['Boston Harbor', 'London (without Thames barrier)', 'Tokyo Bay', 'San Francisco Bay'],
                      desc: 'Multi-century commitment at 4°C warming. Requires Greenland + West Antarctic collapse. Human civilization\'s coastal geography permanently rewritten.' },
                10: { displaced: 1100, cities: ['All major port cities worldwide'],
                      desc: 'Locked-in with Greenland + most of West Antarctic gone. A hotter Pliocene-era coastline. Several centuries to millennia to fully realize.' }
              };
              var impact = SLR_IMPACTS[slr] || SLR_IMPACTS[1];
              return el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(14,165,233,0.08))', border: '1px solid rgba(59,130,246,0.25)', marginBottom: 12 } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                  el('span', { style: { fontSize: 20 } }, '🌊'),
                  el('div', null,
                    el('div', { style: { color: '#60a5fa', fontSize: 13, fontWeight: 900 } }, 'Sea Level Rise Explorer'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10 } }, 'What happens to coastlines at different levels of warming?')
                  )
                ),
                // Slider with labeled steps
                el('div', { style: { marginBottom: 10 } },
                  el('input', { type: 'range', min: 0, max: 10, step: 1, value: slr,
                    onChange: function(e) {
                      var v = parseInt(e.target.value, 10);
                      // Snap to known keys
                      var keys = [0, 1, 2, 3, 5, 10];
                      var nearest = keys.reduce(function(p, c) { return Math.abs(c - v) < Math.abs(p - v) ? c : p; }, keys[0]);
                      upd('slrMeters', nearest);
                      playSound('slider');
                    },
                    'aria-label': 'Sea level rise in meters',
                    style: { width: '100%', accentColor: '#3b82f6' } }),
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 9, fontWeight: 700 } },
                    [0, 1, 2, 3, 5, 10].map(function(m) {
                      return el('span', { key: m, style: { color: slr === m ? '#60a5fa' : '#94a3b8' } }, m + ' m');
                    })
                  )
                ),
                // Impact display
                el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(59,130,246,0.15)' } },
                  el('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 } },
                    el('div', { style: { color: '#93c5fd', fontSize: 20, fontWeight: 900, fontFamily: 'monospace' } }, '+' + slr + ' m'),
                    el('div', { style: { color: '#60a5fa', fontSize: 14, fontWeight: 800 } }, impact.displaced > 0 ? impact.displaced + 'M people displaced' : 'No displacement')
                  ),
                  el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6, marginBottom: impact.cities.length > 0 ? 8 : 0 } }, impact.desc),
                  impact.cities.length > 0 && el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } },
                    el('strong', { style: { color: '#fbbf24' } }, 'Impacted: '),
                    impact.cities.join(' · ')
                  )
                ),
                el('div', { style: { marginTop: 8, color: '#94a3b8', fontSize: 9, fontStyle: 'italic' } },
                  '📚 Sources: IPCC AR6 SROCC; Kopp et al. 2023 probabilistic projections; Climate Central coastal models. The ocean has ~90% of the excess heat and will keep expanding/melting ice for centuries even if emissions stop today.')
              );
            })(),

            // Phenology cross-link (connects to Beehive tool)
            el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(34,197,94,0.06))', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 12 } },
              el('div', { style: { color: '#fbbf24', fontSize: 12, fontWeight: 800, marginBottom: 6 } }, '🐝 Phenological Mismatch — the silent tipping point'),
              el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.7 } },
                'Climate change is decoupling the timing of flowers and pollinators. Apple trees in New England now bloom 11 days earlier than in 1970, but bee emergence has shifted less. When flowers open before bees wake, or after they\'ve already died for the season, whole food webs unravel. Try the Beehive Simulator\'s Bloom Calendar to see which plants depend on which months \u2014 then imagine shifting it all forward.')
            ),
            // Hope note
            el('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } },
              el('div', { style: { color: '#4ade80', fontSize: 12, fontWeight: 800, marginBottom: 4 } }, '🌱 What this means for action'),
              el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.7 } },
                'Tipping points aren\'t destiny. Every tenth of a degree matters: 1.5°C is far better than 1.6°C, and 2.0°C is far better than 2.5°C. The climate system doesn\'t "round up". Every ton of CO\u2082 not emitted reduces the odds of triggering these cascades.')
            )
          ),

          // ═══ TAB: CLIMATE JUSTICE ═══
          tab === 'justice' && el('div', { style: { maxWidth: 700, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#fbbf24', fontSize: 16, fontWeight: 900 } }, '\u2696\uFE0F Climate Justice'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Who is most affected by climate change \u2014 and is it fair?')
            ),

            // Key insight
            el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.06))', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, textAlign: 'center' } },
              el('div', { style: { color: '#fbbf24', fontSize: 13, fontWeight: 800 } }, '\uD83D\uDCA1 Key Insight'),
              el('div', { style: { color: '#94a3b8', fontSize: 12, lineHeight: 1.6, marginTop: 4 } },
                'The communities that contribute the LEAST to climate change often face the GREATEST risks. This is what scientists and advocates call climate injustice.')
            ),

            // \u2500\u2500 Play-order hint \u2500\u2500
            // The Climate Justice badge unlocks at 5 regions explored,
            // but the grid shows 9 collapsed cards and the badge target
            // was previously invisible. Now stated as the goal up front.
            (function() {
              var regionsViewed = Object.keys(d.regionsViewed || {}).length;
              return el('div', {
                style: {
                  padding: '8px 12px', marginBottom: 12, borderRadius: 10,
                  background: regionsViewed >= 5 ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.10)',
                  border: '1px solid ' + (regionsViewed >= 5 ? 'rgba(34,197,94,0.30)' : 'rgba(168,85,247,0.30)'),
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
                }
              },
                el('span', { style: { fontSize: 14 } }, regionsViewed >= 5 ? '\uD83C\uDFC5' : '\uD83D\uDD0D'),
                el('span', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 600, flex: 1, minWidth: 200 } },
                  regionsViewed >= 5
                    ? 'Justice Witness badge earned. Keep exploring; every region has a different story.'
                    : 'Click a card to expand its data. Explore at least 5 regions to earn the Justice Witness badge.'
                ),
                el('span', { style: { fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: regionsViewed >= 5 ? '#86efac' : '#c4b5fd' } }, regionsViewed + ' / 5 explored')
              );
            })(),

            // View toggle
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } },
              [{ id: 'risk', label: '\u26A0\uFE0F Risks' }, { id: 'emissions', label: '\uD83C\uDFED Emissions' }, { id: 'resilience', label: '\uD83D\uDCAA Resilience' }].map(function(v) {
                return el('button', { key: v.id, onClick: function() { upd('cjView', v.id); },
                  style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: cjView === v.id ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)', background: cjView === v.id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)', color: cjView === v.id ? '#fbbf24' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                  v.label);
              })
            ),

            // Region cards
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              REGIONS.map(function(r) {
                var isOpen = cjRegion === r.id;
                var regionsViewed = d.regionsViewed || {};
                return el('div', { key: r.id, role: 'button', tabIndex: 0, 'aria-expanded': isOpen, 'aria-label': r.name + (isOpen ? ' (expanded)' : ' (collapsed)'), onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }, onClick: function() {
                    upd('cjRegion', isOpen ? null : r.id);
                    playSound('region');
                    if (!regionsViewed[r.id]) {
                      var nv = Object.assign({}, regionsViewed); nv[r.id] = true;
                      upd('regionsViewed', nv);
                      awardXP(5);
                      if (Object.keys(nv).length >= 5) earnBadge('justiceExplorer');
                    }
                  },
                  style: { padding: 14, borderRadius: 12, background: isOpen ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (isOpen ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', transition: 'all 0.2s' } },

                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    el('span', { style: { fontSize: 20 } }, r.emoji),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 800 } }, r.name),
                      el('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Pop: ' + r.pop)
                    ),
                    el('span', { style: { padding: '2px 8px', borderRadius: 12, background: riskColors[r.risk] + '20', color: riskColors[r.risk], fontSize: 11, fontWeight: 800, textTransform: 'uppercase' } }, r.risk + ' risk')
                  ),

                  // Risk vs emissions bar
                  cjView === 'emissions' && el('div', { style: { marginTop: 6 } },
                    el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 } },
                      el('span', null, 'Share of global emissions'), el('span', null, r.emPct + '%')),
                    el('div', { style: { height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      el('div', { style: { width: Math.min(100, r.emPct * 5) + '%', height: '100%', borderRadius: 3, background: '#ef4444' } })
                    )
                  ),

                  cjView === 'risk' && el('div', { style: { marginTop: 6, color: '#94a3b8', fontSize: 10 } }, '\u26A0\uFE0F ' + r.type),

                  cjView === 'resilience' && el('div', { style: { marginTop: 6, color: '#6ee7b7', fontSize: 10 } }, '\uD83D\uDCAA ' + r.resilience),

                  // Expanded detail
                  isOpen && el('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' } },
                    el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.7, marginBottom: 8 } }, r.story),
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' } },
                      el('div', { style: { color: '#4ade80', fontSize: 10, fontWeight: 800 } }, '\uD83D\uDCAA Community Resilience'),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5, marginTop: 2 } }, r.resilience)
                    ),
                    r.emPct < 1 && el('div', { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontSize: 10, textAlign: 'center' } },
                      '\u26A0\uFE0F This community produces just ' + r.emPct + '% of global emissions but faces ' + r.risk + ' risk \u2014 that\'s climate injustice.')
                  )
                );
              })
            ),

            // ═══ HISTORICAL RESPONSIBILITY ═══
            el('div', { style: { marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(251,146,60,0.25)' } },
              el('div', { style: { color: '#fdba74', fontSize: 14, fontWeight: 900, marginBottom: 4 } }, '📊 Historical Responsibility — who put it there?'),
              el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 12, lineHeight: 1.5 } },
                'Cumulative CO\u2082 emissions since 1850. Most CO\u2082 already in the atmosphere was emitted by a handful of countries — yet the countries that emitted least face the worst impacts. This is climate injustice in one chart.'),
              HISTORICAL_EMISSIONS.map(function(h, hi) {
                var maxGt = HISTORICAL_EMISSIONS[0].gt;
                var pct = Math.min(100, (h.gt / maxGt) * 100);
                var barColor = hi === 0 ? '#ef4444' : hi < 3 ? '#f97316' : hi < 7 ? '#fbbf24' : '#60a5fa';
                return el('div', { key: h.country, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  el('span', { style: { width: 22, fontSize: 14 } }, h.emoji),
                  el('span', { style: { width: 120, color: '#cbd5e1', fontSize: 11, fontWeight: 700 } }, h.country),
                  el('div', { style: { flex: 1, height: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', position: 'relative' } },
                    el('div', { style: { width: pct + '%', height: '100%', background: barColor } })
                  ),
                  el('span', { style: { width: 80, textAlign: 'right', color: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' } }, h.gt + ' Gt'),
                  el('span', { style: { width: 48, textAlign: 'right', color: barColor, fontSize: 10, fontWeight: 800, fontFamily: 'monospace' } }, h.pctGlobal.toFixed(1) + '%')
                );
              }),
              el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' } },
                el('div', { style: { color: '#fca5a5', fontSize: 11, fontWeight: 800, marginBottom: 4 } }, '🔑 The climate injustice in numbers'),
                el('div', { style: { color: '#cbd5e1', fontSize: 10, lineHeight: 1.6 } },
                  '• The USA alone (4% of world population) is responsible for ~25% of all historical CO\u2082.',
                  el('br'),
                  '• Europe + USA combined: ~40% of historical emissions from <15% of current population.',
                  el('br'),
                  '• All of Africa (1.4 billion people, ~18% of world): ~3% of historical emissions — but some of the most severe impacts.',
                  el('br'),
                  '• This is why the 2022 COP27 created the "Loss & Damage" fund — high-emitting countries pay into a pool for vulnerable nations.'
                )
              )
            ),

            // ═══ YOUTH CLIMATE LEADERS ═══
            el('div', { style: { marginTop: 20, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(168,85,247,0.25)' } },
              el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                el('span', { style: { fontSize: 20 } }, '✊'),
                el('div', null,
                  el('div', { style: { color: '#c084fc', fontSize: 14, fontWeight: 900 } }, 'Youth Climate Leaders'),
                  el('div', { style: { color: '#94a3b8', fontSize: 10 } }, 'Real young people leading on climate — you are next.')
                )
              ),
              el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 12 } },
                YOUTH_LEADERS.map(function(leader) {
                  return el('div', { key: leader.name, style: { padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.15)' } },
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      el('span', { style: { fontSize: 22 } }, leader.emoji),
                      el('div', null,
                        el('div', { style: { color: '#e2e8f0', fontSize: 12, fontWeight: 900 } }, leader.name),
                        el('div', { style: { color: '#94a3b8', fontSize: 10 } }, leader.country + ' · ' + leader.age)
                      )
                    ),
                    el('p', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.5, marginBottom: 6 } }, leader.what),
                    el('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', color: '#c084fc', fontSize: 10, fontStyle: 'italic', lineHeight: 1.4 } }, leader.quote)
                  );
                })
              ),
              el('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 10, lineHeight: 1.6 } },
                '💡 Every movement needs voices across generations. These are just six — Fridays for Future alone has mobilized students in 170+ countries. You don\'t need to be famous to matter. Local action is where almost every one of these leaders started.')
            ),

            // Discussion prompt
            el('div', { style: { marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' } },
              el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800, marginBottom: 6 } }, '\uD83D\uDDE3\uFE0F Discussion Questions'),
              el('div', { style: { color: '#94a3b8', fontSize: 11, lineHeight: 1.8 } },
                'Is it fair that the communities least responsible for climate change are most affected?\n' +
                'What responsibilities do high-emitting countries have?\n' +
                'How can we support communities building resilience?\n' +
                'Which of the youth leaders above resonates with you — and why?')
            )
          ),

          // ═══ TAB: SOLUTIONS SPOTLIGHT ═══
          tab === 'solutions' && el('div', { style: { maxWidth: 720, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#22c55e', fontSize: 16, fontWeight: 900 } }, '\uD83D\uDCA1 Solutions Spotlight'),
              el('div', { style: { color: '#94a3b8', fontSize: 12 } }, 'Real innovations making a real difference \u2014 and what YOU can do')
            ),

            // ═══ DRAWDOWN SLEUTH (net-new mini-game) ═══
            // 8 rounds. Each shows 4 climate solutions; player picks the biggest-impact
            // one per Drawdown's Plausible Scenario (gigatons CO\u2082 over 2020\u20132050).
            // Forces students past 'obvious' choices (rooftop solar, EVs) to recognize
            // the boring-but-massive ones (refrigerant management, food waste, girls' ed).
            (function() {
              var DS_ROUNDS = [
                { id: 1, ids: ['refrigerants', 'solar_roof', 'evs_personal', 'heat_pumps'], correct: 'refrigerants',
                  why: 'Refrigerant management beats rooftop solar + EVs + heat pumps COMBINED. HFC refrigerants are 1,000\u20139,000\u00d7 more potent than CO\u2082; just *recapturing them properly at end-of-life* is the highest-impact single climate action available. The boring infrastructure solution wins over the visible-tech ones.' },
                { id: 2, ids: ['reduced_waste', 'wind_onshore', 'solar_farms', 'buildings_retrofit'], correct: 'wind_onshore',
                  why: 'Onshore wind (147 GT) beats reduced food waste (88 GT) and crushes solar farms + retrofits. Scaling existing cheap technology massively is currently the largest single lever in the global energy transition.' },
                { id: 3, ids: ['plant_rich', 'tropical_forest', 'cycling_walking', 'efficient_transit'], correct: 'tropical_forest',
                  why: 'Tropical forest restoration (85 GT) edges out plant-rich diets (65 GT). Both crush bike infrastructure (5 GT). Transport solutions are hugely visible in policy debate but smaller than the food + land solutions in absolute terms.' },
                { id: 4, ids: ['girls_education', 'wind_onshore', 'solar_farms', 'buildings_retrofit'], correct: 'wind_onshore',
                  why: 'Girls\' education + family planning is enormous (85 GT in Drawdown\'s combined estimate), but onshore wind at full scale is even bigger (147 GT). Education compounds across generations though \u2014 per-dollar impact is much higher than the absolute GT suggests.' },
                { id: 5, ids: ['silvopasture', 'evs_personal', 'kelp_forests', 'cycling_walking'], correct: 'silvopasture',
                  why: 'Silvopasture (42 GT) \u2014 integrating trees into grazing land \u2014 beats EVs + bike infrastructure + kelp forests combined. Trees + livestock together build soil carbon at 4\u00d7 the rate of bare pasture. A surprisingly large agricultural lever that gets almost no public attention.' },
                { id: 6, ids: ['refrigerants', 'reduced_waste', 'plant_rich', 'tropical_forest'], correct: 'reduced_waste',
                  why: 'Reduced food waste (88 GT) leads this group, edging out tropical forest (85), plant-rich diet (65), and refrigerants (57). One-third of all food grown is wasted; preventing waste avoids both methane from landfills AND the upstream emissions to grow it.' },
                { id: 7, ids: ['solar_farms', 'wind_onshore', 'buildings_retrofit', 'peatlands'], correct: 'wind_onshore',
                  why: 'Onshore wind (147 GT) is the single largest line item in Drawdown \u2014 bigger than utility solar (42), retrofits (33), peatlands (26). Note peatlands punching above their weight: globally they store 3\u00d7 more carbon than forests.' },
                { id: 8, ids: ['heat_pumps', 'evs_personal', 'cycling_walking', 'refrigerants'], correct: 'refrigerants',
                  why: 'Refrigerants (57 GT) beat heat pumps + EVs + bike infrastructure COMBINED (25 GT total). The visible "consumer green tech" solutions are real but small at global scale; HFC management dwarfs them. Kigali Amendment is doing more for climate than most realize.' }
              ];
              var dsIdx = d.dsIdx == null ? -1 : d.dsIdx;
              var dsSeed = d.dsSeed || 1;
              var dsAnswered = !!d.dsAnswered;
              var dsPick = d.dsPick;
              var dsScore = d.dsScore || 0;
              var dsRounds = d.dsRounds || 0;
              var dsStreak = d.dsStreak || 0;
              var dsBest = d.dsBest || 0;
              var dsShown = d.dsShown || [];
              var dsOpen = !!d.dsOpen;
              function getSol(id) { return DRAWDOWN_SOLUTIONS.find(function(x) { return x.id === id; }); }
              function startDs() {
                var pool = [];
                for (var i = 0; i < DS_ROUNDS.length; i++) if (dsShown.indexOf(i) < 0) pool.push(i);
                if (pool.length === 0) { pool = []; for (var j = 0; j < DS_ROUNDS.length; j++) pool.push(j); dsShown = []; }
                var seedNext = ((dsSeed * 16807 + 11) % 2147483647) || 7;
                var pick = pool[seedNext % pool.length];
                upd('dsSeed', seedNext);
                upd('dsIdx', pick);
                upd('dsAnswered', false);
                upd('dsPick', null);
                upd('dsShown', dsShown.concat([pick]));
              }
              function pickDs(solId) {
                if (dsAnswered) return;
                var r = DS_ROUNDS[dsIdx];
                var correct = solId === r.correct;
                var newScore = dsScore + (correct ? 1 : 0);
                var newStreak = correct ? (dsStreak + 1) : 0;
                var newBest = Math.max(dsBest, newStreak);
                upd('dsAnswered', true);
                upd('dsPick', solId);
                upd('dsScore', newScore);
                upd('dsRounds', dsRounds + 1);
                upd('dsStreak', newStreak);
                upd('dsBest', newBest);
              }
              return el('div', { style: { padding: 16, marginBottom: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(15,23,42,0.4))', border: '2px solid rgba(34,197,94,0.30)' } },
                el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 } },
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    el('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, '\uD83D\uDD75\uFE0F'),
                    el('div', null,
                      el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900 } }, 'Drawdown Sleuth'),
                      el('div', { style: { color: '#94a3b8', fontSize: 11, fontStyle: 'italic' } }, 'Pick the biggest-impact climate solution. The "obvious" answer is often wrong.')
                    )
                  ),
                  el('button', {
                    onClick: function() { upd('dsOpen', !dsOpen); },
                    style: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.40)', background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                  }, dsOpen ? 'Hide \u25b4' : 'Play \u2192')
                ),
                dsOpen && (dsIdx < 0
                  ? el('div', { style: { textAlign: 'center', padding: '16px 8px' } },
                      el('p', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, marginBottom: 12 } },
                        '8 rounds. Each shows 4 climate solutions; pick the one with the biggest CO\u2082 reduction (per Project Drawdown\'s Plausible Scenario, gigatons over 2020\u20132050). After picking, a coaching block names what makes the answer surprising.'),
                      el('button', {
                        onClick: startDs,
                        'aria-label': 'Start Drawdown Sleuth',
                        style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#0f172a', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
                      }, '\uD83D\uDD75\uFE0F Start \u2014 round 1 of 8')
                    )
                  : (function() {
                      var r = DS_ROUNDS[dsIdx];
                      var pickedCorrect = dsAnswered && dsPick === r.correct;
                      var pct = dsRounds > 0 ? Math.round((dsScore / dsRounds) * 100) : 0;
                      var allDone = dsShown.length >= DS_ROUNDS.length && dsAnswered;
                      return el('div', null,
                        el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 8 } },
                          el('span', null, 'Round ', el('strong', { style: { color: '#fff' } }, dsShown.length)),
                          el('span', null, 'Score ', el('strong', { style: { color: '#4ade80' } }, dsScore + ' / ' + dsRounds)),
                          dsRounds > 0 && el('span', null, 'Accuracy ', el('strong', { style: { color: '#0ea5e9' } }, pct + '%')),
                          el('span', null, 'Streak ', el('strong', { style: { color: '#fbbf24' } }, dsStreak)),
                          el('span', null, 'Best ', el('strong', { style: { color: '#f59e0b' } }, dsBest))
                        ),
                        el('div', { style: { color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 8 } }, 'Which solution avoids the most CO\u2082 globally (2020\u20132050)?'),
                        el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': 'Pick the biggest-impact solution' },
                          r.ids.map(function(solId) {
                            var sol = getSol(solId);
                            if (!sol) return null;
                            var picked = dsAnswered && dsPick === solId;
                            var isRight = dsAnswered && solId === r.correct;
                            var bg, border, color;
                            if (dsAnswered) {
                              if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#bbf7d0'; }
                              else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = '#ef4444'; color = '#fecaca'; }
                              else { bg = 'rgba(30,41,59,0.5)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
                            } else {
                              bg = 'rgba(30,41,59,0.7)'; border = 'rgba(34,197,94,0.40)'; color = '#e2e8f0';
                            }
                            return el('button', {
                              key: solId, role: 'radio',
                              'aria-checked': picked ? 'true' : 'false',
                              'aria-label': sol.label,
                              disabled: dsAnswered,
                              onClick: function() { pickDs(solId); },
                              style: { padding: '12px 10px', borderRadius: 10, background: bg, color: color, border: '2px solid ' + border, cursor: dsAnswered ? 'default' : 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 700, transition: 'all 0.15s', minHeight: 80 }
                            },
                              el('div', { style: { fontSize: 22, marginBottom: 4 }, 'aria-hidden': 'true' }, sol.emoji),
                              el('div', { style: { fontSize: 12, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 } }, sol.label),
                              dsAnswered && el('div', { style: { fontSize: 11, fontWeight: 800, color: isRight ? '#86efac' : (picked ? '#fca5a5' : '#94a3b8') } }, sol.gt + ' GT CO\u2082')
                            );
                          })
                        ),
                        dsAnswered && el('div', {
                          style: {
                            marginTop: 12, padding: '12px 14px', borderRadius: 10,
                            background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
                            border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)')
                          }
                        },
                          el('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#86efac' : '#fca5a5' } },
                            pickedCorrect
                              ? '\u2705 Correct \u2014 ' + getSol(r.correct).label + ' (' + getSol(r.correct).gt + ' GT)'
                              : '\u274C The biggest is ' + getSol(r.correct).label + ' (' + getSol(r.correct).gt + ' GT)' + (dsPick ? ' (you picked ' + getSol(dsPick).label + ' at ' + getSol(dsPick).gt + ' GT)' : '')
                          ),
                          el('p', { style: { color: '#e2e8f0', fontSize: 12, lineHeight: 1.55, margin: '0 0 10px' } }, r.why),
                          allDone
                            ? el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.45)' } },
                                el('div', { style: { fontSize: 13, fontWeight: 800, color: '#4ade80', marginBottom: 4 } }, '\uD83C\uDFC6 All 8 rounds complete'),
                                el('div', { style: { color: '#e2e8f0', fontSize: 12, lineHeight: 1.5 } },
                                  'Final: ', el('strong', null, dsScore + ' / ' + DS_ROUNDS.length + ' (' + Math.round((dsScore / DS_ROUNDS.length) * 100) + '%)'),
                                  dsScore === DS_ROUNDS.length ? ' \u2014 you can spot the boring-but-massive solutions over the sexy-but-small ones. Project Drawdown\'s mission is exactly that.' :
                                  dsScore >= 6 ? ' \u2014 strong intuition for scale. The most-confused pair is usually onshore wind vs reduced food waste \u2014 both are top-3 globally; the Plausible Scenario number depends on assumed deployment rate.' :
                                  ' \u2014 these intuitions take rebuilding. The consumer-green-tech framing (rooftop solar, EVs, bikes) underplays the boring infrastructure solutions that actually move the needle. Re-read the rationales, then retake.'
                                ),
                                el('button', {
                                  onClick: function() { upd('dsIdx', -1); upd('dsShown', []); upd('dsScore', 0); upd('dsRounds', 0); upd('dsStreak', 0); },
                                  style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#0f172a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                                }, '\uD83D\uDD04 Restart')
                              )
                            : el('button', {
                                onClick: startDs,
                                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#0f172a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                              }, '\u27a1\uFE0F Next round')
                        )
                      );
                    })()
                )
              );
            })(),

            // ═══ SOLUTION STACK BUILDER (Project Drawdown) ═══
            (function() {
              var picked = d.drawdownPicked || {};
              var pickedIds = Object.keys(picked).filter(function(k) { return picked[k]; });
              var totalGt = pickedIds.reduce(function(sum, id) {
                var sol = DRAWDOWN_SOLUTIONS.find(function(s) { return s.id === id; });
                return sum + (sol ? sol.gt : 0);
              }, 0);
              // Global emissions per year ≈ 40 Gt. 1.5°C carbon budget ≈ 250 Gt remaining. 2°C budget ≈ 900 Gt.
              var budget15 = 250;
              var budget20 = 900;
              var pctOf15 = Math.min(100, (totalGt / budget15) * 100);
              function togglePick(id) {
                var next = Object.assign({}, picked);
                next[id] = !next[id];
                upd('drawdownPicked', next);
                playSound('action');
                var count = Object.keys(next).filter(function(k) { return next[k]; }).length;
                if (count >= 5 && !badges.planner) earnBadge('planner');
                var newTotal = Object.keys(next).filter(function(k) { return next[k]; }).reduce(function(sum, id) {
                  var sol = DRAWDOWN_SOLUTIONS.find(function(s) { return s.id === id; });
                  return sum + (sol ? sol.gt : 0);
                }, 0);
                if (newTotal >= 200 && !badges.gigaton) earnBadge('gigaton');
              }
              return el('div', { style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.25)', marginBottom: 20 } },
                el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                  el('div', null,
                    el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900 } }, '🎯 Solution Stack Builder'),
                    el('div', { style: { color: '#94a3b8', fontSize: 10 } }, '🏅 Goal: stack to 200 Gt to earn the Gigaton badge. Select solutions — see combined impact in gigatons of CO\u2082 avoided by 2050 (Project Drawdown data)')
                  ),
                  el('div', { style: { textAlign: 'right' } },
                    el('div', { style: { color: totalGt >= 200 ? '#fbbf24' : '#4ade80', fontSize: 24, fontWeight: 900, fontFamily: 'monospace' } }, Math.round(totalGt) + ' Gt'),
                    el('div', { style: { color: '#94a3b8', fontSize: 9 } }, pickedIds.length + ' solution' + (pickedIds.length === 1 ? '' : 's') + ' selected')
                  )
                ),
                // Budget progress bar
                el('div', { style: { marginBottom: 6 } },
                  el('div', { style: { color: '#94a3b8', fontSize: 10, marginBottom: 2 } },
                    'Your stack = ' + pctOf15.toFixed(0) + '% of the remaining 1.5°C budget (' + budget15 + ' Gt)'),
                  el('div', { style: { height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' } },
                    el('div', { style: { width: pctOf15 + '%', height: '100%', background: pctOf15 >= 100 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : pctOf15 >= 50 ? 'linear-gradient(90deg, #60a5fa, #4ade80)' : '#60a5fa', transition: 'width 0.4s' } })
                  )
                ),
                // Status message
                totalGt > 0 && el('div', { style: { marginBottom: 8, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontSize: 11, lineHeight: 1.5 } },
                  totalGt >= budget15 ? '🎉 Your stack alone would close the 1.5°C gap. In reality, we need all of these PLUS rapid fossil-fuel phase-out.' :
                  totalGt >= 100 ? '✨ Strong stack. With all solutions combined we can still keep warming below 2°C.' :
                  '🌱 Good start. Stack more solutions to cross 100 Gt.'),
                // Solutions grid (checkbox cards)
                el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 } },
                  DRAWDOWN_SOLUTIONS.slice().sort(function(a, b) { return b.gt - a.gt; }).map(function(sol) {
                    var isPicked = !!picked[sol.id];
                    return el('button', { key: sol.id, onClick: function() { togglePick(sol.id); },
                      'aria-pressed': isPicked,
                      'aria-label': (isPicked ? 'Deselect ' : 'Select ') + sol.label + ' — ' + sol.gt + ' gigatons CO2 avoidance potential',
                      title: sol.note,
                      style: { textAlign: 'left', padding: 10, borderRadius: 10, border: '1px solid ' + (isPicked ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'), background: isPicked ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', color: isPicked ? '#e2e8f0' : '#cbd5e1', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' } },
                      el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                        el('span', { style: { fontSize: 18 } }, sol.emoji),
                        el('span', { style: { flex: 1, fontWeight: 700 } }, sol.label),
                        el('span', { style: { padding: '2px 6px', borderRadius: 8, background: isPicked ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)', color: isPicked ? '#4ade80' : '#94a3b8', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' } }, sol.gt + ' Gt')
                      ),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.4 } }, sol.note)
                    );
                  })
                ),
                // Educational footnote
                el('div', { style: { marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(148,163,184,0.06)', color: '#94a3b8', fontSize: 10, lineHeight: 1.5 } },
                  '📚 Project Drawdown (drawdown.org) is a nonprofit research group that ranks climate solutions by their gigaton-scale CO\u2082 avoidance potential from 2020-2050. Gt = gigatons (1 billion tons). Current global emissions: ~40 Gt/year. Remaining budget for 1.5°C: ~250 Gt.')
              );
            })(),

            // Category filter
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' } },
              [{ id: 'all', label: 'All' }, { id: 'energy', label: '\u26A1 Energy' }, { id: 'transport', label: '\uD83D\uDE8C Transport' }, { id: 'nature', label: '\uD83C\uDF33 Nature' }, { id: 'capture', label: '\uD83C\uDFED Capture' }].map(function(c) {
                return el('button', { key: c.id, onClick: function() { upd('ssCategory', c.id); },
                  style: { padding: '6px 14px', borderRadius: 20, border: ssCategory === c.id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', background: ssCategory === c.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', color: ssCategory === c.id ? '#4ade80' : '#94a3b8', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                  c.label);
              })
            ),

            // Solution cards
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              SOLUTIONS.filter(function(s) { return ssCategory === 'all' || s.cat === ssCategory || s.cat === 'all'; }).map(function(s) {
                var isExp = ssExpanded === s.id;
                return el('div', { key: s.id, role: 'button', tabIndex: 0, 'aria-expanded': isExp, 'aria-label': s.title + (isExp ? ' (expanded)' : ' (collapsed)'), onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }, onClick: function() { upd('ssExpanded', isExp ? null : s.id); awardXP(5); playSound('action'); var nsv = Object.assign({}, solutionsViewed); nsv[s.id] = true; upd('solutionsViewed', nsv); if (Object.keys(nsv).length >= 8 && !badges.solutionScholar) earnBadge('solutionScholar'); },
                  style: { padding: 16, borderRadius: 12, background: s.highlight ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(245,158,11,0.08))' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (s.highlight ? 'rgba(34,197,94,0.25)' : isExp ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', transition: 'all 0.2s' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExp ? 10 : 0 } },
                    el('span', { style: { fontSize: 28 } }, s.emoji),
                    el('div', null,
                      el('div', { style: { color: '#e2e8f0', fontSize: 14, fontWeight: 800 } }, s.title),
                      !isExp && el('div', { style: { color: '#94a3b8', fontSize: 10, marginTop: 2 } }, s.what.substring(0, 60) + '...')
                    )
                  ),
                  isExp && el('div', null,
                    el('div', { style: { marginBottom: 8 } },
                      el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 } }, 'What'),
                      el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, s.what)
                    ),
                    el('div', { style: { marginBottom: 8 } },
                      el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 } }, 'Where'),
                      el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, s.where)
                    ),
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' } },
                      el('div', { style: { color: '#4ade80', fontSize: 11, fontWeight: 800 } }, '\uD83D\uDCC8 Impact'),
                      el('div', { style: { color: '#6ee7b7', fontSize: 11, lineHeight: 1.5, marginTop: 2 } }, s.impact)
                    )
                  )
                );
              })
            ),

            // What Can I Do section
            el('div', { style: { marginTop: 20 } },
              el('button', { onClick: function() { upd('ssShowActions', !ssShowActions); playSound('action'); if (!ssShowActions) earnBadge('actionPlanner'); },
                style: { width: '100%', padding: '14px 20px', borderRadius: 12, border: '2px solid rgba(34,197,94,0.3)', background: ssShowActions ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.04)', color: '#4ade80', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' } },
                (ssShowActions ? '\u25BC' : '\u25B6') + ' What Can I Do?'),

              ssShowActions && el('div', { style: { marginTop: 12 } },
                el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 12, textAlign: 'center' } },
                  'Your choices matter AND systemic changes matter even more. Here\'s how to do both:'),
                ACTIONS.map(function(a, ai) {
                  var diffColors = { easy: '#22c55e', medium: '#f59e0b', hard: '#a855f7' };
                  return el('div', { key: ai, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 } },
                    el('span', { style: { fontSize: 20 } }, a.emoji),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { color: '#e2e8f0', fontSize: 12, fontWeight: 700 } }, a.text),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, marginTop: 2 } }, a.impact)
                    ),
                    el('span', { style: { padding: '2px 8px', borderRadius: 10, background: diffColors[a.diff] + '20', color: diffColors[a.diff], fontSize: 11, fontWeight: 700 } }, a.diff)
                  );
                }),
                el('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' } },
                  el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800, marginBottom: 4 } }, '\uD83D\uDCA1 Remember'),
                  el('div', { style: { color: '#94a3b8', fontSize: 11, lineHeight: 1.6 } },
                    'Individual action is powerful AND we need systemic change. Talk to adults, support clean energy, vote for the planet when you\'re old enough. The most impactful thing you can do is inspire others to act.')
                )
              )
            ),

            // Hope footer
            el('div', { style: { marginTop: 20, padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
              el('div', { style: { fontSize: 28, marginBottom: 6 } }, '\uD83C\uDF1F'),
              el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900, marginBottom: 6 } }, 'The Future Is Being Written Right Now'),
              el('div', { style: { color: '#94a3b8', fontSize: 12, lineHeight: 1.7, maxWidth: 500, margin: '0 auto' } },
                'Solar is the cheapest energy in history. Electric vehicles outsell gas cars in many countries. Young people are leading the charge. The solutions exist \u2014 we just need to choose them. Every action, every conversation, every vote counts.')
            )
          )
        )
      );
    }
  });
})();
} // end isRegistered guard