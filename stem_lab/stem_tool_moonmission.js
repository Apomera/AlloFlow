// ═══════════════════════════════════════════
// stem_tool_moonmission.js — Apollo Moon Mission Simulator (standalone CDN module)
// Full mission experience: Launch → Orbit → Transit → Descent → EVA → Return
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('moonMission'))) {

(function() {
  'use strict';

  // WCAG live region
  (function() {
    if (document.getElementById('allo-live-moonmission')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-moonmission';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  window.StemLab.registerTool('moonMission', {
    icon: '\uD83D\uDE80',
    label: 'moonMission',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'complete_mission', label: 'Complete the full Moon mission', icon: '\uD83C\uDF0A', check: function(d) { return (d.missionPhase || 0) >= 10; }, progress: function(d) { return 'Phase ' + ((d.missionPhase || 0) + 1) + '/10'; } },
      { id: 'collect_4_samples', label: 'Collect 4+ lunar rock samples', icon: '\uD83E\uDEA8', check: function(d) { return (d.lunarSamples || []).length >= 4; }, progress: function(d) { return (d.lunarSamples || []).length + '/4 samples'; } },
      { id: 'collect_all_samples', label: 'Collect all 8 sample types', icon: '\uD83D\uDC8E', check: function(d) { return (d.lunarSamples || []).length >= 8; }, progress: function(d) { return (d.lunarSamples || []).length + '/8 samples'; } },
      { id: 'quiz_5_correct', label: 'Answer 5+ space quiz questions correctly', icon: '\uD83C\uDF93', check: function(d) { return (d.quizCorrect || 0) >= 5; }, progress: function(d) { return (d.quizCorrect || 0) + '/5 correct'; } },
      { id: 'land_on_moon', label: 'Successfully land the Lunar Module', icon: '\uD83C\uDF15', check: function(d) { return (d.missionPhase || 0) >= 6; }, progress: function(d) { return (d.missionPhase || 0) >= 6 ? 'Landed!' : 'Not yet'; } },
      { id: 'commander_mode', label: 'Complete on Commander difficulty', icon: '\uD83D\uDE80', check: function(d) { return (d.missionPhase || 0) >= 10 && d.difficulty === 'commander'; }, progress: function(d) { return d.difficulty === 'commander' ? ((d.missionPhase || 0) >= 10 ? 'Done!' : 'In progress') : 'Wrong difficulty'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var callTTS = ctx.callTTS;
      var announceToSR = ctx.announceToSR;
      var gradeLevel = ctx.gradeLevel;

      // ── State Management ──
      var d = (labToolData && labToolData.moonMission) || {};
      function upd(key, val) {
        var patch = {};
        patch[key] = val;
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { moonMission: Object.assign({}, (prev && prev.moonMission) || {}, patch) });
        });
      }

      var phase = d.missionPhase || 0;
      var missionLog = d.missionLog || [];
      var missionXP = d.missionXP || 0;
      var samples = d.lunarSamples || [];

      function log(entry) {
        var newLog = (d.missionLog || []).slice();
        newLog.push({ text: entry, time: new Date().toLocaleTimeString() });
        upd('missionLog', newLog);
      }

      function setPhase(p) {
        upd('missionPhase', p);
        var phaseName = PHASES[p] ? PHASES[p].name : 'Mission Complete';
        if (typeof announceToSR === 'function') announceToSR('Mission phase ' + (p + 1) + ' of 10: ' + phaseName + '. ' + (PHASES[p] ? PHASES[p].desc : 'The mission is complete.'));
      }

      function addXP(amount) {
        upd('missionXP', (d.missionXP || 0) + amount);
        if (typeof awardStemXP === 'function') awardStemXP('moonMission', amount);
      }

      // ── Mission Data ──
      var PHASES = [
        { name: 'Mission Briefing', icon: '\uD83D\uDCCB', desc: 'Review your mission objectives and crew assignment' },
        { name: 'Launch', icon: '\uD83D\uDE80', desc: 'Countdown and liftoff from Kennedy Space Center' },
        { name: 'Earth Orbit', icon: '\uD83C\uDF0D', desc: 'Reach low Earth orbit and prepare for trans-lunar injection' },
        { name: 'Trans-Lunar Coast', icon: '\uD83C\uDF11', desc: '3-day journey to the Moon \u2014 384,400 km' },
        { name: 'Lunar Orbit', icon: '\uD83C\uDF15', desc: 'Enter orbit around the Moon' },
        { name: 'Powered Descent', icon: '\u2B07\uFE0F', desc: 'Pilot the Lunar Module to the surface' },
        { name: 'Moonwalk EVA', icon: '\uD83D\uDC68\u200D\uD83D\uDE80', desc: 'Explore the lunar surface and collect samples' },
        { name: 'Lunar Ascent', icon: '\u2B06\uFE0F', desc: 'Launch from the Moon and rendezvous with Command Module' },
        { name: 'Trans-Earth Coast', icon: '\uD83C\uDF0D', desc: 'Return journey to Earth' },
        { name: 'Re-entry & Splashdown', icon: '\uD83C\uDF0A', desc: 'Survive re-entry and splash down in the Pacific' }
      ];

      var CREW_ROLES = [
        { role: 'Commander (CDR)', name: 'You', desc: 'Pilots the Lunar Module to the surface and leads the EVA', tasks: 'Landing decisions, EVA leadership, sample selection' },
        { role: 'Command Module Pilot (CMP)', name: 'Alex', desc: 'Orbits the Moon alone in the Command Module while CDR and LMP explore', tasks: 'Orbital science, photography, rendezvous navigation' },
        { role: 'Lunar Module Pilot (LMP)', name: 'Jordan', desc: 'Assists with descent and EVA, operates scientific instruments', tasks: 'Systems monitoring, instrument deployment, sample documentation' }
      ];

      var APOLLO_FACTS = [
        'Apollo 11 landed on July 20, 1969. Neil Armstrong and Buzz Aldrin spent 2 hours 31 minutes on the surface.',
        'The Saturn V rocket stood 110.6 meters tall \u2014 taller than the Statue of Liberty.',
        'The Command Module had about the same interior space as a large car.',
        'Apollo astronauts left retroreflectors on the Moon that scientists still bounce lasers off today.',
        'The total Apollo program cost $25.4 billion (about $200 billion in today\'s dollars).',
        'Apollo 13\'s famous "Houston, we\'ve had a problem" was actually said by Jack Swigert, not Tom Hanks.',
        'Moon dust smells like spent gunpowder, according to every astronaut who walked on the Moon.',
        'The American flags on the Moon have been bleached white by decades of unfiltered UV radiation.',
        'The Lunar Module had less computing power than a modern calculator.',
        'Apollo 17\'s Gene Cernan was the last human to walk on the Moon (December 1972).',
        'The astronauts\' bootprints will last millions of years \u2014 there\'s no wind or rain to erode them.',
        'The Moon is moving away from Earth at 3.8 cm per year.'
      ];

      var LUNAR_SAMPLES_DATA = [
        { name: 'Anorthosite', icon: '\u26AA', type: 'Highland Rock', xp: 15, fact: 'This ancient rock from the lunar highlands is 4.4 billion years old \u2014 nearly as old as the Moon itself. It tells us the Moon once had a global magma ocean.' },
        { name: 'Basalt', icon: '\u26AB', type: 'Mare Rock', xp: 10, fact: 'Dark volcanic basalt filled the Moon\'s giant impact basins to create the dark "seas" (maria) visible from Earth. These lavas erupted 3-3.5 billion years ago.' },
        { name: 'Breccia', icon: '\uD83D\uDFE4', type: 'Impact Rock', xp: 12, fact: 'A jumbled mix of rock fragments welded together by meteorite impacts. The Moon\'s surface has been pounded for 4+ billion years.' },
        { name: 'Regolith Core', icon: '\uD83E\uDEA8', type: 'Soil Sample', xp: 8, fact: 'Lunar soil is ground-up rock from billions of years of micrometeorite bombardment. It contains tiny glass beads and even traces of solar wind particles.' },
        { name: 'Orange Soil', icon: '\uD83D\uDFE0', type: 'Volcanic Glass', xp: 20, fact: 'Apollo 17 found orange soil \u2014 tiny glass beads from an ancient volcanic eruption 3.7 billion years ago. This was one of Apollo\'s most exciting discoveries!' },
        { name: 'KREEP Basalt', icon: '\uD83D\uDC8E', type: 'Rare Mineral', xp: 25, fact: 'KREEP stands for Potassium (K), Rare Earth Elements, and Phosphorus. These minerals concentrated in the last dregs of the lunar magma ocean.' },
        { name: 'Impact Glass', icon: '\u2728', type: 'Glass Bead', xp: 10, fact: 'Meteorite impacts melt rock into glass that flies through space and lands as tiny spheres. Some contain trapped gases from the ancient lunar atmosphere.' },
        { name: 'Genesis Rock', icon: '\uD83D\uDCA0', type: 'Primordial', xp: 30, fact: 'Apollo 15 found this 4.1 billion year old anorthosite, one of the oldest rocks ever collected. It helped prove the magma ocean theory of the Moon\'s formation.' }
      ];

      // ── Quiz Questions (shown between key phases) ──
      var QUIZ_BANK = [
        { q: 'How far is the Moon from Earth?', opts: ['38,440 km', '384,400 km', '3,844,000 km', '38,440,000 km'], a: 1, fact: 'The Moon is about 384,400 km away \u2014 light takes 1.3 seconds to travel there!' },
        { q: 'How long does it take to reach the Moon?', opts: ['3 hours', '3 days', '3 weeks', '3 months'], a: 1, fact: 'Apollo missions took about 3 days each way, traveling at ~3,900 km/h.' },
        { q: 'What is the Moon\'s gravity compared to Earth?', opts: ['1/2', '1/4', '1/6', '1/10'], a: 2, fact: 'The Moon\'s gravity is 1/6 of Earth\'s. A 70 kg person weighs only ~12 kg there!' },
        { q: 'What is the temperature on the Moon\'s sunlit side?', opts: ['50\u00B0C', '127\u00B0C', '200\u00B0C', '327\u00B0C'], a: 1, fact: 'The sunlit side reaches 127\u00B0C, while the dark side drops to -173\u00B0C!' },
        { q: 'How many people have walked on the Moon?', opts: ['2', '6', '12', '24'], a: 2, fact: '12 astronauts walked on the Moon across Apollo 11, 12, 14, 15, 16, and 17.' },
        { q: 'What was the first word spoken on the Moon?', opts: ['"Houston"', '"Tranquility"', '"Eagle"', '"That\'s"'], a: 0, fact: 'Buzz Aldrin said "Contact light" first, but Armstrong\'s famous line started with "That\'s."' },
        { q: 'What fuel did the Saturn V first stage use?', opts: ['Hydrogen', 'Kerosene (RP-1)', 'Methane', 'Solid fuel'], a: 1, fact: 'The first stage burned RP-1 kerosene with liquid oxygen \u2014 2,000+ tons of fuel in 2.5 minutes!' },
        { q: 'Why is there no sound on the Moon?', opts: ['Too cold', 'No atmosphere', 'Too much gravity', 'Solar radiation'], a: 1, fact: 'Sound needs a medium (air/water) to travel. The Moon has no atmosphere, so it\'s perfectly silent.' },
        { q: 'What does the Moon smell like?', opts: ['Nothing', 'Spent gunpowder', 'Sulfur', 'Roses'], a: 1, fact: 'Every Apollo astronaut reported that Moon dust smells like spent gunpowder when brought inside the LM!' },
        { q: 'How old are the oldest Moon rocks collected?', opts: ['1 billion years', '2.5 billion years', '4.4 billion years', '6 billion years'], a: 2, fact: 'The oldest Moon rocks are 4.4 billion years old \u2014 nearly as old as the solar system itself!' }
      ];

      // ── Difficulty Settings ──
      var DIFFICULTIES = {
        tourist:    { label: 'Tourist',    icon: '\uD83C\uDF1F', desc: 'Guided experience \u2014 auto-landing, extended O\u2082', gravity: 0.5, fuel: 150, o2Rate: 0.1 },
        pilot:     { label: 'Pilot',      icon: '\u2B50', desc: 'Standard Apollo parameters', gravity: 1.62, fuel: 100, o2Rate: 0.3 },
        commander: { label: 'Commander',  icon: '\uD83C\uDFC5', desc: 'Realistic \u2014 tight fuel budget, faster O\u2082 drain', gravity: 1.62, fuel: 70, o2Rate: 0.6 }
      };
      var difficulty = d.difficulty || 'pilot';
      var diffSettings = DIFFICULTIES[difficulty];

      // ── Achievement Badges ──
      var BADGES = [
        { id: 'first_step', name: 'One Small Step', icon: '\uD83D\uDC63', desc: 'Complete your first EVA moonwalk', check: function() { return phase >= 7; } },
        { id: 'geologist', name: 'Lunar Geologist', icon: '\uD83E\uDEA8', desc: 'Collect 4+ rock samples', check: function() { return (d.lunarSamples || []).length >= 4; } },
        { id: 'collector', name: 'Sample Return', icon: '\uD83D\uDCE6', desc: 'Collect all 8 sample types', check: function() { return (d.lunarSamples || []).length >= 8; } },
        { id: 'mission_complete', name: 'Splashdown!', icon: '\uD83C\uDF0A', desc: 'Complete the full mission', check: function() { return phase >= 10; } },
        { id: 'quiz_master', name: 'Space Scholar', icon: '\uD83C\uDF93', desc: 'Answer 5+ quiz questions correctly', check: function() { return (d.quizCorrect || 0) >= 5; } },
        { id: 'commander_diff', name: 'Right Stuff', icon: '\uD83D\uDE80', desc: 'Complete mission on Commander difficulty', check: function() { return phase >= 10 && difficulty === 'commander'; } }
      ];
      var earnedBadges = d.earnedBadges || {};
      function checkBadges() {
        BADGES.forEach(function(b) {
          if (!earnedBadges[b.id] && b.check()) {
            earnedBadges[b.id] = true;
            upd('earnedBadges', Object.assign({}, earnedBadges));
            if (addToast) addToast('\uD83C\uDFC5 Badge Earned: ' + b.name + ' \u2014 ' + b.desc, 'success');
            addXP(20);
          }
        });
      }

      // Check badges whenever phase changes
      checkBadges();

      // ── Quiz State ──
      var showQuiz = d.showQuiz || false;
      var quizIdx = d.quizIdx || 0;
      var quizCorrect = d.quizCorrect || 0;
      var quizAnswered = d.quizAnswered || false;
      var quizSelectedAnswer = d.quizSelectedAnswer || -1;

      // ── Mission Timer ──
      var missionStartTime = d.missionStartTime || 0;
      function getMissionElapsed() {
        if (!missionStartTime) return '00:00:00';
        var elapsed = Math.floor((Date.now() - missionStartTime) / 1000);
        var hh = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        var mm = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        var ss = (elapsed % 60).toString().padStart(2, '0');
        return hh + ':' + mm + ':' + ss;
      }

      // ═══════════════════════════════════
      // RENDER
      // ═══════════════════════════════════

      return h('div', { className: 'max-w-2xl mx-auto px-1', role: 'main', 'aria-label': 'Apollo Moon Mission Simulator - Phase ' + (phase + 1) + ': ' + (PHASES[phase] ? PHASES[phase].name : 'Mission Complete') },

        // Header
        h('div', { className: 'flex items-center justify-between mb-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1 rounded-lg hover:bg-slate-100 transition-colors', 'aria-label': 'Back to STEM Lab' },
              h(ArrowLeft, { size: 18 })
            ),
            h('div', null,
              h('h3', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' }, '\uD83D\uDE80 Apollo Moon Mission'),
              h('p', { className: 'text-[10px] text-slate-500 -mt-0.5' }, 'Full mission simulation \u2022 Launch to splashdown')
            )
          ),
          h('div', { className: 'text-right' },
            h('div', { className: 'text-[10px] text-slate-400 font-mono' }, 'MET ' + getMissionElapsed()),
            h('div', { className: 'text-[10px] text-indigo-500 font-bold' }, '\u2B50 ' + missionXP + ' XP')
          )
        ),

        // ── Quiz overlay (shown between key phases) ──
        showQuiz && quizIdx < QUIZ_BANK.length && h('div', { className: 'mb-3 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl p-4 border border-indigo-800', role: 'region', 'aria-label': 'Space knowledge quiz question ' + (quizIdx + 1) },
          h('div', { className: 'flex items-center gap-2 mb-3' },
            h('span', { className: 'text-xl' }, '\uD83E\uDDE0'),
            h('div', null,
              h('h5', { className: 'text-sm font-bold text-indigo-300' }, 'Space Knowledge Check'),
              h('p', { className: 'text-[9px] text-slate-500' }, 'Question ' + (quizIdx + 1) + '/' + QUIZ_BANK.length + ' \u2022 ' + quizCorrect + ' correct so far')
            )
          ),
          h('p', { className: 'text-xs text-white font-bold mb-3' }, QUIZ_BANK[quizIdx].q),
          h('div', { className: 'space-y-1.5 mb-3' },
            QUIZ_BANK[quizIdx].opts.map(function(opt, oi) {
              var isCorrect = oi === QUIZ_BANK[quizIdx].a;
              var isSelected = quizSelectedAnswer === oi;
              var showResult = quizAnswered;
              return h('button', {
                key: oi,
                disabled: quizAnswered,
                'aria-label': 'Answer option ' + (oi + 1) + ': ' + opt + (showResult && isCorrect ? ', correct answer' : showResult && isSelected ? ', incorrect' : ''),
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                onClick: function() {
                  upd('quizAnswered', true);
                  upd('quizSelectedAnswer', oi);
                  if (oi === QUIZ_BANK[quizIdx].a) {
                    upd('quizCorrect', quizCorrect + 1);
                    addXP(10);
                    if (addToast) addToast('\u2705 Correct! +10 XP', 'success');
                    if (typeof announceToSR === 'function') announceToSR('Correct! ' + QUIZ_BANK[quizIdx].fact);
                  } else {
                    if (addToast) addToast('\u274C Not quite \u2014 the answer is: ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a], 'info');
                    if (typeof announceToSR === 'function') announceToSR('Incorrect. The correct answer is ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a] + '. ' + QUIZ_BANK[quizIdx].fact);
                  }
                },
                className: 'w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all border ' +
                  (showResult && isCorrect ? 'bg-green-600/20 border-green-500 text-green-300' :
                   showResult && isSelected && !isCorrect ? 'bg-red-600/20 border-red-500 text-red-300' :
                   'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/10')
              }, (showResult && isCorrect ? '\u2705 ' : showResult && isSelected ? '\u274C ' : '') + opt);
            })
          ),
          quizAnswered && h('div', { className: 'bg-sky-500/10 rounded-lg p-2 border border-sky-500/20 mb-3' },
            h('p', { className: 'text-[10px] text-sky-300' }, '\uD83D\uDCA1 ' + QUIZ_BANK[quizIdx].fact)
          ),
          quizAnswered && h('button', {
            onClick: function() {
              var nextIdx = quizIdx + 1;
              upd('quizIdx', nextIdx);
              upd('quizAnswered', false);
              upd('quizSelectedAnswer', -1);
              if (nextIdx >= QUIZ_BANK.length || nextIdx % 2 === 0) {
                upd('showQuiz', false);
              }
            },
            className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
          }, quizIdx + 1 < QUIZ_BANK.length ? '\u27A1\uFE0F Next Question' : '\u2705 Continue Mission')
        ),

        // Phase progress bar
        h('div', { className: 'mb-3', role: 'progressbar', 'aria-valuenow': phase + 1, 'aria-valuemin': 1, 'aria-valuemax': 10, 'aria-label': 'Mission progress: phase ' + (phase + 1) + ' of 10, ' + (PHASES[phase] ? PHASES[phase].name : 'Complete') },
          h('div', { className: 'flex gap-0.5 mb-1' },
            PHASES.map(function(p, i) {
              var status = i < phase ? 'completed' : i === phase ? 'active' : 'pending';
              return h('div', {
                key: i,
                className: 'flex-1 h-1.5 rounded-full transition-all ' +
                  (status === 'completed' ? 'bg-green-400' : status === 'active' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-200'),
                title: p.name
              });
            })
          ),
          h('div', { className: 'flex justify-between text-[9px] text-slate-400' },
            h('span', null, 'Launch'),
            h('span', null, 'Phase ' + (phase + 1) + '/10'),
            h('span', null, 'Splashdown')
          )
        ),

        // ═══ PHASE 0: MISSION BRIEFING ═══
        phase === 0 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF15'),
              h('h4', { className: 'text-lg font-black tracking-wide' }, 'MISSION BRIEFING'),
              h('p', { className: 'text-xs text-slate-400' }, 'Apollo-style lunar landing mission')
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 mb-3 border border-white/10' },
              h('p', { className: 'text-[10px] text-slate-400 font-bold mb-1' }, '\uD83C\uDFAF MISSION OBJECTIVES'),
              h('div', { className: 'space-y-1' },
                [
                  'Launch from Kennedy Space Center aboard Saturn V',
                  'Enter lunar orbit and descend to the surface',
                  'Conduct EVA: collect geological samples, deploy instruments',
                  'Return safely to Earth with lunar samples'
                ].map(function(obj, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-300' },
                    h('span', { className: 'text-green-400 mt-0.5' }, '\u25CB'),
                    h('span', null, obj)
                  );
                })
              )
            ),
            h('div', { className: 'mb-3' },
              h('p', { className: 'text-[10px] text-slate-400 font-bold mb-2' }, '\uD83D\uDC68\u200D\uD83D\uDE80 YOUR CREW'),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                CREW_ROLES.map(function(crew, i) {
                  return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2 border border-white/10 text-center' },
                    h('div', { className: 'text-lg mb-0.5' }, i === 0 ? '\uD83E\uDDD1\u200D\uD83D\uDE80' : i === 1 ? '\uD83D\uDC68\u200D\uD83D\uDE80' : '\uD83D\uDC69\u200D\uD83D\uDE80'),
                    h('p', { className: 'text-[10px] font-bold text-indigo-300' }, crew.role),
                    h('p', { className: 'text-[9px] text-slate-400' }, crew.name),
                    h('p', { className: 'text-[9px] text-slate-400 mt-1' }, crew.tasks)
                  );
                })
              )
            ),
            // Difficulty selector
            h('div', { className: 'mb-3', role: 'radiogroup', 'aria-label': 'Mission difficulty selection' },
              h('p', { className: 'text-[10px] text-slate-400 font-bold mb-2', id: 'difficulty-label' }, '\uD83C\uDFAE MISSION DIFFICULTY'),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                Object.keys(DIFFICULTIES).map(function(key) {
                  var diff = DIFFICULTIES[key];
                  var isSelected = difficulty === key;
                  return h('button', {
                    key: key,
                    role: 'radio',
                    'aria-checked': isSelected ? 'true' : 'false',
                    'aria-label': diff.label + ' difficulty: ' + diff.desc,
                    onClick: function() { upd('difficulty', key); },
                    className: 'rounded-lg p-2 border text-center transition-all ' +
                      (isSelected ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-400' : 'bg-white/5 border-white/10 hover:border-indigo-400/40')
                  },
                    h('div', { className: 'text-lg' }, diff.icon),
                    h('p', { className: 'text-[10px] font-bold ' + (isSelected ? 'text-indigo-300' : 'text-slate-300') }, diff.label),
                    h('p', { className: 'text-[9px] text-slate-400' }, diff.desc)
                  );
                })
              )
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mb-3' },
              h('p', { className: 'text-[10px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            )
          ),
          h('button', {
            'aria-label': 'Begin Moon mission. Proceed to launch phase. Difficulty: ' + DIFFICULTIES[difficulty].label,
            onClick: function() {
              setPhase(1);
              upd('missionStartTime', Date.now());
              log('\uD83D\uDCCB Mission briefing complete (' + DIFFICULTIES[difficulty].label + ' difficulty)');
              addXP(10);
              if (addToast) addToast('\uD83D\uDE80 Mission authorized! Difficulty: ' + DIFFICULTIES[difficulty].label, 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all hover:scale-[1.01]'
          }, '\uD83D\uDE80 Begin Mission \u2014 Proceed to Launch')
        ),

        // ═══ PHASE 1: LAUNCH ═══
        phase === 1 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // Launch canvas
            h('div', { className: 'relative', style: { height: '400px' } },
              h('canvas', {
                'data-launch-canvas': 'true',
                role: 'img',
                'aria-label': 'Animated Saturn V rocket launch sequence. 5-second countdown followed by ascent through atmosphere to orbit. Shows altitude, velocity, G-force, and stage separations.',
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._launchInit) return;
                  cvEl._launchInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 400;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);
                  var tick = 0;
                  var countdown = 300; // 5 seconds at 60fps
                  var launched = false;
                  var altitude = 0;
                  var velocity = 0;
                  var gForce = 1;
                  var stage = 1;
                  var maxAlt = 0;
                  var shakeIntensity = 0;

                  function drawLaunch() {
                    tick++;
                    ctx.clearRect(0, 0, W, H);

                    // Countdown phase
                    if (countdown > 0) {
                      countdown--;
                      // Background: launch pad
                      var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
                      skyGrad.addColorStop(0, '#1a3a6a');
                      skyGrad.addColorStop(0.6, '#3a7aaa');
                      skyGrad.addColorStop(1, '#5aaa5a');
                      ctx.fillStyle = skyGrad;
                      ctx.fillRect(0, 0, W, H);
                      // Launch tower
                      ctx.fillStyle = '#888888';
                      ctx.fillRect(W * 0.48, H * 0.2, 8, H * 0.6);
                      ctx.fillRect(W * 0.42, H * 0.25, W * 0.16, 4);
                      ctx.fillRect(W * 0.42, H * 0.45, W * 0.16, 4);
                      // Rocket on pad
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillRect(W * 0.47, H * 0.35, W * 0.06, H * 0.45);
                      // Nose cone
                      ctx.fillStyle = '#f0f0f0';
                      ctx.beginPath();
                      ctx.moveTo(W * 0.47, H * 0.35);
                      ctx.lineTo(W * 0.5, H * 0.25);
                      ctx.lineTo(W * 0.53, H * 0.35);
                      ctx.fill();
                      // Countdown text
                      var countSec = Math.ceil(countdown / 60);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 48px monospace';
                      ctx.textAlign = 'center';
                      ctx.globalAlpha = 0.8 + Math.sin(tick * 0.1) * 0.2;
                      ctx.fillText(countSec > 0 ? 'T-' + countSec : 'LIFTOFF!', W * 0.5, H * 0.15);
                      ctx.globalAlpha = 1;
                      ctx.font = '12px system-ui';
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Kennedy Space Center, Florida', W * 0.5, H * 0.95);
                      if (countdown <= 0) { launched = true; shakeIntensity = 8; }
                    }

                    // Flight phase
                    if (launched) {
                      velocity += 0.15 + (stage === 2 ? 0.1 : 0) + (stage === 3 ? 0.05 : 0);
                      altitude += velocity * 0.5;
                      gForce = 1 + velocity * 0.08;
                      if (altitude > 2000 && stage === 1) { stage = 2; shakeIntensity = 6; }
                      if (altitude > 8000 && stage === 2) { stage = 3; shakeIntensity = 4; }
                      maxAlt = Math.max(maxAlt, altitude);
                      shakeIntensity *= 0.995;

                      // Camera shake
                      var sx = (Math.random() - 0.5) * shakeIntensity;
                      var sy = (Math.random() - 0.5) * shakeIntensity;
                      ctx.save();
                      ctx.translate(sx, sy);

                      // Sky transitions with altitude
                      var skyPct = Math.min(1, altitude / 15000);
                      var skyGrad2 = ctx.createLinearGradient(0, 0, 0, H);
                      if (skyPct < 0.3) {
                        skyGrad2.addColorStop(0, '#1a3a6a');
                        skyGrad2.addColorStop(1, '#5a9aca');
                      } else if (skyPct < 0.6) {
                        skyGrad2.addColorStop(0, '#0a1a3a');
                        skyGrad2.addColorStop(1, '#2a5a8a');
                      } else {
                        skyGrad2.addColorStop(0, '#000010');
                        skyGrad2.addColorStop(0.5, '#050520');
                        skyGrad2.addColorStop(1, '#0a1030');
                      }
                      ctx.fillStyle = skyGrad2;
                      ctx.fillRect(0, 0, W, H);

                      // Stars appear as we go higher
                      if (skyPct > 0.4) {
                        ctx.globalAlpha = (skyPct - 0.4) * 1.5;
                        for (var si = 0; si < 80; si++) {
                          ctx.fillStyle = '#ffffff';
                          ctx.beginPath();
                          ctx.arc((si * 137 + 29) % W, (si * 211 + 17) % H, si % 3 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
                          ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                      }

                      // Earth horizon curves away
                      if (skyPct > 0.2) {
                        var earthR = W * 3 * (1 - skyPct * 0.3);
                        var earthY = H + earthR * (0.3 + skyPct * 0.5);
                        var earthGrad = ctx.createRadialGradient(W * 0.5, earthY, earthR * 0.95, W * 0.5, earthY, earthR);
                        earthGrad.addColorStop(0, '#2a6a3a');
                        earthGrad.addColorStop(0.7, '#3a7aca');
                        earthGrad.addColorStop(0.9, '#88ccff');
                        earthGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = earthGrad;
                        ctx.beginPath();
                        ctx.arc(W * 0.5, earthY, earthR, 0, Math.PI * 2);
                        ctx.fill();
                      }

                      // Rocket (always center-screen)
                      var rocketX = W * 0.5, rocketY = H * 0.55;
                      var rocketH = 40;
                      // Body
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillRect(rocketX - 8, rocketY - rocketH / 2, 16, rocketH);
                      // Nose cone
                      ctx.fillStyle = '#f0f0f0';
                      ctx.beginPath();
                      ctx.moveTo(rocketX - 8, rocketY - rocketH / 2);
                      ctx.lineTo(rocketX, rocketY - rocketH / 2 - 15);
                      ctx.lineTo(rocketX + 8, rocketY - rocketH / 2);
                      ctx.fill();
                      // Engine flame
                      var flameLen = 20 + Math.random() * 15 + velocity * 0.8;
                      var flameGrad = ctx.createLinearGradient(rocketX, rocketY + rocketH / 2, rocketX, rocketY + rocketH / 2 + flameLen);
                      flameGrad.addColorStop(0, '#ffffff');
                      flameGrad.addColorStop(0.2, '#ffd700');
                      flameGrad.addColorStop(0.5, '#ff6600');
                      flameGrad.addColorStop(1, 'rgba(255,0,0,0)');
                      ctx.fillStyle = flameGrad;
                      ctx.beginPath();
                      ctx.moveTo(rocketX - 6, rocketY + rocketH / 2);
                      ctx.lineTo(rocketX, rocketY + rocketH / 2 + flameLen);
                      ctx.lineTo(rocketX + 6, rocketY + rocketH / 2);
                      ctx.fill();
                      // Smoke trail (lower altitudes only)
                      if (skyPct < 0.5) {
                        ctx.globalAlpha = 0.15 * (1 - skyPct * 2);
                        ctx.fillStyle = '#cccccc';
                        for (var smi = 0; smi < 8; smi++) {
                          ctx.beginPath();
                          ctx.arc(rocketX + (Math.random() - 0.5) * 8, rocketY + rocketH / 2 + flameLen + smi * 12, 5 + smi * 3, 0, Math.PI * 2);
                          ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                      }

                      ctx.restore(); // end shake

                      // HUD overlay
                      ctx.fillStyle = 'rgba(0,0,0,0.5)';
                      ctx.fillRect(8, 8, 150, 90);
                      ctx.fillRect(W - 158, 8, 150, 70);
                      ctx.font = 'bold 10px monospace';
                      ctx.textAlign = 'left';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('ALTITUDE', 14, 22);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 16px monospace';
                      ctx.fillText(altitude > 1000 ? (altitude / 1000).toFixed(1) + ' km' : Math.round(altitude) + ' m', 14, 40);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('VELOCITY', 14, 56);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = '13px monospace';
                      ctx.fillText((velocity * 100).toFixed(0) + ' m/s', 14, 70);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('STAGE ' + stage + '/3', 14, 88);

                      // G-force meter (right side)
                      ctx.textAlign = 'right';
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('G-FORCE', W - 14, 22);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.font = 'bold 20px monospace';
                      ctx.fillText(gForce.toFixed(1) + 'g', W - 14, 44);
                      // G bar
                      ctx.fillStyle = '#1e293b';
                      ctx.fillRect(W - 148, 52, 130, 8);
                      var gPct = Math.min(1, gForce / 6);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.fillRect(W - 148, 52, 130 * gPct, 8);

                      // Stage separation notification
                      if ((altitude > 1990 && altitude < 2100) || (altitude > 7900 && altitude < 8100)) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 14px system-ui';
                        ctx.fillText('\u26A0 STAGE ' + (stage - 1) + ' SEPARATION', W * 0.5, H * 0.3);
                      }

                      // Phase complete — reached orbit
                      if (altitude > 20000) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#22c55e';
                        ctx.font = 'bold 18px system-ui';
                        ctx.fillText('\u2705 ORBIT ACHIEVED', W * 0.5, H * 0.2);
                        ctx.font = '11px system-ui';
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillText('Click "Proceed" to continue to Earth orbit phase', W * 0.5, H * 0.26);
                      }
                    }

                    requestAnimationFrame(drawLaunch);
                  }
                  drawLaunch();
                }
              })
            ),
            // Launch controls
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'flex items-center justify-between' },
                h('div', null,
                  h('p', { className: 'text-xs text-slate-400' }, '\uD83D\uDE80 Saturn V \u2022 3 stages \u2022 7.5 million lbs thrust'),
                  h('p', { className: 'text-[9px] text-slate-500' }, 'Watch the countdown and ascent through Earth\'s atmosphere')
                ),
                h('button', {
                  'aria-label': 'Proceed to Earth orbit phase after successful launch',
                  onClick: function() {
                    setPhase(2);
                    log('\uD83D\uDE80 Launch successful! Reached Earth orbit.');
                    addXP(20);
                    if (addToast) addToast('\uD83C\uDF0D Orbit achieved! Preparing trans-lunar injection.', 'success');
                  },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors'
                }, '\u2705 Proceed to Orbit')
              )
            )
          )
        ),

        // ═══ PHASE 2: EARTH ORBIT ═══
        phase === 2 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, 'Low Earth Orbit'),
              h('p', { className: 'text-[10px] text-slate-400' }, 'Altitude: 185 km \u2022 Speed: 28,000 km/h \u2022 1.5 orbits before TLI burn')
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              h('p', { className: 'text-[10px] text-sky-300 font-bold mb-1' }, '\uD83D\uDE80 TRANS-LUNAR INJECTION (TLI)'),
              h('p', { className: 'text-[10px] text-slate-300 leading-relaxed' },
                'The S-IVB third stage will fire for 5 minutes 47 seconds to accelerate from 28,000 km/h to 38,900 km/h \u2014 escape velocity. This single burn sends you on a trajectory to the Moon, 384,400 km away.'),
              h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
                [
                  ['\u0394v Required', '3.13 km/s'],
                  ['Burn Duration', '5m 47s'],
                  ['Coast Time', '~3 days']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-white/5 rounded p-1.5 text-center' },
                    h('p', { className: 'text-[9px] text-slate-400' }, item[0]),
                    h('p', { className: 'text-[11px] font-bold text-sky-300' }, item[1])
                  );
                })
              )
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[10px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            )
          ),
          h('button', {
            'aria-label': 'Execute trans-lunar injection burn to begin 3-day journey to the Moon',
            onClick: function() {
              setPhase(3);
              upd('showQuiz', true); // Trigger quiz during coast
              log('\uD83D\uDE80 TLI burn complete! En route to the Moon.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF11 Trans-lunar injection successful! Time for a space knowledge check.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
          }, '\uD83D\uDE80 Execute TLI Burn \u2014 Head to the Moon')
        ),

        // ═══ PHASE 3: TRANS-LUNAR COAST (Animated Canvas) ═══
        phase === 3 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '280px' } },
              h('canvas', {
                role: 'img',
                'aria-label': 'Animated trans-lunar coast. Earth shrinks on the left, Moon grows on the right as the spacecraft travels 384,400 kilometers over 3 days. Shows distance counter and mission communications.',
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._transitInit) return;
                  cvEl._transitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H3 = cvEl.offsetHeight || 280;
                  cvEl.width = W * 2; cvEl.height = H3 * 2; ctx.scale(2, 2);
                  var tick = 0;
                  function drawTransit() {
                    tick++;
                    ctx.clearRect(0, 0, W, H3);
                    // Space background
                    ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H3);
                    // Stars
                    for (var si = 0; si < 100; si++) {
                      ctx.globalAlpha = 0.2 + Math.sin(tick * 0.01 + si * 1.3) * 0.2;
                      ctx.fillStyle = '#fff';
                      ctx.beginPath();
                      ctx.arc((si * 137 + 29) % W, (si * 211 + 17) % H3, si % 5 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
                      ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                    // Journey progress (0 to 1 over time)
                    var progress = Math.min(0.95, tick * 0.0005);
                    // Earth (left side, shrinks as we move away)
                    var earthR = 25 * (1 - progress * 0.6);
                    var earthX = 50 + progress * 10;
                    var earthGrad = ctx.createRadialGradient(earthX, H3 * 0.5, 0, earthX, H3 * 0.5, earthR);
                    earthGrad.addColorStop(0, '#3b82f6');
                    earthGrad.addColorStop(0.6, '#2563eb');
                    earthGrad.addColorStop(1, '#1e40af');
                    ctx.fillStyle = earthGrad;
                    ctx.beginPath(); ctx.arc(earthX, H3 * 0.5, earthR, 0, Math.PI * 2); ctx.fill();
                    // Earth atmosphere glow
                    ctx.globalAlpha = 0.2;
                    var earthGlow = ctx.createRadialGradient(earthX, H3 * 0.5, earthR, earthX, H3 * 0.5, earthR * 1.4);
                    earthGlow.addColorStop(0, '#60a5fa'); earthGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = earthGlow;
                    ctx.beginPath(); ctx.arc(earthX, H3 * 0.5, earthR * 1.4, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                    // Moon (right side, grows as we approach)
                    var moonR = 8 + progress * 30;
                    var moonX = W - 50 - (1 - progress) * 10;
                    ctx.fillStyle = '#d1d5db';
                    ctx.beginPath(); ctx.arc(moonX, H3 * 0.5, moonR, 0, Math.PI * 2); ctx.fill();
                    // Moon craters
                    ctx.fillStyle = 'rgba(0,0,0,0.08)';
                    for (var mc = 0; mc < 5; mc++) {
                      var mcx = moonX + (mc * 7 - 14) * (moonR / 30);
                      var mcy = H3 * 0.5 + (mc * 5 - 10) * (moonR / 30);
                      ctx.beginPath(); ctx.arc(mcx, mcy, 2 + mc * (moonR / 30), 0, Math.PI * 2); ctx.fill();
                    }
                    // Spacecraft (moving dot with trail)
                    var scX = earthX + 30 + (moonX - earthX - 60) * progress;
                    var scY = H3 * 0.5 + Math.sin(tick * 0.008) * 5;
                    // Trail
                    ctx.strokeStyle = 'rgba(56,189,248,0.15)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.moveTo(earthX + 30, H3 * 0.5); ctx.lineTo(scX, scY); ctx.stroke();
                    ctx.setLineDash([]);
                    // Spacecraft dot
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(scX, scY, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(56,189,248,0.4)';
                    ctx.beginPath(); ctx.arc(scX, scY, 5, 0, Math.PI * 2); ctx.fill();
                    // Distance readout
                    var distFromEarth = Math.round(progress * 384400);
                    var distToMoon = 384400 - distFromEarth;
                    ctx.font = '9px monospace'; ctx.textAlign = 'center';
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillText(distFromEarth.toLocaleString() + ' km from Earth', scX, scY - 12);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(distToMoon.toLocaleString() + ' km to Moon', scX, scY + 18);
                    // Comms chatter
                    var commsMessages = [
                      'Houston: "You are GO for TLI."',
                      'CMP: "Transposition and docking complete."',
                      'CDR: "The Earth is getting smaller every hour."',
                      'LMP: "Mid-course correction burn nominal."',
                      'Houston: "Apollo, you are GO for LOI."',
                      'CDR: "We can see the Moon growing. Incredible."'
                    ];
                    var commsIdx = Math.floor(tick / 300) % commsMessages.length;
                    var commsFade = Math.min(1, (tick % 300) < 240 ? (tick % 300) / 30 : (300 - tick % 300) / 60);
                    ctx.globalAlpha = commsFade * 0.7;
                    ctx.font = 'italic 10px system-ui';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(commsMessages[commsIdx], W * 0.5, H3 - 12);
                    ctx.globalAlpha = 1;
                    requestAnimationFrame(drawTransit);
                  }
                  drawTransit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'space-y-1.5 mb-2' },
                [
                  'The Command Module extracts the Lunar Module from the S-IVB third stage.',
                  'The spacecraft rotates slowly ("BBQ roll") to evenly distribute solar heating.',
                  'Even a 1\u00B0 trajectory error would miss the Moon by thousands of kilometers.'
                ].map(function(fact, i) {
                  return h('p', { key: i, className: 'text-[9px] text-slate-400' }, '\u2022 ' + fact);
                })
              ),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20 mb-2' },
                h('p', { className: 'text-[9px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
              )
            )
          ),
          h('button', {
            'aria-label': 'Arrive at the Moon and enter lunar orbit at 110 kilometer altitude',
            onClick: function() {
              setPhase(4);
              log('\uD83C\uDF15 Approaching the Moon. Preparing for lunar orbit insertion.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF15 The Moon fills the window! Preparing LOI burn.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg'
          }, '\uD83C\uDF15 Arrive at the Moon \u2014 Enter Lunar Orbit')
        ),

        // ═══ PHASE 4: LUNAR ORBIT (Animated Canvas) ═══
        phase === 4 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '240px' } },
              h('canvas', {
                role: 'img',
                'aria-label': 'Animated view of spacecraft orbiting the Moon at 110 kilometer altitude. Shows the Moon surface with craters, Sea of Tranquility landing site marked in green, and the spacecraft dot orbiting.',
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._orbitInit) return;
                  cvEl._orbitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HO = cvEl.offsetHeight || 240;
                  cvEl.width = W * 2; cvEl.height = HO * 2; ctx.scale(2, 2);
                  var tick = 0;
                  function drawOrbit() {
                    tick++;
                    ctx.clearRect(0, 0, W, HO);
                    ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, HO);
                    // Stars
                    for (var si = 0; si < 60; si++) {
                      ctx.globalAlpha = 0.2 + Math.sin(tick * 0.01 + si) * 0.15;
                      ctx.fillStyle = '#fff';
                      ctx.beginPath(); ctx.arc((si * 97 + 13) % W, (si * 61 + 7) % HO, 0.6, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                    // Moon (large, fills most of the view)
                    var moonCx = W * 0.5, moonCy = HO * 0.55;
                    var moonR = Math.min(W, HO) * 0.38;
                    var moonGrad = ctx.createRadialGradient(moonCx - moonR * 0.2, moonCy - moonR * 0.2, 0, moonCx, moonCy, moonR);
                    moonGrad.addColorStop(0, '#e5e7eb'); moonGrad.addColorStop(0.7, '#9ca3af'); moonGrad.addColorStop(1, '#6b7280');
                    ctx.fillStyle = moonGrad;
                    ctx.beginPath(); ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2); ctx.fill();
                    // Craters on Moon
                    ctx.save(); ctx.beginPath(); ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2); ctx.clip();
                    ctx.fillStyle = 'rgba(0,0,0,0.06)';
                    var craters = [[0.2, -0.1, 0.15], [-0.3, 0.2, 0.12], [0.1, 0.3, 0.08], [-0.15, -0.25, 0.1], [0.35, 0.1, 0.07], [-0.05, 0.05, 0.2]];
                    craters.forEach(function(cr) {
                      ctx.beginPath(); ctx.arc(moonCx + cr[0] * moonR, moonCy + cr[1] * moonR, cr[2] * moonR, 0, Math.PI * 2); ctx.fill();
                    });
                    // Dark mare regions
                    ctx.fillStyle = 'rgba(0,0,0,0.04)';
                    ctx.beginPath(); ctx.ellipse(moonCx + moonR * 0.1, moonCy - moonR * 0.1, moonR * 0.3, moonR * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
                    // Landing site marker
                    var lsAngle = tick * 0.003;
                    var lsX = moonCx + moonR * 0.15, lsY = moonCy - moonR * 0.05;
                    ctx.fillStyle = 'rgba(34,197,94,' + (0.4 + Math.sin(tick * 0.06) * 0.3) + ')';
                    ctx.beginPath(); ctx.arc(lsX, lsY, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.font = '7px system-ui'; ctx.fillStyle = '#4ade80'; ctx.textAlign = 'left';
                    ctx.fillText('Tranquility Base', lsX + 6, lsY + 3);
                    ctx.restore();
                    // Orbiting spacecraft
                    var orbitR = moonR * 1.2;
                    var scAngle = tick * 0.012;
                    var scX = moonCx + Math.cos(scAngle) * orbitR;
                    var scY = moonCy + Math.sin(scAngle) * orbitR * 0.3;
                    // Orbit path
                    ctx.strokeStyle = 'rgba(56,189,248,0.15)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.ellipse(moonCx, moonCy, orbitR, orbitR * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
                    // Spacecraft
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(scX, scY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(56,189,248,0.3)';
                    ctx.beginPath(); ctx.arc(scX, scY, 5, 0, Math.PI * 2); ctx.fill();
                    // Label
                    ctx.font = '8px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
                    ctx.fillText('CSM + LM', scX, scY - 8);
                    // HUD
                    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('LUNAR ORBIT \u2022 ALT 110 km \u2022 PERIOD 2h', 10, 14);
                    // Comms
                    var orbitComms = ['Houston: "You are GO for undocking."', 'CMP: "I\'ll keep Columbia warm for you."', 'CDR: "The landing site looks smooth."', 'LMP: "Eagle systems nominal."'];
                    var ocIdx = Math.floor(tick / 250) % orbitComms.length;
                    ctx.globalAlpha = Math.min(1, (tick % 250) < 200 ? (tick % 250) / 30 : (250 - tick % 250) / 50) * 0.6;
                    ctx.font = 'italic 9px system-ui'; ctx.fillStyle = '#a5b4fc'; ctx.textAlign = 'center';
                    ctx.fillText(orbitComms[ocIdx], W * 0.5, HO - 10);
                    ctx.globalAlpha = 1;
                    requestAnimationFrame(drawOrbit);
                  }
                  drawOrbit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                [
                  ['\uD83C\uDF15 Landing Site', 'Mare Tranquillitatis'],
                  ['\uD83D\uDCCD Coordinates', '0.674\u00B0N, 23.473\u00B0E'],
                  ['\uD83D\uDE80 LM "Eagle"', 'CDR + LMP aboard'],
                  ['\uD83D\uDEF0 CM "Columbia"', 'CMP orbiting solo']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-slate-800 rounded p-1.5' },
                    h('p', { className: 'text-[9px] text-slate-400' }, item[0]),
                    h('p', { className: 'text-[10px] font-bold text-slate-200' }, item[1])
                  );
                })
              )
            )
          ),
          h('button', {
            'aria-label': 'Undock Lunar Module Eagle from Command Module Columbia and begin powered descent to the Moon surface',
            onClick: function() {
              setPhase(5);
              log('\u2B07\uFE0F Undocked from Columbia. Beginning powered descent.');
              addXP(15);
              if (addToast) addToast('\u2B07\uFE0F "The Eagle has undocked!" Beginning powered descent.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg'
          }, '\u2B07\uFE0F Undock & Begin Powered Descent')
        ),

        // ═══ PHASE 5: POWERED DESCENT ═══
        phase === 5 && h('div', { className: 'space-y-3' },
          // Onboarding overlay (before game starts)
          !d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 border border-slate-700 text-white text-center' },
            h('div', { className: 'text-4xl mb-3' }, '\u2B07\uFE0F'),
            h('h4', { className: 'text-lg font-black mb-2' }, 'Powered Descent'),
            h('p', { className: 'text-xs text-slate-400 mb-4' }, 'You are piloting the Lunar Module to the Moon\'s surface. Control your thrust to land softly!'),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4 max-w-sm mx-auto' },
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2B06\uFE0F'),
                h('p', { className: 'text-[10px] font-bold text-sky-300' }, 'W / \u2191'),
                h('p', { className: 'text-[9px] text-slate-400' }, 'Fire engines (thrust UP)')
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2194\uFE0F'),
                h('p', { className: 'text-[10px] font-bold text-sky-300' }, 'A/D or \u2190/\u2192'),
                h('p', { className: 'text-[9px] text-slate-400' }, 'Lateral movement')
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\uD83C\uDFAF'),
                h('p', { className: 'text-[10px] font-bold text-amber-300' }, 'Goal'),
                h('p', { className: 'text-[9px] text-slate-400' }, 'V < 3 m/s, H < 5 m/s')
              )
            ),
            h('div', { className: 'bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4 max-w-sm mx-auto' },
              h('p', { className: 'text-[10px] text-amber-300 font-bold mb-1' }, '\u26A0\uFE0F Tips from Mission Control:'),
              h('ul', { className: 'text-[10px] text-amber-200 space-y-1 text-left pl-4' },
                h('li', null, 'Start slowing down early \u2014 Moon gravity is gentle but relentless'),
                h('li', null, 'Watch your fuel gauge \u2014 you can\'t thrust without fuel!'),
                h('li', null, 'Reduce horizontal speed before focusing on vertical'),
                h('li', null, 'The real Apollo 11 landed with only 25 seconds of fuel left!')
              )
            ),
            h('button', {
              'aria-label': 'Begin powered descent piloting',
              onClick: function() { upd('descentStarted', true); },
              className: 'px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all hover:scale-[1.02] animate-pulse'
            }, '\uD83D\uDE80 Begin Descent \u2014 Take the Controls!')
          ),
          // Game canvas (after onboarding)
          d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '420px' } },
              h('canvas', {
                'data-descent-canvas': 'true',
                role: 'application',
                'aria-label': 'Interactive lunar descent piloting game. Use W or Up Arrow for thrust, A and D or Left and Right arrows for lateral movement. Land with vertical speed under 3 meters per second and horizontal speed under 5 meters per second.',
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._descentInit) return;
                  cvEl._descentInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 420;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);
                  var tick = 0;
                  var alt = 15000; // meters
                  var vVel = -20; // vertical velocity (negative = descending)
                  var hVel = 500; // horizontal velocity
                  var fuel = 100;
                  var thrust = 0;
                  var landed = false;
                  var crashed = false;
                  var alarms = [];

                  // Controls
                  var keys = {};
                  cvEl.tabIndex = 0;
                  cvEl.addEventListener('keydown', function(e) { keys[e.key] = true; e.preventDefault(); });
                  cvEl.addEventListener('keyup', function(e) { keys[e.key] = false; });
                  cvEl.focus();

                  function drawDescent() {
                    tick++;
                    ctx.clearRect(0, 0, W, H);

                    if (!landed && !crashed) {
                      // Controls: up arrow = thrust, left/right = horizontal adjust
                      if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                        thrust = Math.min(1, thrust + 0.03);
                        if (fuel > 0) fuel -= 0.08;
                      } else {
                        thrust *= 0.95;
                      }
                      if (keys['ArrowLeft'] || keys['a'] || keys['A']) hVel -= 0.5;
                      if (keys['ArrowRight'] || keys['d'] || keys['D']) hVel += 0.5;

                      // Physics
                      var gravity = 1.62; // Moon gravity m/s^2
                      var thrustForce = thrust * (fuel > 0 ? 4 : 0);
                      vVel += (-gravity + thrustForce) * 0.016;
                      hVel *= 0.999;
                      alt += vVel * 0.5;

                      // Program alarms
                      if (alt < 500 && alarms.indexOf('1202') === -1) {
                        alarms.push('1202');
                      }

                      // Landing check
                      if (alt <= 0) {
                        alt = 0;
                        if (Math.abs(vVel) < 3 && Math.abs(hVel) < 5) {
                          landed = true;
                        } else {
                          crashed = true;
                        }
                      }
                    }

                    // Background: black space + Moon surface below
                    ctx.fillStyle = '#000005';
                    ctx.fillRect(0, 0, W, H);
                    // Stars
                    ctx.fillStyle = '#ffffff';
                    for (var si = 0; si < 50; si++) {
                      ctx.globalAlpha = 0.3 + Math.sin(tick * 0.02 + si) * 0.2;
                      ctx.beginPath();
                      ctx.arc((si * 97 + 13) % W, (si * 61 + 7) % (H * 0.4), 0.8, 0, Math.PI * 2);
                      ctx.fill();
                    }
                    ctx.globalAlpha = 1;

                    // Moon surface (rises as altitude drops)
                    var surfaceY = H * 0.5 + Math.min(H * 0.45, (alt / 15000) * H * 0.45);
                    ctx.fillStyle = '#8a8278';
                    ctx.fillRect(0, surfaceY, W, H - surfaceY);
                    // Craters on surface
                    ctx.fillStyle = '#706860';
                    for (var ci = 0; ci < 8; ci++) {
                      var crX = (ci * 73 + 20) % W;
                      var crR = 8 + ci * 5;
                      if (surfaceY < H - 10) {
                        ctx.beginPath();
                        ctx.arc(crX, surfaceY + 10 + ci * 3, crR, 0, Math.PI * 2);
                        ctx.fill();
                      }
                    }

                    // LM (center of screen)
                    var lmX = W * 0.5, lmY = Math.min(surfaceY - 15, H * 0.5);
                    // Descent stage (gold foil box)
                    ctx.fillStyle = '#c9a04a';
                    ctx.fillRect(lmX - 12, lmY, 24, 14);
                    // Ascent stage (silver box)
                    ctx.fillStyle = '#cccccc';
                    ctx.fillRect(lmX - 10, lmY - 14, 20, 16);
                    // Window
                    ctx.fillStyle = '#334455';
                    ctx.fillRect(lmX - 4, lmY - 12, 8, 6);
                    // Legs
                    ctx.strokeStyle = '#888888';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(lmX - 12, lmY + 14); ctx.lineTo(lmX - 20, lmY + 24);
                    ctx.moveTo(lmX + 12, lmY + 14); ctx.lineTo(lmX + 20, lmY + 24);
                    ctx.stroke();
                    // Foot pads
                    ctx.fillStyle = '#888888';
                    ctx.fillRect(lmX - 23, lmY + 23, 6, 2);
                    ctx.fillRect(lmX + 17, lmY + 23, 6, 2);
                    // Thrust flame
                    if (thrust > 0.1 && fuel > 0) {
                      var fLen = 10 + thrust * 25 + Math.random() * 5;
                      var fGrad = ctx.createLinearGradient(lmX, lmY + 14, lmX, lmY + 14 + fLen);
                      fGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
                      fGrad.addColorStop(0.3, 'rgba(255,200,50,0.6)');
                      fGrad.addColorStop(1, 'rgba(255,100,0,0)');
                      ctx.fillStyle = fGrad;
                      ctx.beginPath();
                      ctx.moveTo(lmX - 5, lmY + 14);
                      ctx.lineTo(lmX, lmY + 14 + fLen);
                      ctx.lineTo(lmX + 5, lmY + 14);
                      ctx.fill();
                    }

                    // HUD
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(6, 6, 140, 100);
                    ctx.fillRect(W - 146, 6, 140, 80);
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('ALTITUDE', 12, 18);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
                    ctx.fillText(alt > 1000 ? (alt / 1000).toFixed(2) + ' km' : alt.toFixed(1) + ' m', 12, 34);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('V/SPEED', 12, 48);
                    ctx.fillStyle = vVel < -5 ? '#ef4444' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(vVel.toFixed(1) + ' m/s', 12, 60);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('H/SPEED', 12, 74);
                    ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
                    ctx.fillText(hVel.toFixed(1) + ' m/s', 12, 86);
                    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 9px monospace'; ctx.fillText('FUEL', 12, 100);
                    ctx.fillStyle = fuel < 20 ? '#ef4444' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(fuel.toFixed(0) + '%', 50, 100);

                    // Right HUD
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.fillText('THRUST', W - 12, 18);
                    ctx.fillStyle = '#1e293b'; ctx.fillRect(W - 136, 22, 120, 8);
                    ctx.fillStyle = '#fbbf24'; ctx.fillRect(W - 136, 22, 120 * thrust, 8);
                    ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
                    ctx.fillText('\u2191 or W = thrust', W - 12, 46);
                    ctx.fillText('\u2190\u2192 or A/D = lateral', W - 12, 58);
                    ctx.fillText('Land: V < 3 m/s, H < 5 m/s', W - 12, 72);

                    // Alarm
                    if (alarms.length > 0 && tick % 60 < 30) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#fbbf24';
                      ctx.font = 'bold 12px monospace';
                      ctx.fillText('\u26A0 PROGRAM ALARM 1202 \u2014 EXECUTIVE OVERFLOW', W * 0.5, H * 0.15);
                      ctx.font = '9px system-ui';
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillText('(Same alarm Armstrong got \u2014 computer overloaded but mission continues!)', W * 0.5, H * 0.19);
                    }

                    // Landed!
                    if (landed) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#22c55e';
                      ctx.font = 'bold 20px system-ui';
                      ctx.fillText('\uD83C\uDF15 "The Eagle has landed!"', W * 0.5, H * 0.18);
                      ctx.font = '12px system-ui';
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillText('Touchdown! V: ' + Math.abs(vVel).toFixed(1) + ' m/s \u2022 Fuel remaining: ' + fuel.toFixed(0) + '%', W * 0.5, H * 0.24);
                      // Landing score
                      var landingScore = 0;
                      var landingGrade = 'C';
                      if (Math.abs(vVel) < 1) { landingScore += 30; } else if (Math.abs(vVel) < 2) { landingScore += 20; } else { landingScore += 10; }
                      if (Math.abs(hVel) < 2) { landingScore += 20; } else if (Math.abs(hVel) < 4) { landingScore += 10; }
                      if (fuel > 20) { landingScore += 30; } else if (fuel > 10) { landingScore += 20; } else if (fuel > 0) { landingScore += 10; }
                      landingScore += Math.min(20, Math.floor(fuel * 0.2)); // bonus for extra fuel
                      if (landingScore >= 90) landingGrade = 'A+'; else if (landingScore >= 80) landingGrade = 'A'; else if (landingScore >= 70) landingGrade = 'B'; else if (landingScore >= 50) landingGrade = 'C';
                      ctx.font = 'bold 14px system-ui';
                      ctx.fillStyle = landingScore >= 80 ? '#22c55e' : landingScore >= 50 ? '#fbbf24' : '#f97316';
                      ctx.fillText('Landing Score: ' + landingScore + '/100 (Grade: ' + landingGrade + ')', W * 0.5, H * 0.30);
                      ctx.font = '9px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Soft touch +30 | Low drift +20 | Fuel bonus +' + Math.min(20, Math.floor(fuel * 0.2)) + ' | Reserve +' + (fuel > 20 ? 30 : fuel > 10 ? 20 : fuel > 0 ? 10 : 0), W * 0.5, H * 0.34);
                      ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui';
                      ctx.fillText('Click "Begin EVA" to walk on the Moon!', W * 0.5, H * 0.40);
                    }

                    // Crashed
                    if (crashed) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#ef4444';
                      ctx.font = 'bold 18px system-ui';
                      ctx.fillText('\u26A0 HARD LANDING', W * 0.5, H * 0.2);
                      ctx.font = '11px system-ui';
                      ctx.fillStyle = '#f87171';
                      ctx.fillText('Impact V: ' + Math.abs(vVel).toFixed(1) + ' m/s (limit: 3 m/s) \u2014 Try again or proceed', W * 0.5, H * 0.26);
                    }

                    if (!landed && !crashed) requestAnimationFrame(drawDescent);
                    else {
                      // One more frame render for final state
                      setTimeout(function() { drawDescent(); }, 100);
                    }
                  }
                  drawDescent();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center' },
              h('p', { className: 'text-[10px] text-slate-400' }, '\u2191/W = thrust \u2022 \u2190\u2192/AD = lateral \u2022 Land gently!'),
              h('button', {
                'aria-label': 'Begin extravehicular activity moonwalk to explore the lunar surface and collect geological samples',
                onClick: function() {
                  setPhase(6);
                  log('\uD83C\uDF15 "The Eagle has landed!" Preparing for EVA.');
                  addXP(30);
                  if (addToast) addToast('\uD83D\uDC68\u200D\uD83D\uDE80 "That\'s one small step..." Preparing for moonwalk!', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700'
              }, '\uD83D\uDC68\u200D\uD83D\uDE80 Begin EVA')
            )
          )
        ),

        // ═══ PHASE 6: MOONWALK EVA (3D) ═══
        phase === 6 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '70vh', minHeight: '400px', maxHeight: '700px' } },
              h('canvas', {
                'data-eva-canvas': 'true',
                role: 'application',
                'aria-label': 'Interactive 3D lunar surface EVA. Use WASD to walk, Space to jump in one-sixth gravity, F to collect rock samples, mouse to look around. Collect geological samples and explore the Moon surface near the Lunar Module.',
                style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' },
                ref: function(canvasEl) {
                  if (!canvasEl || canvasEl._evaInit) return;
                  canvasEl._evaInit = true;

                  function doEvaInit(THREE) {
                    var W = canvasEl.clientWidth || 800, H2 = canvasEl.clientHeight || 500;
                    var scene = new THREE.Scene();
                    var camera = new THREE.PerspectiveCamera(70, W / H2, 0.1, 500);
                    camera.position.set(0, 1.8, 0); // astronaut eye height in 1/6 gravity suit
                    var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    renderer.setSize(W, H2);
                    renderer.setClearColor(0x000000);

                    // ── Lunar sky (black + stars + Earth in sky) ──
                    var skyGeo = new THREE.SphereGeometry(200, 32, 16);
                    var skyCv = document.createElement('canvas'); skyCv.width = 512; skyCv.height = 256;
                    var sCtx = skyCv.getContext('2d');
                    sCtx.fillStyle = '#000000'; sCtx.fillRect(0, 0, 512, 256);
                    // Dense starfield
                    for (var si = 0; si < 400; si++) {
                      sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')';
                      sCtx.beginPath();
                      sCtx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 1.2, 0, Math.PI * 2);
                      sCtx.fill();
                    }
                    // Earth in the sky (big blue marble)
                    sCtx.fillStyle = '#3b82f6';
                    sCtx.beginPath(); sCtx.arc(380, 50, 18, 0, Math.PI * 2); sCtx.fill();
                    sCtx.fillStyle = '#22c55e'; // continent hint
                    sCtx.beginPath(); sCtx.arc(375, 47, 6, 0, Math.PI * 2); sCtx.fill();
                    sCtx.fillStyle = 'rgba(255,255,255,0.15)';
                    sCtx.beginPath(); sCtx.arc(373, 43, 12, 0, Math.PI); sCtx.fill();
                    var skyTex = new THREE.CanvasTexture(skyCv);
                    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })));

                    // ── Lunar terrain (grey regolith with craters) ──
                    var terrainGeo = new THREE.PlaneGeometry(200, 200, 100, 100);
                    var tPos = terrainGeo.attributes.position.array;
                    for (var vi = 0; vi < tPos.length; vi += 3) {
                      var px = tPos[vi], py = tPos[vi + 1];
                      var h2 = Math.sin(px * 0.05) * Math.cos(py * 0.04) * 1.5;
                      h2 += Math.sin(px * 0.15 + py * 0.1) * 0.3;
                      // Craters
                      var cxs = [15, -25, 40, -10, 30], czs = [20, -15, -30, 35, -40], crs = [10, 7, 12, 5, 8];
                      for (var ci = 0; ci < cxs.length; ci++) {
                        var cd = Math.sqrt(Math.pow(px - cxs[ci], 2) + Math.pow(py - czs[ci], 2));
                        if (cd < crs[ci]) {
                          var rim = 1 - cd / crs[ci];
                          h2 += cd < crs[ci] * 0.8 ? -rim * 2 : rim * 1.5;
                        }
                      }
                      tPos[vi + 2] = h2;
                    }
                    terrainGeo.computeVertexNormals();
                    var tCv = document.createElement('canvas'); tCv.width = 256; tCv.height = 256;
                    var tCx = tCv.getContext('2d');
                    for (var ty = 0; ty < 256; ty++) {
                      for (var tx = 0; tx < 256; tx++) {
                        var n = 130 + Math.sin(tx * 0.3 + ty * 0.2) * 10 + (Math.random() - 0.5) * 15;
                        tCx.fillStyle = 'rgb(' + n + ',' + (n - 2) + ',' + (n - 5) + ')';
                        tCx.fillRect(tx, ty, 1, 1);
                      }
                    }
                    var terrainTex = new THREE.CanvasTexture(tCv);
                    terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(8, 8);
                    var terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.95, metalness: 0.02, flatShading: true }));
                    terrain.rotation.x = -Math.PI / 2;
                    scene.add(terrain);
                    var _terrainRay = new THREE.Raycaster();
                    var _terrainHeightAt = function(x, z) {
                      _terrainRay.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
                      var hits = _terrainRay.intersectObject(terrain);
                      return hits.length > 0 ? hits[0].point.y : 0;
                    };

                    // ── Lighting (harsh unfiltered sunlight + no atmosphere) ──
                    scene.add(new THREE.AmbientLight(0x222222, 0.4));
                    var sun = new THREE.DirectionalLight(0xfff8e1, 1.5);
                    sun.position.set(40, 25, 15);
                    scene.add(sun);

                    // ── Lunar Module on surface ──
                    var lmGroup = new THREE.Group();
                    // Descent stage (gold)
                    var dsGeo = new THREE.BoxGeometry(2.5, 1.5, 2.5);
                    lmGroup.add(new THREE.Mesh(dsGeo, new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 0.4, roughness: 0.6 })));
                    // Ascent stage (silver)
                    var asGeo = new THREE.BoxGeometry(2, 2, 2);
                    var asMesh = new THREE.Mesh(asGeo, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 }));
                    asMesh.position.y = 1.8; lmGroup.add(asMesh);
                    // Legs (4)
                    [[-1.3, 0, -1.3], [1.3, 0, -1.3], [-1.3, 0, 1.3], [1.3, 0, 1.3]].forEach(function(lp) {
                      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                      leg.position.set(lp[0], -0.8, lp[2]);
                      leg.rotation.z = lp[0] > 0 ? 0.3 : -0.3;
                      leg.rotation.x = lp[2] > 0 ? -0.3 : 0.3;
                      lmGroup.add(leg);
                      // Foot pad
                      var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                      pad.position.set(lp[0] * 1.5, -1.7, lp[2] * 1.5);
                      lmGroup.add(pad);
                    });
                    // Flag
                    var flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
                    flagPole.position.set(4, 0.5, 2);
                    scene.add(flagPole);
                    var flagGeo = new THREE.PlaneGeometry(1.2, 0.7);
                    var flagMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
                    var flag = new THREE.Mesh(flagGeo, flagMat);
                    flag.position.set(4.6, 1.6, 2); scene.add(flag);
                    // Blue canton
                    var cantonGeo = new THREE.PlaneGeometry(0.45, 0.35);
                    var cantonMat = new THREE.MeshBasicMaterial({ color: 0x2244aa, side: THREE.DoubleSide });
                    var canton = new THREE.Mesh(cantonGeo, cantonMat);
                    canton.position.set(4.22, 1.82, 2.01); scene.add(canton);

                    lmGroup.position.set(0, _terrainHeightAt(0, 0) + 1.7, 0);
                    scene.add(lmGroup);

                    // ── ALSEP Science Station ──
                    var alsepX = -6, alsepZ = 5;
                    var alsepY = _terrainHeightAt(alsepX, alsepZ);
                    // Central station box
                    var alsepBox = new THREE.Mesh(
                      new THREE.BoxGeometry(0.6, 0.3, 0.6),
                      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 })
                    );
                    alsepBox.position.set(alsepX, alsepY + 0.15, alsepZ);
                    scene.add(alsepBox);
                    // Solar panel wing
                    var alsepPanel = new THREE.Mesh(
                      new THREE.BoxGeometry(1.2, 0.02, 0.4),
                      new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 })
                    );
                    alsepPanel.position.set(alsepX, alsepY + 0.35, alsepZ);
                    scene.add(alsepPanel);
                    // Seismometer (small cylinder nearby)
                    var seismo = new THREE.Mesh(
                      new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8),
                      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.4 })
                    );
                    seismo.position.set(alsepX + 2, alsepY + 0.15, alsepZ + 1);
                    scene.add(seismo);
                    // Laser retroreflector (flat panel angled up)
                    var retroGeo = new THREE.BoxGeometry(0.4, 0.02, 0.4);
                    var retroMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.8, roughness: 0.1 });
                    var retro = new THREE.Mesh(retroGeo, retroMat);
                    retro.position.set(alsepX - 2, alsepY + 0.3, alsepZ - 1);
                    retro.rotation.x = -0.5;
                    scene.add(retro);

                    // ── Lunar Rover (Apollo 15-17 style) ──
                    var roverGrp = new THREE.Group();
                    // Chassis
                    var rChassis = new THREE.Mesh(
                      new THREE.BoxGeometry(1.5, 0.2, 0.8),
                      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 })
                    );
                    rChassis.position.y = 0.3; roverGrp.add(rChassis);
                    // Wheels (4)
                    [[-0.7, 0.15, -0.4], [0.7, 0.15, -0.4], [-0.7, 0.15, 0.4], [0.7, 0.15, 0.4]].forEach(function(wp) {
                      var wheel = new THREE.Mesh(
                        new THREE.TorusGeometry(0.15, 0.04, 6, 12),
                        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.3, roughness: 0.8 })
                      );
                      wheel.position.set(wp[0], wp[1], wp[2]);
                      wheel.rotation.y = Math.PI / 2;
                      roverGrp.add(wheel);
                    });
                    // Antenna dish
                    var rDish = new THREE.Mesh(
                      new THREE.CircleGeometry(0.3, 12),
                      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 })
                    );
                    rDish.position.set(0, 0.8, -0.3);
                    rDish.rotation.x = -0.7;
                    roverGrp.add(rDish);
                    var rvX = 8, rvZ = -4;
                    roverGrp.position.set(rvX, _terrainHeightAt(rvX, rvZ), rvZ);
                    roverGrp.rotation.y = 0.5;
                    scene.add(roverGrp);

                    // ── Scattered boulders ──
                    for (var bi = 0; bi < 30; bi++) {
                      var bx = (Math.random() - 0.5) * 100, bz = (Math.random() - 0.5) * 100;
                      var bScale = 0.2 + Math.random() * 1.2;
                      var bGeo = new THREE.DodecahedronGeometry(bScale, 0);
                      var bPos2 = bGeo.attributes.position.array;
                      for (var bvi = 0; bvi < bPos2.length; bvi += 3) {
                        bPos2[bvi] *= 0.6 + Math.random() * 0.8;
                        bPos2[bvi + 1] *= 0.4 + Math.random() * 0.6;
                      }
                      bGeo.computeVertexNormals();
                      var boulder = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.95, flatShading: true }));
                      boulder.position.set(bx, _terrainHeightAt(bx, bz) + bScale * 0.2, bz);
                      boulder.rotation.set(Math.random(), Math.random(), 0);
                      scene.add(boulder);
                    }

                    // ── Hadley Rille (sinuous lava channel) ──
                    var rillePoints = [];
                    for (var ri2 = 0; ri2 < 30; ri2++) {
                      var rx2 = -40 + ri2 * 3 + Math.sin(ri2 * 0.5) * 5;
                      var rz2 = 30 + Math.cos(ri2 * 0.3) * 8;
                      rillePoints.push(new THREE.Vector3(rx2, _terrainHeightAt(rx2, rz2) - 0.5, rz2));
                    }
                    var rilleGeo = new THREE.BufferGeometry().setFromPoints(rillePoints);
                    var rilleMat = new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 2 });
                    scene.add(new THREE.Line(rilleGeo, rilleMat));
                    // Rille walls (dark trench)
                    for (var rw = 0; rw < rillePoints.length - 1; rw++) {
                      var wallGeo = new THREE.PlaneGeometry(0.8, 1.5);
                      var wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.95, side: THREE.DoubleSide });
                      var wall = new THREE.Mesh(wallGeo, wallMat);
                      wall.position.copy(rillePoints[rw]);
                      wall.position.y -= 0.3;
                      wall.lookAt(rillePoints[rw + 1]);
                      scene.add(wall);
                    }

                    // ── Highland ridge in the distance ──
                    var ridgeGeo = new THREE.BoxGeometry(60, 6, 4);
                    var ridgePos = ridgeGeo.attributes.position.array;
                    for (var rpi = 0; rpi < ridgePos.length; rpi += 3) {
                      ridgePos[rpi] *= 0.8 + Math.random() * 0.4;
                      ridgePos[rpi + 1] *= 0.6 + Math.random() * 0.8;
                      ridgePos[rpi + 2] *= 0.7 + Math.random() * 0.6;
                    }
                    ridgeGeo.computeVertexNormals();
                    var ridgeMat = new THREE.MeshStandardMaterial({ color: 0x9a9288, roughness: 0.95, flatShading: true });
                    var ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
                    ridge.position.set(0, _terrainHeightAt(0, -70) + 2, -70);
                    scene.add(ridge);

                    // ── Earthrise glow on the horizon ──
                    var earthGlowGeo = new THREE.SphereGeometry(4, 16, 12);
                    var earthGlowMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
                    var earthGlow = new THREE.Mesh(earthGlowGeo, earthGlowMat);
                    earthGlow.position.set(-80, 15, -60);
                    scene.add(earthGlow);
                    // Earth atmosphere halo
                    var earthHaloGeo = new THREE.SphereGeometry(5.5, 16, 12);
                    var earthHaloMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.15 });
                    scene.add(new THREE.Mesh(earthHaloGeo, earthHaloMat)).position.copy(earthGlow.position);

                    // ── Sample collection orbs (lunar rocks) ──
                    var lunarSampleOrbs = [];
                    LUNAR_SAMPLES_DATA.forEach(function(sd, sdi) {
                      var ox = 8 + (Math.random() - 0.5) * 60;
                      var oz = 8 + (Math.random() - 0.5) * 60;
                      var oy = _terrainHeightAt(ox, oz) + 0.4;
                      var orbGroup = new THREE.Group();
                      var orbGeo = new THREE.DodecahedronGeometry(0.3, 0);
                      var orbMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, emissive: 0xfbbf24, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 });
                      orbGroup.add(new THREE.Mesh(orbGeo, orbMat));
                      var ringG = new THREE.Mesh(
                        new THREE.RingGeometry(0.45, 0.55, 12),
                        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
                      );
                      ringG.rotation.x = -Math.PI / 2; ringG.position.y = -0.2;
                      orbGroup.add(ringG);
                      orbGroup.position.set(ox, oy, oz);
                      orbGroup._sampleData = sd;
                      orbGroup._collected = false;
                      orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                      scene.add(orbGroup);
                      lunarSampleOrbs.push(orbGroup);
                    });

                    // ── Bootprint decals (leave prints as you walk) ──
                    var bootprints = [];

                    // ── Movement (1/6 gravity bouncing) ──
                    var moveState = { forward: false, back: false, left: false, right: false, sample: false };
                    var yaw = 0, pitch = 0;
                    var playerPos = new THREE.Vector3(3, _terrainHeightAt(3, 3) + 1.8, 3);
                    var playerVelY = 0;
                    var isJumping = false;
                    var speed3d = 0.06; // slower in spacesuit

                    canvasEl.addEventListener('keydown', function(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = true; break;
                        case 's': case 'arrowdown': moveState.back = true; break;
                        case 'a': case 'arrowleft': moveState.left = true; break;
                        case 'd': case 'arrowright': moveState.right = true; break;
                        case 'f': moveState.sample = true; break;
                        case ' ': if (!isJumping) { playerVelY = 0.12; isJumping = true; } break; // 1/6 gravity jump!
                      }
                      e.preventDefault();
                    });
                    canvasEl.addEventListener('keyup', function(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = false; break;
                        case 's': case 'arrowdown': moveState.back = false; break;
                        case 'a': case 'arrowleft': moveState.left = false; break;
                        case 'd': case 'arrowright': moveState.right = false; break;
                        case 'f': moveState.sample = false; break;
                      }
                    });
                    var isLooking = false;
                    canvasEl.addEventListener('mousedown', function() { isLooking = true; canvasEl.requestPointerLock && canvasEl.requestPointerLock(); });
                    canvasEl.addEventListener('mouseup', function() { isLooking = false; });
                    function onMM(e) {
                      if (!isLooking && !document.pointerLockElement) return;
                      yaw -= e.movementX * 0.003;
                      pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.003));
                    }
                    document.addEventListener('mousemove', onMM);
                    canvasEl.focus();

                    // ── EVA HUD ──
                    var evaHud = document.createElement('div');
                    evaHud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);border-radius:10px;padding:8px 12px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.2);max-width:200px';
                    evaHud.innerHTML = '<div style="font-weight:bold;font-size:11px;color:#fbbf24;margin-bottom:4px">\uD83D\uDC68\u200D\uD83D\uDE80 LUNAR EVA</div>' +
                      '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px">' +
                      '<span style="color:#64748b">O\u2082</span><span id="eva-o2" style="color:#22c55e">100%</span>' +
                      '<span style="color:#64748b">\uD83E\uDEA8</span><span id="eva-samples">0 / ' + LUNAR_SAMPLES_DATA.length + ' samples</span>' +
                      '<span style="color:#64748b">\uD83D\uDC63</span><span id="eva-steps">0 steps</span>' +
                      '</div>' +
                      '<div style="border-top:1px solid rgba(56,189,248,0.1);margin-top:4px;padding-top:4px;color:#94a3b8;font-size:8px">WASD move \u2022 SPACE jump (1/6g!) \u2022 F collect \u2022 Mouse look</div>';
                    canvasEl.parentElement.appendChild(evaHud);

                    // ── Animation ──
                    var evaTick = 0;
                    var evaO2 = 100;
                    var evaSteps = 0;
                    var evaSampleCount = 0;
                    var evaSampleCooldown = 0;

                    function animateEva() {
                      requestAnimationFrame(animateEva);
                      evaTick++;

                      // Movement
                      var dir = new THREE.Vector3();
                      if (moveState.forward) dir.z -= 1;
                      if (moveState.back) dir.z += 1;
                      if (moveState.left) dir.x -= 1;
                      if (moveState.right) dir.x += 1;
                      dir.normalize().multiplyScalar(speed3d);
                      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                      playerPos.add(dir);

                      // 1/6 gravity physics
                      playerVelY -= 0.0027; // Moon gravity (1/6 of Earth)
                      playerPos.y += playerVelY;
                      var groundH = _terrainHeightAt(playerPos.x, playerPos.z) + 1.8;
                      if (playerPos.y <= groundH) {
                        playerPos.y = groundH;
                        playerVelY = 0;
                        isJumping = false;
                      }

                      // Bootprints
                      if (dir.length() > 0.01 && !isJumping && evaTick % 20 === 0) {
                        evaSteps++;
                        var bpGeo = new THREE.PlaneGeometry(0.15, 0.25);
                        var bpMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                        var bp = new THREE.Mesh(bpGeo, bpMat);
                        bp.rotation.x = -Math.PI / 2;
                        bp.rotation.z = yaw;
                        bp.position.set(playerPos.x, groundH - 1.78, playerPos.z);
                        scene.add(bp);
                        bootprints.push(bp);
                        if (bootprints.length > 200) { scene.remove(bootprints.shift()); }
                      }

                      // Camera
                      camera.position.copy(playerPos);
                      camera.rotation.order = 'YXZ';
                      camera.rotation.y = yaw;
                      camera.rotation.x = pitch;

                      // O2 depletion (rate based on difficulty)
                      if (evaTick % 60 === 0) evaO2 = Math.max(0, evaO2 - diffSettings.o2Rate);
                      // O2 warnings
                      if (evaO2 < 30 && evaO2 > 29.5 && evaTick % 60 === 0) {
                        if (addToast) addToast('\u26A0\uFE0F O\u2082 at ' + Math.round(evaO2) + '% \u2014 Consider returning to the LM soon!', 'info');
                      }
                      if (evaO2 < 15 && evaO2 > 14.5 && evaTick % 60 === 0) {
                        if (addToast) addToast('\uD83D\uDEA8 CRITICAL: O\u2082 at ' + Math.round(evaO2) + '%! Return to LM immediately!', 'error');
                      }
                      // Vignette effect when O2 low
                      if (evaO2 < 20) {
                        var warningOverlay = document.getElementById('eva-o2-warning');
                        if (!warningOverlay) {
                          warningOverlay = document.createElement('div');
                          warningOverlay.id = 'eva-o2-warning';
                          warningOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;border-radius:inherit';
                          canvasEl.parentElement.appendChild(warningOverlay);
                        }
                        var urgency = (20 - evaO2) / 20;
                        warningOverlay.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,' + (urgency * 0.3) + ') 100%)';
                        warningOverlay.style.animation = evaO2 < 10 ? 'pulse 1s infinite' : 'none';
                      }

                      // Sample collection
                      if (evaSampleCooldown > 0) evaSampleCooldown--;
                      lunarSampleOrbs.forEach(function(orb) {
                        if (orb._collected) return;
                        orb.children[0].rotation.y += 0.02;
                        orb.children[0].material.opacity = 0.6 + Math.sin(evaTick * 0.05 + orb._pulsePhase) * 0.2;
                        var sDist = playerPos.distanceTo(orb.position);
                        if (sDist < 2 && moveState.sample && evaSampleCooldown <= 0) {
                          orb._collected = true; orb.visible = false;
                          evaSampleCooldown = 60;
                          evaSampleCount++;
                          var sd = orb._sampleData;
                          var newSamples = (d.lunarSamples || []).slice();
                          newSamples.push({ name: sd.name, type: sd.type, icon: sd.icon, fact: sd.fact });
                          upd('lunarSamples', newSamples);
                          if (addToast) addToast(sd.icon + ' Collected: ' + sd.name + ' \u2014 ' + sd.fact, 'success');
                          addXP(sd.xp);
                        }
                      });

                      // ── Proximity-based discovery cards ──
                      if (evaTick % 30 === 0) {
                        var landmarks = [
                          { x: alsepX, z: alsepZ, name: 'ALSEP Science Station', fact: 'The Apollo Lunar Surface Experiments Package ran for years after the astronauts left. The seismometer detected moonquakes and meteorite impacts until 1977.', icon: '\uD83D\uDEF0' },
                          { x: 8, z: -4, name: 'Lunar Rover (LRV)', fact: 'The Lunar Roving Vehicle cost $38 million. Apollo 17\'s rover traveled 35.7 km \u2014 still parked on the Moon with the keys in it!', icon: '\uD83D\uDE97' },
                          { x: 4, z: 2, name: 'American Flag', fact: 'The flags on the Moon have been bleached pure white by decades of unfiltered UV radiation. Only the Apollo 12 flag was knocked over by engine exhaust.', icon: '\uD83C\uDDFA\uD83C\uDDF8' },
                          { x: alsepX + 2, z: alsepZ + 1, name: 'Seismometer', fact: 'Lunar seismometers detected deep moonquakes at 700-1100 km depth, caused by tidal forces from Earth. The Moon still has a partially molten core!', icon: '\uD83D\uDCCA' },
                          { x: alsepX - 2, z: alsepZ - 1, name: 'Laser Retroreflector', fact: 'Scientists bounce lasers off this mirror to measure the Earth-Moon distance to within 1 cm accuracy. The Moon moves 3.8 cm farther from Earth each year.', icon: '\uD83D\uDD2C' }
                        ];
                        var nearestLM = null;
                        var nearestLMDist = 999;
                        landmarks.forEach(function(lm) {
                          var ldist = Math.sqrt(Math.pow(playerPos.x - lm.x, 2) + Math.pow(playerPos.z - lm.z, 2));
                          if (ldist < nearestLMDist) { nearestLMDist = ldist; nearestLM = lm; }
                        });
                        var discEl = document.getElementById('eva-discovery');
                        if (!discEl) {
                          discEl = document.createElement('div');
                          discEl.id = 'eva-discovery';
                          discEl.style.cssText = 'position:absolute;bottom:8px;right:8px;max-width:250px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#e2e8f0;font-family:system-ui;font-size:10px;pointer-events:none;z-index:12;border:1px solid rgba(56,189,248,0.3);opacity:0;transition:opacity 0.5s';
                          canvasEl.parentElement.appendChild(discEl);
                        }
                        if (nearestLM && nearestLMDist < 6) {
                          discEl.innerHTML = '<div style="font-weight:bold;font-size:12px;color:#fbbf24;margin-bottom:3px">' + nearestLM.icon + ' ' + nearestLM.name + '</div>' +
                            '<div style="color:#cbd5e1;line-height:1.4">' + nearestLM.fact + '</div>';
                          discEl.style.opacity = '1';
                        } else {
                          discEl.style.opacity = '0';
                        }
                      }

                      // ── Radio comms chatter ──
                      if (evaTick % 600 === 0 && evaTick > 0) { // every ~10 seconds
                        var evaComms = [
                          'Houston: "How does it feel up there, Commander?"',
                          'LMP: "The regolith is incredibly fine \u2014 like talcum powder."',
                          'Houston: "Your O\u2082 looks good. Continue exploration."',
                          'CDR: "The colors here \u2014 it\u2019s all grays and browns, but the shadows are so sharp."',
                          'LMP: "No atmosphere means no scattering. The shadows are pure black."',
                          'Houston: "Can you describe the terrain near the rille?"',
                          'CDR: "I can see Earth from here. It\u2019s the most beautiful thing I\u2019ve ever seen."',
                          'LMP: "This rock has green crystals in it \u2014 olivine! Fantastic!"',
                          'Houston: "Roger that. Take a photo for the geologists back home."',
                          'CDR: "The silence is profound. Just my own breathing in the suit."',
                          'LMP: "I just jumped three feet in the air. One-sixth gravity is incredible!"',
                          'Houston: "We\u2019re monitoring your vitals. Heart rate is elevated \u2014 from excitement, we hope."'
                        ];
                        var commsIdx2 = Math.floor(evaTick / 600) % evaComms.length;
                        var commsEl = document.getElementById('eva-comms');
                        if (!commsEl) {
                          commsEl = document.createElement('div');
                          commsEl.id = 'eva-comms';
                          commsEl.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);color:rgba(165,180,252,0.7);font-size:10px;font-style:italic;font-family:system-ui;pointer-events:none;z-index:11;text-align:center;transition:opacity 1s;max-width:350px;text-shadow:0 1px 4px rgba(0,0,0,0.8)';
                          canvasEl.parentElement.appendChild(commsEl);
                        }
                        commsEl.style.opacity = '0';
                        setTimeout(function() {
                          commsEl.textContent = '\uD83D\uDCE1 ' + evaComms[commsIdx2];
                          commsEl.style.opacity = '1';
                        }, 500);
                        setTimeout(function() { commsEl.style.opacity = '0'; }, 8000);
                      }

                      // HUD updates
                      if (evaTick % 10 === 0) {
                        var o2El = document.getElementById('eva-o2');
                        var sampEl = document.getElementById('eva-samples');
                        var stepsEl = document.getElementById('eva-steps');
                        if (o2El) { o2El.textContent = evaO2.toFixed(0) + '%'; o2El.style.color = evaO2 > 50 ? '#22c55e' : evaO2 > 20 ? '#f59e0b' : '#ef4444'; }
                        if (sampEl) sampEl.textContent = evaSampleCount + ' / ' + LUNAR_SAMPLES_DATA.length + ' samples';
                        if (stepsEl) stepsEl.textContent = evaSteps + ' steps';
                      }

                      renderer.render(scene, camera);
                    }
                    animateEva();

                    // Cleanup ref
                    canvasEl._evaCleanup = function() {
                      document.removeEventListener('mousemove', onMM);
                      if (document.pointerLockElement === canvasEl) document.exitPointerLock();
                      renderer.dispose();
                      if (evaHud.parentElement) evaHud.parentElement.removeChild(evaHud);
                    };
                  }

                  if (window.THREE) doEvaInit(window.THREE);
                  else {
                    var s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    s.onload = function() { doEvaInit(window.THREE); };
                    document.head.appendChild(s);
                  }
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center' },
              h('div', null,
                h('p', { className: 'text-xs text-white font-bold' }, '\uD83D\uDC68\u200D\uD83D\uDE80 Moonwalk EVA'),
                h('p', { className: 'text-[9px] text-slate-400' }, 'Explore \u2022 Collect samples \u2022 Jump in 1/6 gravity!')
              ),
              h('button', {
                'aria-label': 'End moonwalk EVA and return to Lunar Module. ' + (d.lunarSamples || []).length + ' samples collected.',
                onClick: function() {
                  setPhase(7);
                  log('\uD83D\uDC68\u200D\uD83D\uDE80 EVA complete. ' + (d.lunarSamples || []).length + ' samples collected. Preparing for ascent.');
                  addXP(25);
                  if (addToast) addToast('\u2B06\uFE0F EVA complete! Time to go home. Preparing lunar ascent.', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
              }, '\u2B06\uFE0F End EVA \u2014 Return to LM')
            )
          )
        ),

        // ═══ PHASES 7-9: RETURN JOURNEY ═══
        (phase === 7 || phase === 8) && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, phase === 7 ? '\u2B06\uFE0F' : '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, phase === 7 ? 'Lunar Ascent & Rendezvous' : 'Trans-Earth Coast'),
              h('p', { className: 'text-[10px] text-slate-400' },
                phase === 7 ? 'Ascent stage launches from Moon, docks with Columbia' : 'Returning home \u2022 384,400 km \u2022 ~3 days')
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              phase === 7 ?
                h('div', null,
                  h('p', { className: 'text-[10px] text-slate-300 leading-relaxed' },
                    'The Lunar Module\'s ascent engine fires, launching you off the Moon\'s surface. You rendezvous and dock with Columbia in lunar orbit. The Lunar Module "Eagle" is jettisoned \u2014 it will eventually crash into the Moon.'),
                  h('div', { className: 'mt-2 bg-amber-500/10 rounded p-2 border border-amber-500/20' },
                    h('p', { className: 'text-[10px] text-amber-300' }, '\uD83E\uDEA8 Samples collected: ' + (d.lunarSamples || []).length + ' / ' + LUNAR_SAMPLES_DATA.length),
                    (d.lunarSamples || []).map(function(s, i) {
                      return h('p', { key: i, className: 'text-[9px] text-slate-400 ml-2' }, s.icon + ' ' + s.name + ' (' + s.type + ')');
                    })
                  )
                ) :
                h('p', { className: 'text-[10px] text-slate-300 leading-relaxed' },
                  'The Service Module engine fires for the Trans-Earth Injection burn. You coast for 3 days back to Earth, jettison the Service Module, and prepare the Command Module for re-entry \u2014 the most dangerous phase of the mission.')
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[10px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            )
          ),
          h('button', {
            'aria-label': phase === 7 ? 'Fire trans-Earth injection burn to begin 3-day return journey home' : 'Begin atmospheric re-entry sequence at 39,900 kilometers per hour',
            onClick: function() {
              setPhase(phase + 1);
              log(phase === 7 ? '\u2B06\uFE0F Docked with Columbia. LM jettisoned.' : '\uD83C\uDF0D Approaching Earth. Preparing for re-entry.');
              addXP(15);
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg'
          }, phase === 7 ? '\uD83D\uDE80 TEI Burn \u2014 Head Home' : '\uD83C\uDF0A Begin Re-entry Sequence')
        ),

        // ═══ PHASE 9: RE-ENTRY & SPLASHDOWN (Animated Canvas) ═══
        phase === 9 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-b from-orange-950 to-slate-900 rounded-xl overflow-hidden border border-orange-900/50' },
            h('div', { className: 'relative', style: { height: '320px' } },
              h('canvas', {
                role: 'img',
                'aria-label': 'Animated re-entry sequence. Command Module enters atmosphere at 39,900 km/h with plasma heating to 2,760 degrees. Shows radio blackout, drogue chutes, main parachutes, and ocean splashdown.',
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._reentryInit) return;
                  cvEl._reentryInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HR = cvEl.offsetHeight || 320;
                  cvEl.width = W * 2; cvEl.height = HR * 2; ctx.scale(2, 2);
                  var tick = 0;
                  var reentryPhase = 0; // 0=heat, 1=blackout, 2=drogue, 3=main chutes, 4=splash
                  function drawReentry() {
                    tick++;
                    ctx.clearRect(0, 0, W, HR);
                    // Phase progression
                    if (tick > 180 && reentryPhase === 0) reentryPhase = 1; // blackout
                    if (tick > 360 && reentryPhase === 1) reentryPhase = 2; // drogue
                    if (tick > 480 && reentryPhase === 2) reentryPhase = 3; // main chutes
                    if (tick > 600 && reentryPhase === 3) reentryPhase = 4; // splash
                    var capsuleY = HR * 0.35;
                    // Background changes with phase
                    if (reentryPhase <= 1) {
                      // Space/upper atmosphere - dark with plasma glow
                      var heatPct = Math.min(1, tick / 180);
                      var bgGrad = ctx.createLinearGradient(0, 0, 0, HR);
                      bgGrad.addColorStop(0, '#000005');
                      bgGrad.addColorStop(0.5, 'rgb(' + Math.round(40 * heatPct) + ',0,' + Math.round(10 * heatPct) + ')');
                      bgGrad.addColorStop(1, 'rgb(' + Math.round(80 * heatPct) + ',' + Math.round(20 * heatPct) + ',0)');
                      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, HR);
                      // Stars (fade out during heating)
                      ctx.globalAlpha = 0.3 * (1 - heatPct);
                      ctx.fillStyle = '#fff';
                      for (var si = 0; si < 40; si++) {
                        ctx.beginPath(); ctx.arc((si * 97 + 13) % W, (si * 61 + 7) % HR, 0.6, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.globalAlpha = 1;
                      // Plasma/fire effect around capsule
                      if (heatPct > 0.2) {
                        var fireIntensity = heatPct;
                        for (var fi = 0; fi < 15; fi++) {
                          var fx = W * 0.5 + (Math.random() - 0.5) * 40 * fireIntensity;
                          var fy = capsuleY + 20 + Math.random() * 60 * fireIntensity;
                          var fr = 5 + Math.random() * 15 * fireIntensity;
                          var fireGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
                          fireGrad.addColorStop(0, 'rgba(255,' + Math.round(200 - fi * 10) + ',0,' + (0.3 * fireIntensity) + ')');
                          fireGrad.addColorStop(1, 'transparent');
                          ctx.fillStyle = fireGrad;
                          ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
                        }
                      }
                      // Blackout static
                      if (reentryPhase === 1) {
                        ctx.globalAlpha = 0.15;
                        for (var ni = 0; ni < 50; ni++) {
                          ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#ff4400';
                          ctx.fillRect(Math.random() * W, Math.random() * HR, 2, 1);
                        }
                        ctx.globalAlpha = 1;
                        ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace';
                        ctx.fillStyle = '#ff4444';
                        ctx.fillText('\u26A0 COMMUNICATIONS BLACKOUT', W * 0.5, 30);
                        ctx.font = '9px system-ui'; ctx.fillStyle = '#f87171';
                        ctx.fillText('Ionized plasma blocking all radio signals...', W * 0.5, 46);
                      }
                    } else {
                      // Lower atmosphere - blue sky appearing
                      var skyProgress = (reentryPhase - 2) / 2;
                      var bgGrad2 = ctx.createLinearGradient(0, 0, 0, HR);
                      bgGrad2.addColorStop(0, 'rgb(' + Math.round(30 + skyProgress * 100) + ',' + Math.round(50 + skyProgress * 130) + ',' + Math.round(80 + skyProgress * 170) + ')');
                      bgGrad2.addColorStop(1, reentryPhase >= 4 ? '#3b82f6' : '#1e40af');
                      ctx.fillStyle = bgGrad2; ctx.fillRect(0, 0, W, HR);
                      capsuleY = HR * (0.3 + skyProgress * 0.25);
                      // Ocean at bottom for splash phase
                      if (reentryPhase >= 3) {
                        var oceanTop = HR * (0.85 - (reentryPhase >= 4 ? 0.15 : 0));
                        ctx.fillStyle = '#1e40af';
                        ctx.fillRect(0, oceanTop, W, HR - oceanTop);
                        // Waves
                        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
                        for (var wi = 0; wi < 5; wi++) {
                          ctx.beginPath();
                          ctx.moveTo(0, oceanTop + wi * 8 + 5);
                          for (var wx = 0; wx < W; wx += 10) {
                            ctx.lineTo(wx, oceanTop + wi * 8 + 5 + Math.sin(wx * 0.03 + tick * 0.02 + wi) * 3);
                          }
                          ctx.stroke();
                        }
                      }
                    }
                    // Capsule
                    var capX = W * 0.5;
                    ctx.fillStyle = '#cccccc';
                    ctx.beginPath();
                    ctx.moveTo(capX - 12, capsuleY + 10);
                    ctx.lineTo(capX, capsuleY - 10);
                    ctx.lineTo(capX + 12, capsuleY + 10);
                    ctx.closePath(); ctx.fill();
                    // Heat shield (bottom, glows during re-entry)
                    if (reentryPhase <= 1) {
                      var shieldGlow = Math.min(1, tick / 120);
                      ctx.fillStyle = 'rgb(' + Math.round(150 + shieldGlow * 105) + ',' + Math.round(50 + shieldGlow * 50) + ',0)';
                      ctx.fillRect(capX - 14, capsuleY + 10, 28, 4);
                    }
                    // Parachutes
                    if (reentryPhase >= 2) {
                      var chuteCount = reentryPhase >= 3 ? 3 : 2;
                      var chuteColor = reentryPhase >= 3 ? '#ef4444' : '#f59e0b';
                      for (var pi = 0; pi < chuteCount; pi++) {
                        var pxOff = (pi - (chuteCount - 1) / 2) * 25;
                        // Lines
                        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
                        ctx.beginPath(); ctx.moveTo(capX + pxOff - 15, capsuleY - 35 - pi * 5); ctx.lineTo(capX - 5, capsuleY - 8); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(capX + pxOff + 15, capsuleY - 35 - pi * 5); ctx.lineTo(capX + 5, capsuleY - 8); ctx.stroke();
                        // Canopy
                        ctx.fillStyle = chuteColor;
                        ctx.beginPath();
                        ctx.ellipse(capX + pxOff, capsuleY - 40 - pi * 5, 18, 10, 0, Math.PI, 0);
                        ctx.fill();
                        // Stripe
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.ellipse(capX + pxOff, capsuleY - 40 - pi * 5, 18, 3, 0, Math.PI, 0);
                        ctx.fill();
                      }
                    }
                    // Splash effect
                    if (reentryPhase >= 4) {
                      ctx.fillStyle = 'rgba(255,255,255,0.4)';
                      for (var spi = 0; spi < 10; spi++) {
                        var spx = capX + (Math.random() - 0.5) * 40;
                        var spy = capsuleY + 15 + Math.random() * 10;
                        ctx.beginPath(); ctx.arc(spx, spy, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
                      }
                    }
                    // Temperature HUD
                    if (reentryPhase <= 1) {
                      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8, HR - 40, 140, 32);
                      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                      ctx.fillStyle = '#ef4444'; ctx.fillText('HEAT SHIELD', 14, HR - 26);
                      var shieldTemp = Math.round(Math.min(2760, tick * 15));
                      ctx.fillStyle = shieldTemp > 2000 ? '#ef4444' : '#f59e0b';
                      ctx.font = 'bold 14px monospace';
                      ctx.fillText(shieldTemp + '\u00B0C', 14, HR - 12);
                    }
                    // Phase label
                    var phaseLabels = ['ATMOSPHERIC ENTRY', 'RADIO BLACKOUT', 'DROGUE CHUTES', 'MAIN CHUTES', 'SPLASHDOWN!'];
                    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui';
                    ctx.fillStyle = reentryPhase === 4 ? '#22c55e' : reentryPhase <= 1 ? '#f97316' : '#38bdf8';
                    ctx.fillText(phaseLabels[reentryPhase], W * 0.5, HR - 8);
                    // Comms
                    var reComms = ['CDR: "Getting warm in here..."', 'Houston: "...Apollo, do you read?... Apollo..."', 'Houston: "We see your chutes! Welcome back!"', 'CDR: "Main chutes look good!"', 'Houston: "SPLASHDOWN! Welcome home!"'];
                    ctx.globalAlpha = 0.6; ctx.font = 'italic 9px system-ui'; ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(reComms[reentryPhase], W * 0.5, 16);
                    ctx.globalAlpha = 1;
                    if (reentryPhase < 4) requestAnimationFrame(drawReentry);
                  }
                  drawReentry();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-orange-900/30' },
              h('p', { className: 'text-[10px] text-slate-400 mb-2' }, 'Watch the Command Module survive re-entry at 39,900 km/h through 2,760\u00B0C plasma, deploy parachutes, and splash down in the Pacific Ocean.'),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20' },
                h('p', { className: 'text-[9px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
              )
            )
          ),
          h('button', {
            'aria-label': 'Complete the mission with Pacific Ocean splashdown. Welcome home Commander!',
            onClick: function() {
              setPhase(10);
              log('\uD83C\uDF0A SPLASHDOWN! Mission complete.');
              addXP(50);
              if (addToast) addToast('\uD83C\uDF89 MISSION COMPLETE! Welcome home, Commander!', 'success');
              if (typeof announceToSR === 'function') announceToSR('Mission complete! Splashdown in the Pacific Ocean. Welcome home, Commander.');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg animate-pulse'
          }, '\uD83C\uDF0A Mission Complete \u2014 SPLASHDOWN!')
        ),

        // ═══ PHASE 10: MISSION COMPLETE ═══
        phase >= 10 && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-xl p-5 text-white text-center' },
            h('div', { className: 'text-5xl mb-2' }, '\uD83C\uDF1F'),
            h('h4', { className: 'text-xl font-black tracking-wide mb-1' }, 'MISSION COMPLETE'),
            h('p', { className: 'text-sm text-indigo-300 mb-3' }, 'Welcome home, Commander. The world celebrates.'),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4' },
              [
                ['\uD83D\uDE80', 'Launched', 'Saturn V'],
                ['\uD83C\uDF15', 'Landed', 'Sea of Tranquility'],
                ['\uD83E\uDEA8', 'Collected', (d.lunarSamples || []).length + ' samples']
              ].map(function(item) {
                return h('div', { key: item[0], className: 'bg-white/10 rounded-lg p-3' },
                  h('div', { className: 'text-2xl mb-1' }, item[0]),
                  h('p', { className: 'text-[10px] text-slate-400' }, item[1]),
                  h('p', { className: 'text-xs font-bold' }, item[2])
                );
              })
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 text-left mb-3' },
              h('p', { className: 'text-[10px] text-fuchsia-300 font-bold mb-1' }, '\uD83C\uDFC5 MISSION DEBRIEF'),
              h('div', { className: 'grid grid-cols-4 gap-2 mb-2' },
                [
                  ['\u2B50', (d.missionXP || 0) + ' XP', 'Total'],
                  ['\uD83E\uDEA8', (d.lunarSamples || []).length + '/' + LUNAR_SAMPLES_DATA.length, 'Samples'],
                  ['\uD83E\uDDE0', (d.quizCorrect || 0) + '/' + QUIZ_BANK.length, 'Quiz'],
                  ['\u23F1', getMissionElapsed(), 'Time']
                ].map(function(s) {
                  return h('div', { key: s[2], className: 'bg-white/5 rounded-lg p-1.5 text-center' },
                    h('div', { className: 'text-sm' }, s[0]),
                    h('p', { className: 'text-[10px] font-bold text-white' }, s[1]),
                    h('p', { className: 'text-[9px] text-slate-400' }, s[2])
                  );
                })
              ),
              // Badges earned
              h('p', { className: 'text-[9px] text-slate-500 font-bold mb-1' }, '\uD83C\uDFC5 BADGES EARNED:'),
              h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                BADGES.map(function(b) {
                  var earned = !!(d.earnedBadges || {})[b.id];
                  return h('div', { key: b.id, className: 'flex items-center gap-1 px-2 py-1 rounded-full text-[9px] ' + (earned ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-slate-600 border border-white/5'), title: b.desc },
                    h('span', null, earned ? b.icon : '\uD83D\uDD12'),
                    h('span', null, b.name)
                  );
                })
              ),
              // Sample gallery
              (d.lunarSamples || []).length > 0 && h('div', { className: 'mt-2' },
                h('p', { className: 'text-[9px] text-slate-500 font-bold mb-1.5' }, '\uD83E\uDEA8 LUNAR SAMPLE COLLECTION (' + (d.lunarSamples || []).length + '/' + LUNAR_SAMPLES_DATA.length + ')'),
                h('div', { className: 'grid grid-cols-2 gap-1.5' },
                  (d.lunarSamples || []).map(function(s, i) {
                    return h('div', { key: i, className: 'bg-white/10 rounded-lg p-2 border border-white/10' },
                      h('div', { className: 'flex items-center gap-1.5 mb-1' },
                        h('span', { className: 'text-lg' }, s.icon),
                        h('div', null,
                          h('p', { className: 'text-[10px] font-bold text-white' }, s.name),
                          h('p', { className: 'text-[9px] text-indigo-300' }, s.type)
                        )
                      ),
                      h('p', { className: 'text-[9px] text-slate-400 leading-relaxed' }, s.fact)
                    );
                  })
                ),
                // Collection completeness
                (d.lunarSamples || []).length >= LUNAR_SAMPLES_DATA.length && h('div', { className: 'mt-2 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 text-center' },
                  h('p', { className: 'text-[10px] font-bold text-amber-300' }, '\uD83C\uDFC6 COMPLETE COLLECTION! All ' + LUNAR_SAMPLES_DATA.length + ' samples recovered.'),
                  h('p', { className: 'text-[9px] text-amber-400' }, 'These samples will be studied by scientists for decades to come.')
                )
              )
            ),
            h('button', {
              'aria-label': 'Reset and start a new Moon mission from the beginning',
              onClick: function() {
                upd('missionPhase', 0);
                upd('missionLog', []);
                upd('missionXP', 0);
                upd('lunarSamples', []);
                upd('missionStartTime', 0);
                upd('earnedBadges', {});
                upd('quizCorrect', 0);
                upd('quizIdx', 0);
                upd('showQuiz', false);
                upd('quizAnswered', false);
              },
              className: 'px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
            }, '\uD83D\uDD04 Fly Another Mission')
          )
        ),

        // Mission Log (collapsible)
        missionLog.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-2 border border-slate-200' },
          h('p', { className: 'text-[9px] text-slate-500 font-bold mb-1' }, '\uD83D\uDCCB MISSION LOG (' + missionLog.length + ' entries)'),
          h('div', { className: 'space-y-0.5 max-h-32 overflow-y-auto' },
            missionLog.slice(-8).reverse().map(function(entry, i) {
              return h('div', { key: i, className: 'flex justify-between text-[9px]' },
                h('span', { className: 'text-slate-600' }, entry.text),
                h('span', { className: 'text-slate-400 font-mono' }, entry.time)
              );
            })
          )
        )
      );
    }
  });
})();
}
