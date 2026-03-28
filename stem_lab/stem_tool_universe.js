// ═══════════════════════════════════════════
// stem_tool_universe.js — Universe Time-Lapse v2.0
// Standalone enhanced module extracted from monolith (ES5)
// Features: 13.8 billion year cosmic timeline canvas, epoch info cards,
// quiz mode, sound effects, grade-band intro, AI tutor, TTS read-aloud,
// 10 badges, snapshot support
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (window.StemLab.isRegistered && window.StemLab.isRegistered('universe')) {
  // already registered — skip
} else {

(function() {
'use strict';

// ═══ SOUND EFFECTS ═══
var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}

function playTone(freq, dur, type, vol) {
  var ac = getAudioCtx(); if (!ac) return;
  try {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
  } catch(e) {}
}

function playSound(type) {
  switch(type) {
    case 'epochChange':
      // Two-tone chime when epoch changes
      playTone(523, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 90);
      break;
    case 'play':
      // Ascending note on play
      playTone(392, 0.08, 'triangle', 0.08);
      setTimeout(function() { playTone(523, 0.08, 'triangle', 0.1); }, 70);
      setTimeout(function() { playTone(659, 0.12, 'triangle', 0.12); }, 140);
      break;
    case 'stop':
      // Descending note on stop
      playTone(659, 0.08, 'triangle', 0.1);
      setTimeout(function() { playTone(440, 0.08, 'triangle', 0.08); }, 70);
      setTimeout(function() { playTone(330, 0.12, 'triangle', 0.06); }, 140);
      break;
    case 'quizCorrect':
      // Three-note ascending
      playTone(523, 0.1, 'sine', 0.12);
      setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
      break;
    case 'quizWrong':
      // Low buzz
      playTone(220, 0.25, 'sawtooth', 0.08);
      break;
    case 'badge':
      // Four-note fanfare
      playTone(523, 0.08, 'sine', 0.1);
      setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
      setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
      setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
      break;
    case 'snapshot':
      // Camera click sound
      playTone(1200, 0.03, 'square', 0.06);
      setTimeout(function() { playTone(800, 0.06, 'square', 0.04); }, 40);
      break;
    case 'bigBang':
      // Dramatic rumble + burst
      playTone(60, 0.5, 'sawtooth', 0.08);
      setTimeout(function() { playTone(120, 0.3, 'sawtooth', 0.06); }, 100);
      setTimeout(function() { playTone(200, 0.2, 'triangle', 0.08); }, 250);
      setTimeout(function() { playTone(400, 0.15, 'sine', 0.1); }, 400);
      setTimeout(function() { playTone(800, 0.1, 'sine', 0.12); }, 500);
      break;
  }
}

// ═══ BADGE DEFINITIONS ═══
var BADGES = [
  { id: 'bigBangWitness',    icon: '\uD83D\uDCA5', label: 'Big Bang Witness',    desc: 'Visit the Big Bang epoch' },
  { id: 'darkAgesExplorer',  icon: '\uD83C\uDF11', label: 'Dark Ages Explorer',  desc: 'Visit the Dark Ages' },
  { id: 'stargazer',         icon: '\u2B50',        label: 'Stargazer',           desc: 'Visit the First Stars epoch' },
  { id: 'galaxyHunter',      icon: '\uD83C\uDF0C', label: 'Galaxy Hunter',       desc: 'Visit the First Galaxies' },
  { id: 'homecoming',        icon: '\uD83C\uDF0D', label: 'Homecoming',          desc: 'Visit Present Day' },
  { id: 'futurist',          icon: '\uD83D\uDD2E', label: 'Futurist',            desc: 'Visit The Far Future' },
  { id: 'timelineComplete',  icon: '\uD83C\uDFC6', label: 'Timeline Complete',   desc: 'Visit all 9 epochs' },
  { id: 'quizMaster',        icon: '\uD83E\uDDE0', label: 'Quiz Master',         desc: 'Answer 5 quiz questions correctly' },
  { id: 'cosmicScholar',     icon: '\uD83D\uDCDA', label: 'Cosmic Scholar',      desc: 'Use the AI tutor 3 times' },
  { id: 'speedDemon',        icon: '\u26A1',        label: 'Speed Demon',         desc: 'Watch the full timeline at 5x speed' }
];

// ═══ HELPER FUNCTIONS ═══
function getGradeBand(ctx) {
  var gl = ctx.gradeLevel;
  if (!gl && gl !== 0) return 'g35';
  if (gl <= 2) return 'k2';
  if (gl <= 5) return 'g35';
  if (gl <= 8) return 'g68';
  return 'g912';
}

function getGradeIntro(band) {
  if (band === 'k2') return 'Watch the universe grow from a tiny spark to the stars we see at night!';
  if (band === 'g35') return 'Travel through 13.8 billion years of cosmic history \u2014 from the Big Bang to today!';
  if (band === 'g68') return 'Explore major cosmological epochs, from singularity to heat death, with real astrophysics data.';
  return 'Investigate inflationary cosmology, nucleosynthesis, reionization, and the thermodynamic fate of the universe.';
}

// ═══ QUIZ QUESTIONS ═══
var QUIZ_QUESTIONS = [
  {
    q: 'What happened in the first 10\u207B\u00B3\u00B2 seconds after the Big Bang?',
    choices: ['Stars formed', 'The universe underwent exponential inflation', 'Galaxies collided', 'The Moon formed'],
    answer: 1, epoch: 'The Big Bang'
  },
  {
    q: 'What is the Cosmic Microwave Background (CMB)?',
    choices: ['Radiation from the Sun', 'The oldest light in the universe, released during recombination', 'Radio waves from pulsars', 'Light from the first stars'],
    answer: 1, epoch: 'Recombination'
  },
  {
    q: 'Why are the Dark Ages called "dark"?',
    choices: ['Dark matter destroyed all light', 'No light sources existed \u2014 no stars had formed yet', 'The Sun had not been born', 'A giant black hole absorbed all photons'],
    answer: 1, epoch: 'The Dark Ages'
  },
  {
    q: 'What were Population III stars?',
    choices: ['Third-generation stars like our Sun', 'The first stars, made entirely of hydrogen and helium', 'Stars in the third galaxy to form', 'Artificial stars created by aliens'],
    answer: 1, epoch: 'First Stars (Cosmic Dawn)'
  },
  {
    q: 'What percentage of the universe is ordinary (visible) matter?',
    choices: ['About 50%', 'About 27%', 'About 5%', 'About 95%'],
    answer: 2, epoch: 'Present Day'
  },
  {
    q: 'What is a quasar?',
    choices: ['A type of planet', 'An extremely luminous object powered by a supermassive black hole', 'A dying star', 'A cosmic dust cloud'],
    answer: 1, epoch: 'First Galaxies'
  },
  {
    q: 'How many stars does the Milky Way contain?',
    choices: ['About 1 million', 'About 200\u2013400 billion', 'About 10 billion', 'About 2 trillion'],
    answer: 1, epoch: 'Milky Way Forms'
  },
  {
    q: 'What created the Moon?',
    choices: ['It was captured by Earth\u2019s gravity', 'A Mars-sized body (Theia) collided with Earth', 'It formed from the solar nebula independently', 'Jupiter flung it into Earth\u2019s orbit'],
    answer: 1, epoch: 'Our Sun is Born'
  },
  {
    q: 'What is "heat death"?',
    choices: ['The universe gets too hot', 'Maximum entropy \u2014 no usable energy remains', 'All stars explode at once', 'Dark matter heats up'],
    answer: 1, epoch: 'The Far Future'
  },
  {
    q: 'What ratio of hydrogen to helium was set during Big Bang nucleosynthesis?',
    choices: ['50% / 50%', '75% / 25% by mass', '90% / 10%', '99% / 1%'],
    answer: 1, epoch: 'The Big Bang'
  },
  {
    q: 'Who accidentally discovered the CMB in 1965?',
    choices: ['Hubble and Humason', 'Penzias and Wilson', 'Einstein and Bohr', 'Hawking and Penrose'],
    answer: 1, epoch: 'Recombination'
  },
  {
    q: 'What will happen to black holes in the far future?',
    choices: ['They grow forever', 'They slowly evaporate via Hawking radiation', 'They become stars', 'They merge into one universal black hole'],
    answer: 1, epoch: 'The Far Future'
  },
  {
    q: 'What is the cosmic web?',
    choices: ['The internet in space', 'A network of dark matter filaments connecting galaxy clusters', 'Spider-like alien structures', 'Magnetic field lines around Earth'],
    answer: 1, epoch: 'First Galaxies'
  },
  {
    q: 'How old is our Sun approximately?',
    choices: ['13.8 billion years', '4.6 billion years', '1 billion years', '10 billion years'],
    answer: 1, epoch: 'Our Sun is Born'
  },
  {
    q: 'What force shaped the Dark Ages by pulling matter into clumps?',
    choices: ['Electromagnetism', 'The strong nuclear force', 'Gravity (via dark matter)', 'Friction'],
    answer: 2, epoch: 'The Dark Ages'
  }
];

// ═══ REGISTER TOOL ═══
window.StemLab.registerTool('universe', {
  icon: '\uD83D\uDD2D',
  label: 'Universe Time-Lapse',
  desc: 'Explore 13.8 billion years of cosmic history',
  color: 'violet',
  category: 'science',
  render: function(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var labToolData = ctx.toolData;
    var setLabToolData = ctx.setToolData;
    var setStemLabTool = ctx.setStemLabTool;
    var toolSnapshots = ctx.toolSnapshots;
    var setToolSnapshots = ctx.setToolSnapshots;
    var addToast = ctx.addToast;
    var ArrowLeft = ctx.icons.ArrowLeft;
    var announceToSR = ctx.announceToSR;
    var awardStemXP = ctx.awardXP;
    var callGemini = ctx.callGemini;
    var callTTS = ctx.callTTS;

    if (!this._UniverseComponent) {
      this._UniverseComponent = function(props) {
        var ctx = props.ctx;
        var React = ctx.React;
        var h = React.createElement;
        var ArrowLeft = ctx.icons.ArrowLeft;
        var setStemLabTool = ctx.setStemLabTool;
        var addToast = ctx.addToast;
        var awardStemXP = ctx.awardXP;
        var announceToSR = ctx.announceToSR;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var setToolSnapshots = ctx.setToolSnapshots;

        // ── State via labToolData ──
        var ld = ctx.toolData || {};
        var d = ld.universe || {};
        var upd = function(key, val) {
          if (typeof ctx.setToolData === 'function') {
            ctx.setToolData(function(prev) {
              var u = Object.assign({}, (prev && prev.universe) || {});
              u[key] = val;
              return Object.assign({}, prev, { universe: u });
            });
          }
        };
        var updMulti = function(obj) {
          if (typeof ctx.setToolData === 'function') {
            ctx.setToolData(function(prev) {
              var u = Object.assign({}, (prev && prev.universe) || {}, obj);
              return Object.assign({}, prev, { universe: u });
            });
          }
        };

        // ── Grade band ──
        var band = getGradeBand(ctx);
        var introText = getGradeIntro(band);

        // ── State defaults ──
        var cosmicTime = d.cosmicTime !== undefined ? d.cosmicTime : 0;
        var isPlaying = d.isPlaying || false;
        var speed = d.speed || 1;
        var mode = d.mode || 'explore';
        var quizIdx = d.quizIdx || 0;
        var quizScore = d.quizScore || 0;
        var quizTotal = d.quizTotal || 0;
        var quizFeedback = d.quizFeedback || null;
        var badges = d.badges || {};
        var epochsVisited = d.epochsVisited || {};
        var aiQuestion = d.aiQuestion || '';
        var aiResponse = d.aiResponse || '';
        var aiLoading = d.aiLoading || false;
        var aiUseCount = d.aiUseCount || 0;
        var lastEpochName = d.lastEpochName || '';
        var fullTimelineAt5x = d.fullTimelineAt5x || false;

        // ── Cosmic epochs ──
        var EPOCHS = [
          {
            t: 0, name: 'The Big Bang', emoji: '\uD83D\uDCA5', color: '#1a0a00', border: '#f59e0b', sky: '#ffffff',
            temp: '10\u00B3\u00B2 K (infinite)', scale: 'Smaller than a proton',
            keyEvent: 'All four fundamental forces unified as one',
            desc: 'All matter, energy, space, and time erupt from an infinitely dense singularity in the most violent event in cosmic history. Within 10\u207B\u00B3\u00B2 seconds, the universe undergoes exponential inflation, expanding faster than light. Temperature: trillions upon trillions of degrees. The four fundamental forces (gravity, electromagnetism, strong & weak nuclear) separate within the first second. Quarks condense into protons and neutrons within 3 minutes.',
            facts: [
              'The entire observable universe was smaller than a subatomic particle',
              'Temperature exceeded 10 trillion degrees Celsius',
              'Matter and antimatter annihilated in almost equal amounts \u2014 a tiny surplus of matter (1 in a billion) is everything we see today',
              'Inflation expanded the universe by a factor of 10\u00B2\u2076 in 10\u207B\u00B3\u00B2 seconds',
              'Within 3 minutes, protons and neutrons fused into the first atomic nuclei (hydrogen, helium, tiny amounts of lithium)',
              'This is called Big Bang Nucleosynthesis \u2014 it set the universe\'s H/He ratio at roughly 75%/25% by mass'
            ]
          },
          {
            t: 0.38, name: 'Recombination', emoji: '\uD83C\uDF1F', color: '#1a1000', border: '#eab308', sky: '#ff6b35',
            temp: '~3,000 K', scale: '~1,000x smaller than today',
            keyEvent: 'Light breaks free \u2014 the universe becomes transparent',
            desc: 'The universe cools enough for electrons to bind with protons, forming the first neutral atoms (mostly hydrogen and helium). For the first time, photons can travel freely without scattering off charged particles. This released light is the Cosmic Microwave Background (CMB) \u2014 the oldest light in the universe, still detectable today at 2.725 K after being stretched by 13.8 billion years of expansion.',
            facts: [
              'This occurred ~380,000 years after the Big Bang',
              'The CMB was accidentally discovered in 1965 by Penzias and Wilson, earning them a Nobel Prize',
              'The CMB has been redshifted from ~3,000 K to 2.725 K by cosmic expansion',
              'Tiny temperature fluctuations in the CMB (1 part in 100,000) are the seeds of all cosmic structure',
              'The universe went from an opaque plasma to transparent gas in a geologically brief period',
              'COBE, WMAP, and Planck satellites mapped the CMB with increasing precision'
            ]
          },
          {
            t: 0.4, name: 'The Dark Ages', emoji: '\uD83C\uDF11', color: '#08061a', border: '#4338ca', sky: '#0a0a1a',
            temp: '60 K \u2192 ~20 K', scale: 'Expanding but starless',
            keyEvent: 'Total cosmic darkness \u2014 no light sources exist',
            desc: 'The most silent era in cosmic history. No stars, no galaxies, no light. The universe is filled with cold neutral hydrogen gas in absolute darkness. Yet gravity is silently at work: dark matter filaments pull ordinary matter into denser clumps, building the scaffolding for everything to come. This era ends when the first stars ignite.',
            facts: [
              'Lasted roughly 100\u2013200 million years',
              'Dark matter formed a vast cosmic web of filaments and nodes',
              'Ordinary matter fell into dark matter gravitational wells, seeding future galaxies',
              'The 21-cm hydrogen line may let future radio telescopes observe this era directly',
              'No electromagnetic radiation was produced \u2014 only gravitational interactions',
              'This is the least understood era in cosmology \u2014 no direct observations exist yet'
            ]
          },
          {
            t: 0.5, name: 'First Stars (Cosmic Dawn)', emoji: '\u2B50', color: '#0a1020', border: '#3b82f6', sky: '#0a1628',
            temp: '~15 K (gas) / millions K (star cores)', scale: 'First light in 200 million years',
            keyEvent: 'Population III stars ignite \u2014 cosmic reionization begins',
            desc: 'The first stars ignite in the darkness \u2014 Population III stars, composed entirely of hydrogen and helium. These primordial giants were 100\u20131,000 times more massive than our Sun, blazing blue-white and living only a few million years before exploding as hypernovae. Their deaths forged the first heavy elements (carbon, oxygen, iron, gold) and scattered them across space, enriching the gas for future generations of stars. Their UV radiation began reionizing the neutral hydrogen, ending the Dark Ages.',
            facts: [
              'Population III stars have never been directly observed \u2014 they are predicted by models',
              'They were made of pure hydrogen and helium (zero metals)',
              'Their surface temperatures exceeded 100,000 K \u2014 far hotter than our Sun\'s 5,778 K',
              'Some may have collapsed directly into black holes without supernovae',
              'Their supernovae created the first carbon, oxygen, silicon, and iron in the universe',
              'The James Webb Space Telescope is actively searching for evidence of these first stars'
            ]
          },
          {
            t: 1.0, name: 'First Galaxies', emoji: '\uD83C\uDF0C', color: '#0c0a20', border: '#6366f1', sky: '#0f0f2e',
            temp: 'Varied (millions K in quasars)', scale: 'Protogalaxies: ~1,000 light-years',
            keyEvent: 'Supermassive black holes form \u2014 quasars blaze',
            desc: 'Gravity pulls gas and dark matter into the first protogalaxies \u2014 small, chaotic, intensely star-forming clumps. Supermassive black holes form at their centers, devouring surrounding gas and shining as quasars \u2014 the most luminous objects in the universe. The cosmic web of dark matter filaments connects galaxy clusters with bridges of gas spanning millions of light-years. Galaxy mergers are violent and frequent.',
            facts: [
              'The first galaxies were 100x smaller than the Milky Way',
              'Quasars can outshine their entire host galaxy by 100x',
              'JWST discovered galaxies existing just 300 million years after the Big Bang \u2014 earlier than expected',
              'Supermassive black holes grew to billions of solar masses surprisingly quickly',
              'The cosmic web structure is like a sponge \u2014 galaxies along filaments, voids between them',
              'Reionization completed around this time \u2014 the universe became fully transparent again'
            ]
          },
          {
            t: 4.6, name: 'Milky Way Forms', emoji: '\uD83C\uDF00', color: '#0d0a22', border: '#8b5cf6', sky: '#0d0d2a',
            temp: 'Cold gas clouds (~10 K) to hot stellar cores', scale: '100,000 light-years across',
            keyEvent: 'Our home galaxy assembles through hierarchical merging',
            desc: 'Our Milky Way galaxy assembles over billions of years by merging with dozens of smaller galaxies. A central bar forms, majestic spiral arms develop, and 200\u2013400 billion stars settle into orbits around a supermassive black hole (Sagittarius A*, 4 million solar masses). The galactic disk, halo, and bulge take shape. Heavy elements from generations of stellar deaths accumulate, making rocky planets possible.',
            facts: [
              'The Milky Way consumed the Gaia-Enceladus dwarf galaxy ~10 billion years ago',
              'Our galaxy contains 200\u2013400 billion stars and at least 100 billion planets',
              'The central black hole (Sgr A*) has 4 million times the Sun\'s mass',
              'The galaxy is ~13.6 billion years old, nearly as old as the universe itself',
              'The Milky Way\'s spiral arms are density waves, not permanent structures',
              'Our galaxy will collide with Andromeda in ~4.5 billion years (Milkomeda)'
            ]
          },
          {
            t: 9.2, name: 'Our Sun is Born', emoji: '\u2600\uFE0F', color: '#1a1520', border: '#f59e0b', sky: '#1a1a35',
            temp: '15 million K (core) / 5,778 K (surface)', scale: 'Solar System: ~9 billion km across',
            keyEvent: 'A molecular cloud collapses \u2014 our Solar System forms',
            desc: 'A molecular cloud in the Orion Arm collapses \u2014 possibly triggered by a nearby supernova shockwave. Our Sun ignites as a main-sequence G2V star. The remaining disk of gas and dust coalesces into 8 planets, dwarf planets, asteroids, and comets. Within 100 million years, Earth forms and is struck by a Mars-sized body (Theia), creating the Moon. Within a billion years, the first microbial life appears in Earth\'s oceans.',
            facts: [
              'Our Sun is a 3rd-generation star: it contains elements forged in at least two previous stellar generations',
              'The Solar System formed 4.6 billion years ago from a collapsing molecular cloud',
              'The Moon formed from the debris of a giant impact with proto-Earth (the Theia hypothesis)',
              'Jupiter\'s gravity sculpted the asteroid belt and protected inner planets from bombardment',
              'Earth\'s magnetic field, generated by its molten iron core, shields life from solar radiation',
              'The oldest confirmed microfossils on Earth are ~3.5 billion years old'
            ]
          },
          {
            t: 13.0, name: 'Present Day', emoji: '\uD83C\uDF0D', color: '#0a1518', border: '#10b981', sky: '#0a0a28',
            temp: '2.725 K (CMB background) / 5,778 K (Sun)', scale: 'Observable universe: 93 billion light-years',
            keyEvent: 'Humanity reaches space \u2014 the universe accelerates',
            desc: 'The universe is 13.8 billion years old. Humans have walked on the Moon, landed rovers on Mars, sent Voyager beyond the Solar System, detected gravitational waves from colliding black holes, and photographed a black hole\'s shadow. The James Webb Space Telescope peers back to the first galaxies. Meanwhile, dark energy is accelerating the expansion of the universe \u2014 galaxies beyond our Local Group are receding ever faster.',
            facts: [
              'The observable universe contains roughly 2 trillion galaxies',
              'Dark energy (68%), dark matter (27%), and ordinary matter (5%) make up the cosmic budget',
              'JWST observes galaxies from 13.4+ billion years ago in infrared light',
              'Gravitational waves were first detected in 2015 by LIGO (Nobel Prize 2017)',
              'We have discovered 5,500+ confirmed exoplanets, including potentially habitable ones',
              'Voyager 1, launched in 1977, is over 24 billion km from Earth \u2014 in interstellar space'
            ]
          },
          {
            t: 13.8, name: 'The Far Future', emoji: '\uD83D\uDD2E', color: '#060610', border: '#6366f1', sky: '#050510',
            temp: 'Approaching absolute zero', scale: 'Expanding toward infinity',
            keyEvent: 'Heat death \u2014 maximum entropy, eternal darkness',
            desc: 'Stars exhaust their nuclear fuel one by one. Red dwarfs \u2014 the longest-lived stars \u2014 will be the last to shine, burning for up to 10 trillion years. After that: white dwarfs cool to black dwarfs, neutron stars fade, and even black holes slowly evaporate through Hawking radiation over 10\u00B9\u2070\u2070 years. The universe reaches maximum entropy \u2014 no temperature gradients, no usable energy, no structure. An eternal, featureless void.',
            facts: [
              'In ~5 billion years, the Sun will exhaust its hydrogen and swell into a red giant',
              'The last stars (red dwarfs) will burn out in ~100 trillion years',
              'Proton decay (if it occurs) would dissolve all remaining matter over 10\u00B3\u2077 years',
              'Black holes will evaporate via Hawking radiation \u2014 the last ones in 10\u00B9\u2070\u2070 years',
              'Heat death means no thermodynamic free energy \u2014 nothing can happen, ever again',
              'Some theories propose quantum tunneling could spontaneously create a new Big Bang after unimaginable timescales'
            ]
          }
        ];

        function getCurrentEpoch(t) {
          for (var i = EPOCHS.length - 1; i >= 0; i--) {
            if (t >= EPOCHS[i].t) return EPOCHS[i];
          }
          return EPOCHS[0];
        }

        var epoch = getCurrentEpoch(cosmicTime);

        // ── Badge check function ──
        function checkBadges(newEpochsVisited, newQuizScore, newAiUseCount, newFullAt5x) {
          var ev = newEpochsVisited || epochsVisited;
          var qs = newQuizScore !== undefined ? newQuizScore : quizScore;
          var auc = newAiUseCount !== undefined ? newAiUseCount : aiUseCount;
          var f5 = newFullAt5x !== undefined ? newFullAt5x : fullTimelineAt5x;
          var newBadges = Object.assign({}, badges);
          var changed = false;

          function award(id) {
            if (!newBadges[id]) {
              newBadges[id] = true;
              changed = true;
              playSound('badge');
              if (addToast) {
                var b = null;
                for (var bi = 0; bi < BADGES.length; bi++) {
                  if (BADGES[bi].id === id) { b = BADGES[bi]; break; }
                }
                if (b) addToast(b.icon + ' Badge earned: ' + b.label + '!', 'success');
              }
              if (awardStemXP) awardStemXP('universe_badge_' + id, 15, 'Earned badge: ' + id);
            }
          }

          if (ev['The Big Bang']) award('bigBangWitness');
          if (ev['The Dark Ages']) award('darkAgesExplorer');
          if (ev['First Stars (Cosmic Dawn)']) award('stargazer');
          if (ev['First Galaxies']) award('galaxyHunter');
          if (ev['Present Day']) award('homecoming');
          if (ev['The Far Future']) award('futurist');

          // Check if all 9 epochs visited
          var allVisited = true;
          for (var ei = 0; ei < EPOCHS.length; ei++) {
            if (!ev[EPOCHS[ei].name]) { allVisited = false; break; }
          }
          if (allVisited) award('timelineComplete');

          if (qs >= 5) award('quizMaster');
          if (auc >= 3) award('cosmicScholar');
          if (f5) award('speedDemon');

          if (changed) {
            upd('badges', newBadges);
          }
          return newBadges;
        }

        // ── Epoch change sound ──
        if (epoch.name !== lastEpochName && lastEpochName !== '') {
          playSound('epochChange');
          if (epoch.name === 'The Big Bang' && cosmicTime < 0.01) {
            playSound('bigBang');
          }
        }
        if (epoch.name !== lastEpochName) {
          upd('lastEpochName', epoch.name);
        }

        // ── Visit epoch tracking ──
        function visitEpoch(epName) {
          var newVisited = Object.assign({}, epochsVisited);
          if (!newVisited[epName]) {
            newVisited[epName] = true;
            upd('epochsVisited', newVisited);
            checkBadges(newVisited, undefined, undefined, undefined);
          }
        }

        // ── Canvas visualization ──
        var canvasRefCb = function(canvasEl) {
          if (!canvasEl || canvasEl._universeInit) return;
          canvasEl._universeInit = true;

          var dpr = window.devicePixelRatio || 1;
          var ow = canvasEl.offsetWidth, oh = canvasEl.offsetHeight;

          // Guard: if canvas has no layout yet, defer init
          if (!ow || !oh) {
            canvasEl._universeInit = false;
            requestAnimationFrame(function() { canvasRefCb(canvasEl); });
            return;
          }

          var W = canvasEl.width = ow * dpr;
          var H = canvasEl.height = oh * dpr;
          var cx2d = canvasEl.getContext('2d');

          // roundRect polyfill for older browsers
          if (!cx2d.roundRect) {
            cx2d.roundRect = function(x, y, w, hh, r) {
              if (typeof r === 'number') r = [r, r, r, r];
              cx2d.moveTo(x + r[0], y);
              cx2d.lineTo(x + w - r[1], y);
              cx2d.arcTo(x + w, y, x + w, y + r[1], r[1]);
              cx2d.lineTo(x + w, y + hh - r[2]);
              cx2d.arcTo(x + w, y + hh, x + w - r[2], y + hh, r[2]);
              cx2d.lineTo(x + r[3], y + hh);
              cx2d.arcTo(x, y + hh, x, y + hh - r[3], r[3]);
              cx2d.lineTo(x, y + r[0]);
              cx2d.arcTo(x, y, x + r[0], y, r[0]);
              cx2d.closePath();
            };
          }

          var tick = 0;

          // 400 star particles
          var particles = [];
          for (var i = 0; i < 400; i++) {
            particles.push({
              x: Math.random() * W,
              y: Math.random() * H,
              s: Math.random() * 2 + 0.5,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              c: Math.random(),
              age: Math.random() * 100
            });
          }

          // 120 plasma particles for Big Bang
          var plasmaParticles = [];
          for (var pp = 0; pp < 120; pp++) {
            var angle = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 3;
            plasmaParticles.push({
              angle: angle,
              speed: spd,
              dist: 0,
              size: 1 + Math.random() * 3,
              hue: Math.random() * 60,
              life: 0.5 + Math.random() * 0.5
            });
          }

          // 8 nebula clouds
          var nebulae = [];
          for (var ni = 0; ni < 8; ni++) {
            nebulae.push({
              x: Math.random(),
              y: Math.random(),
              size: 0.05 + Math.random() * 0.08,
              hue: ni % 4 === 0 ? '200,100,255' : ni % 4 === 1 ? '100,180,255' : ni % 4 === 2 ? '255,150,100' : '150,255,200',
              phase: Math.random() * Math.PI * 2
            });
          }

          function draw() {
            try {
              tick++;
              var t = parseFloat(canvasEl.dataset.time || '0');
              var ep = getCurrentEpoch(t);
              cx2d.clearRect(0, 0, W, H);
              var cx = W / 2, cy = H / 2;

              // ── Sky gradient (era-specific) ──
              var skyGrad = cx2d.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);

              if (t < 0.05) {
                // Singularity: blinding white core
                var intensity = Math.max(0, 1 - t / 0.05);
                skyGrad.addColorStop(0, 'rgba(255,255,255,' + intensity + ')');
                skyGrad.addColorStop(0.15, 'rgba(255,240,180,' + (intensity * 0.9) + ')');
                skyGrad.addColorStop(0.4, 'rgba(255,160,50,' + (intensity * 0.6) + ')');
                skyGrad.addColorStop(0.7, 'rgba(200,50,0,' + (intensity * 0.3) + ')');
                skyGrad.addColorStop(1, 'rgba(10,5,20,1)');
              } else if (t < 0.2) {
                // Post-bang: fiery orange fading
                var cool = (t - 0.05) / 0.15;
                skyGrad.addColorStop(0, 'rgba(255,' + Math.round(200 - cool * 150) + ',' + Math.round(100 - cool * 80) + ',' + (0.8 - cool * 0.6) + ')');
                skyGrad.addColorStop(0.3, 'rgba(180,' + Math.round(80 - cool * 60) + ',20,' + (0.4 - cool * 0.3) + ')');
                skyGrad.addColorStop(1, 'rgba(10,8,25,1)');
              } else if (t < 0.4) {
                // Dark Ages: deep indigo-black
                skyGrad.addColorStop(0, '#0c0a18');
                skyGrad.addColorStop(0.5, '#060414');
                skyGrad.addColorStop(1, '#020210');
              } else if (t < 1.0) {
                // First stars: hints of blue
                var starGlow = (t - 0.4) / 0.6;
                skyGrad.addColorStop(0, 'rgba(15,15,' + Math.round(40 + starGlow * 15) + ',1)');
                skyGrad.addColorStop(1, 'rgba(5,5,' + Math.round(15 + starGlow * 5) + ',1)');
              } else {
                // Galaxy era onward: deep cosmic blue-black
                skyGrad.addColorStop(0, '#0d0d28');
                skyGrad.addColorStop(0.6, '#080818');
                skyGrad.addColorStop(1, '#040410');
              }

              cx2d.fillStyle = skyGrad;
              cx2d.fillRect(0, 0, W, H);

              // ── Big Bang: expanding shockwave rings ──
              if (t < 0.3) {
                var bangPhase = t / 0.3;

                // Multiple expanding rings
                for (var ri = 0; ri < 5; ri++) {
                  var ringT = bangPhase - ri * 0.15;
                  if (ringT > 0 && ringT < 1) {
                    var ringR = ringT * W * 0.55;
                    var ringAlpha = (1 - ringT) * 0.6;
                    cx2d.beginPath();
                    cx2d.arc(cx, cy, ringR, 0, Math.PI * 2);
                    cx2d.strokeStyle = 'rgba(255,' + Math.round(200 - ri * 30) + ',' + Math.round(100 - ri * 20) + ',' + ringAlpha + ')';
                    cx2d.lineWidth = (3 - ri * 0.4) * dpr;
                    cx2d.stroke();
                  }
                }

                // Central plasma fireball
                var fireR = Math.min(bangPhase * 0.4, 0.35) * W;
                var fireGrad = cx2d.createRadialGradient(cx, cy, 0, cx, cy, fireR);
                var coreAlpha = Math.max(0, 1 - bangPhase * 1.5);
                fireGrad.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, coreAlpha + 0.3) + ')');
                fireGrad.addColorStop(0.2, 'rgba(255,255,200,' + coreAlpha + ')');
                fireGrad.addColorStop(0.4, 'rgba(255,200,80,' + (coreAlpha * 0.7) + ')');
                fireGrad.addColorStop(0.7, 'rgba(255,100,20,' + (coreAlpha * 0.4) + ')');
                fireGrad.addColorStop(1, 'rgba(200,30,0,0)');
                cx2d.beginPath();
                cx2d.arc(cx, cy, fireR, 0, Math.PI * 2);
                cx2d.fillStyle = fireGrad;
                cx2d.fill();

                // Expanding plasma particles flying outward
                for (var ppi = 0; ppi < plasmaParticles.length; ppi++) {
                  var pp2 = plasmaParticles[ppi];
                  var ppDist = bangPhase * pp2.speed * W * 0.3;
                  if (ppDist > W * 0.7) continue;
                  var ppAlpha = Math.max(0, (1 - bangPhase) * pp2.life);
                  var ppx = cx + Math.cos(pp2.angle) * ppDist;
                  var ppy = cy + Math.sin(pp2.angle) * ppDist;
                  var ppSize = pp2.size * dpr * (1 - bangPhase * 0.5);
                  cx2d.beginPath();
                  cx2d.arc(ppx, ppy, ppSize, 0, Math.PI * 2);
                  cx2d.fillStyle = 'rgba(255,' + Math.round(200 + pp2.hue) + ',' + Math.round(100 + pp2.hue * 0.5) + ',' + ppAlpha + ')';
                  cx2d.fill();
                }
              }

              // ── CMB glow (recombination era: 0.15-1.0) ──
              if (t > 0.15 && t < 1.0) {
                var cmbPhase = (t - 0.15) / 0.85;
                var cmbAlpha = Math.max(0, 0.35 * (1 - cmbPhase));

                // Mottled CMB pattern (simulated)
                for (var cmi = 0; cmi < 20; cmi++) {
                  var cmx = ((cmi * 173 + 37) % (W / dpr)) * dpr;
                  var cmy = ((cmi * 131 + 19) % (H / dpr)) * dpr;
                  var cms = (15 + cmi * 7 % 20) * dpr;
                  var cmGrad = cx2d.createRadialGradient(cmx, cmy, 0, cmx, cmy, cms);
                  var warmth = cmi % 2 === 0 ? '255,200,120' : '255,160,80';
                  cmGrad.addColorStop(0, 'rgba(' + warmth + ',' + (cmbAlpha * 0.5) + ')');
                  cmGrad.addColorStop(1, 'rgba(' + warmth + ',0)');
                  cx2d.beginPath();
                  cx2d.arc(cmx, cmy, cms, 0, Math.PI * 2);
                  cx2d.fillStyle = cmGrad;
                  cx2d.fill();
                }
              }

              // ── Stars (appear after Dark Ages) ──
              var starBrightness = t < 0.4 ? 0 : Math.min(1, (t - 0.4) / 0.8);
              var starCount = Math.min(particles.length, Math.floor(starBrightness * particles.length));

              for (var pi = 0; pi < starCount; pi++) {
                var p = particles[pi];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;

                var twinkle = 0.5 + 0.5 * Math.sin(tick * 0.03 + pi * 1.7);

                // Star color varies by era
                var hue;
                if (t < 1) hue = '180,200,255'; // early: blue-white Population III
                else if (p.c < 0.3) hue = '255,200,150'; // warm yellow
                else if (p.c < 0.6) hue = '200,210,255'; // cool blue
                else if (p.c < 0.85) hue = '255,240,220'; // white
                else hue = '255,160,120'; // red giant

                cx2d.beginPath();
                cx2d.arc(p.x, p.y, p.s * dpr * twinkle, 0, Math.PI * 2);
                cx2d.fillStyle = 'rgba(' + hue + ',' + (starBrightness * twinkle * 0.85) + ')';
                cx2d.fill();

                // Glow around bright stars
                if (p.s > 1.8 && twinkle > 0.7) {
                  var glow = cx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * dpr * 3);
                  glow.addColorStop(0, 'rgba(' + hue + ',' + (twinkle * 0.15) + ')');
                  glow.addColorStop(1, 'rgba(' + hue + ',0)');
                  cx2d.beginPath();
                  cx2d.arc(p.x, p.y, p.s * dpr * 3, 0, Math.PI * 2);
                  cx2d.fillStyle = glow;
                  cx2d.fill();
                }
              }

              // ── Nebulae (after t > 2 Gyr, star-forming regions) ──
              if (t > 2) {
                var nebAlpha = Math.min(0.3, (t - 2) * 0.03);
                for (var nbi = 0; nbi < nebulae.length; nbi++) {
                  var nb = nebulae[nbi];
                  var nbx = nb.x * W, nby = nb.y * H;
                  var nbSize = nb.size * W * (1 + 0.1 * Math.sin(tick * 0.01 + nb.phase));
                  var nbGrad = cx2d.createRadialGradient(nbx, nby, 0, nbx, nby, nbSize);
                  nbGrad.addColorStop(0, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.6) + ')');
                  nbGrad.addColorStop(0.4, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.3) + ')');
                  nbGrad.addColorStop(1, 'rgba(' + nb.hue + ',0)');
                  cx2d.beginPath();
                  cx2d.arc(nbx, nby, nbSize, 0, Math.PI * 2);
                  cx2d.fillStyle = nbGrad;
                  cx2d.fill();
                }
              }

              // ── Galaxies (after t > 1 Gyr) with spiral hints ──
              if (t > 1) {
                var galaxyCount = Math.min(16, Math.floor((t - 1) * 2.5));
                for (var gi = 0; gi < galaxyCount; gi++) {
                  var gx = ((gi * 137 + 50) % (W / dpr)) * dpr;
                  var gy = ((gi * 97 + 30) % (H / dpr)) * dpr;
                  var gs = (10 + gi % 6 * 5) * dpr;

                  // Core glow
                  var galGrad = cx2d.createRadialGradient(gx, gy, 0, gx, gy, gs);
                  var galHue = gi % 4 === 0 ? '180,160,255' : gi % 4 === 1 ? '255,200,150' : gi % 4 === 2 ? '150,200,255' : '255,220,180';
                  galGrad.addColorStop(0, 'rgba(' + galHue + ',0.5)');
                  galGrad.addColorStop(0.3, 'rgba(' + galHue + ',0.2)');
                  galGrad.addColorStop(0.7, 'rgba(' + galHue + ',0.05)');
                  galGrad.addColorStop(1, 'rgba(' + galHue + ',0)');
                  cx2d.beginPath();
                  cx2d.arc(gx, gy, gs, 0, Math.PI * 2);
                  cx2d.fillStyle = galGrad;
                  cx2d.fill();

                  // Spiral arm hints for larger galaxies
                  if (gs > 12 * dpr && t > 3) {
                    cx2d.save();
                    cx2d.translate(gx, gy);
                    cx2d.rotate(gi * 1.3 + tick * 0.001);
                    cx2d.globalAlpha = 0.15;
                    cx2d.beginPath();
                    for (var sa = 0; sa < Math.PI * 4; sa += 0.1) {
                      var sr = sa * gs * 0.08;
                      cx2d.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
                    }
                    cx2d.strokeStyle = 'rgba(' + galHue + ',0.3)';
                    cx2d.lineWidth = 1.5 * dpr;
                    cx2d.stroke();
                    cx2d.globalAlpha = 1;
                    cx2d.restore();
                  }
                }
              }

              // ── Cosmic Web Filaments (dark matter structure, t > 2) ──
              if (t > 2) {
                var filAlpha = Math.min(0.12, (t - 2) * 0.01);
                var filGalCount = Math.min(16, Math.floor((t - 1) * 2.5));
                cx2d.save();
                cx2d.globalAlpha = filAlpha;
                cx2d.lineWidth = 1.2 * dpr;

                for (var fi = 0; fi < filGalCount; fi++) {
                  var fx1 = ((fi * 137 + 50) % (W / dpr)) * dpr;
                  var fy1 = ((fi * 97 + 30) % (H / dpr)) * dpr;

                  // Connect to 2 nearest neighbors
                  for (var fj = fi + 1; fj < Math.min(fi + 3, filGalCount); fj++) {
                    var fx2 = ((fj * 137 + 50) % (W / dpr)) * dpr;
                    var fy2 = ((fj * 97 + 30) % (H / dpr)) * dpr;
                    var fDist = Math.sqrt((fx2 - fx1) * (fx2 - fx1) + (fy2 - fy1) * (fy2 - fy1));
                    if (fDist > W * 0.6) continue;

                    // Curved filament with glow
                    var fmx = (fx1 + fx2) / 2 + Math.sin(fi * 2.3 + tick * 0.002) * 20;
                    var fmy = (fy1 + fy2) / 2 + Math.cos(fj * 1.7 + tick * 0.002) * 20;
                    var filGrad = cx2d.createLinearGradient(fx1, fy1, fx2, fy2);
                    filGrad.addColorStop(0, 'rgba(100,120,200,0)');
                    filGrad.addColorStop(0.3, 'rgba(120,140,220,' + (filAlpha * 2) + ')');
                    filGrad.addColorStop(0.7, 'rgba(120,140,220,' + (filAlpha * 2) + ')');
                    filGrad.addColorStop(1, 'rgba(100,120,200,0)');

                    cx2d.beginPath();
                    cx2d.moveTo(fx1, fy1);
                    cx2d.quadraticCurveTo(fmx, fmy, fx2, fy2);
                    cx2d.strokeStyle = filGrad;
                    cx2d.stroke();
                  }
                }
                cx2d.restore();
              }

              // ── Dark Matter Halos (subtle glow behind galaxies) ──
              if (t > 1.5) {
                var dmGalCount = Math.min(16, Math.floor((t - 1) * 2.5));
                cx2d.save();
                for (var dmi = 0; dmi < dmGalCount; dmi++) {
                  var dmx = ((dmi * 137 + 50) % (W / dpr)) * dpr;
                  var dmy = ((dmi * 97 + 30) % (H / dpr)) * dpr;
                  var dms = (10 + dmi % 6 * 5) * dpr;
                  var dmHaloR = dms * 2.2;
                  var dmAlpha = Math.min(0.06, (t - 1.5) * 0.01);
                  var dmGrad = cx2d.createRadialGradient(dmx, dmy, dms * 0.3, dmx, dmy, dmHaloR);
                  dmGrad.addColorStop(0, 'rgba(80,60,180,' + dmAlpha + ')');
                  dmGrad.addColorStop(0.5, 'rgba(60,40,160,' + (dmAlpha * 0.5) + ')');
                  dmGrad.addColorStop(1, 'rgba(40,20,140,0)');
                  cx2d.beginPath();
                  cx2d.arc(dmx, dmy, dmHaloR, 0, Math.PI * 2);
                  cx2d.fillStyle = dmGrad;
                  cx2d.fill();
                }
                cx2d.restore();
              }

              // ── Shooting Stars / Meteor Streaks (after t > 9, Solar System era) ──
              if (t > 9) {
                cx2d.save();
                var meteorSeed = Math.floor(tick / 80);
                var meteorPhase = (tick % 80) / 80;

                for (var mti = 0; mti < 2; mti++) {
                  var mtHash = (meteorSeed * 73 + mti * 41) % 1000;
                  if (mtHash > 300) continue; // Only ~30% chance per slot

                  var mtx1 = (mtHash * 7 % (W / dpr)) * dpr;
                  var mty1 = (mtHash * 3 % Math.floor(H * 0.5 / dpr)) * dpr;
                  var mtAngle = 0.3 + (mtHash % 5) * 0.15;
                  var mtLen = (40 + mtHash % 60) * dpr;
                  var mtx2 = mtx1 + Math.cos(mtAngle) * mtLen * meteorPhase;
                  var mty2 = mty1 + Math.sin(mtAngle) * mtLen * meteorPhase;
                  var mtAlpha = meteorPhase < 0.3 ? meteorPhase / 0.3 : (1 - meteorPhase) / 0.7;
                  mtAlpha *= 0.7;

                  cx2d.globalAlpha = mtAlpha;
                  var mtGrad = cx2d.createLinearGradient(mtx1, mty1, mtx2, mty2);
                  mtGrad.addColorStop(0, 'rgba(255,255,255,0)');
                  mtGrad.addColorStop(0.6, 'rgba(255,240,200,' + mtAlpha + ')');
                  mtGrad.addColorStop(1, 'rgba(255,255,255,' + mtAlpha + ')');
                  cx2d.beginPath();
                  cx2d.moveTo(mtx1, mty1);
                  cx2d.lineTo(mtx2, mty2);
                  cx2d.strokeStyle = mtGrad;
                  cx2d.lineWidth = 1.5 * dpr;
                  cx2d.stroke();

                  // Bright head
                  cx2d.beginPath();
                  cx2d.arc(mtx2, mty2, 2 * dpr, 0, Math.PI * 2);
                  cx2d.fillStyle = 'rgba(255,255,240,' + (mtAlpha * 0.8) + ')';
                  cx2d.fill();
                }
                cx2d.globalAlpha = 1;
                cx2d.restore();
              }

              // ── Protoplanetary Disk (near Sun formation, t ~ 8.5-10) ──
              if (t > 8.5 && t < 10) {
                var ppAlpha2 = t < 9.0 ? (t - 8.5) / 0.5 : t > 9.5 ? Math.max(0, 1 - (t - 9.5) / 0.5) : 1;
                ppAlpha2 *= 0.6;
                var ppx2 = W * 0.78, ppy2 = H * 0.25;

                cx2d.save();
                cx2d.translate(ppx2, ppy2);
                cx2d.rotate(tick * 0.003);
                cx2d.globalAlpha = ppAlpha2;

                // Concentric dust rings
                var ppRings = [
                  { r: 18, w: 4, color: '255,200,100' },
                  { r: 26, w: 3, color: '220,170,80' },
                  { r: 34, w: 5, color: '180,140,70' },
                  { r: 44, w: 3, color: '140,120,80' }
                ];

                for (var pri = 0; pri < ppRings.length; pri++) {
                  var ppr = ppRings[pri];
                  var rr = ppr.r * dpr;
                  cx2d.beginPath();
                  cx2d.ellipse(0, 0, rr, rr * 0.3, 0, 0, Math.PI * 2);
                  cx2d.strokeStyle = 'rgba(' + ppr.color + ',' + (ppAlpha2 * 0.5) + ')';
                  cx2d.lineWidth = ppr.w * dpr;
                  cx2d.stroke();
                }

                // Central protostar glow
                var psGrad = cx2d.createRadialGradient(0, 0, 0, 0, 0, 12 * dpr);
                psGrad.addColorStop(0, 'rgba(255,230,150,' + ppAlpha2 + ')');
                psGrad.addColorStop(0.4, 'rgba(255,180,60,' + (ppAlpha2 * 0.6) + ')');
                psGrad.addColorStop(1, 'rgba(255,120,20,0)');
                cx2d.beginPath();
                cx2d.arc(0, 0, 12 * dpr, 0, Math.PI * 2);
                cx2d.fillStyle = psGrad;
                cx2d.fill();

                // Planetesimal dots orbiting
                for (var pli = 0; pli < 5; pli++) {
                  var plAngle = pli * Math.PI * 2 / 5 + tick * 0.008 * (1 + pli * 0.3);
                  var plR = (22 + pli * 6) * dpr;
                  var plpx = Math.cos(plAngle) * plR;
                  var plpy = Math.sin(plAngle) * plR * 0.3;
                  cx2d.beginPath();
                  cx2d.arc(plpx, plpy, (1.5 + pli * 0.3) * dpr, 0, Math.PI * 2);
                  cx2d.fillStyle = 'rgba(200,180,140,' + (ppAlpha2 * 0.8) + ')';
                  cx2d.fill();
                }
                cx2d.restore();

                // Label
                cx2d.save();
                cx2d.globalAlpha = ppAlpha2 * 0.8;
                cx2d.font = (7 * dpr) + 'px sans-serif';
                cx2d.fillStyle = 'rgba(255,200,100,' + ppAlpha2 + ')';
                cx2d.textAlign = 'center';
                cx2d.fillText('Protoplanetary Disk', ppx2, ppy2 + 55 * dpr);
                cx2d.restore();
              }

              // ── Epoch label overlay (bottom-left HUD) ──
              // Dark backdrop for readability
              cx2d.fillStyle = 'rgba(0,0,0,0.5)';
              var labelW = 220 * dpr, labelH = 48 * dpr;
              cx2d.beginPath();
              cx2d.roundRect(6 * dpr, H - (54 * dpr), labelW, labelH, 8 * dpr);
              cx2d.fill();

              // Epoch name
              cx2d.fillStyle = 'rgba(255,255,255,0.9)';
              cx2d.font = 'bold ' + (12 * dpr) + 'px sans-serif';
              cx2d.fillText(ep.emoji + ' ' + ep.name, 14 * dpr, H - (20 * dpr));

              // Time
              cx2d.fillStyle = 'rgba(160,200,255,0.8)';
              cx2d.font = (9 * dpr) + 'px sans-serif';
              var timeStr = t < 0.001 ? 'T = 0 (Singularity)' : t < 1 ? (t * 1000).toFixed(0) + ' million years' : t.toFixed(1) + ' billion years';
              cx2d.fillText(timeStr, 14 * dpr, H - (34 * dpr));

              canvasEl._animId = requestAnimationFrame(draw);
            } catch (e) {
              console.error('Universe draw error:', e);
              canvasEl._animId = requestAnimationFrame(draw);
            }
          }

          canvasEl._animId = requestAnimationFrame(draw);

          canvasEl._universeCleanup = function() {
            cancelAnimationFrame(canvasEl._animId);
            canvasEl._universeInit = false;
          };

          var ro = new ResizeObserver(function() {
            var newW = canvasEl.offsetWidth, newH = canvasEl.offsetHeight;
            if (newW && newH) {
              W = canvasEl.width = newW * dpr;
              H = canvasEl.height = newH * dpr;
            }
          });
          ro.observe(canvasEl);
          canvasEl._ro = ro;
        };

        // ── Handle play/stop ──
        function handlePlayToggle() {
          if (window._universeTimeLapse) {
            clearInterval(window._universeTimeLapse);
            window._universeTimeLapse = null;
            upd('isPlaying', false);
            playSound('stop');
            return;
          }

          playSound('play');
          upd('isPlaying', true);
          var t = cosmicTime;
          var startedAt5x = speed >= 5;
          var startTime = t;

          window._universeTimeLapse = setInterval(function() {
            t += 0.02 * speed;
            if (t > 13.8) {
              t = 0;
              // Check if we completed full timeline at 5x
              if (startedAt5x && startTime <= 0.1) {
                updMulti({ fullTimelineAt5x: true });
                checkBadges(undefined, undefined, undefined, true);
              }
            }
            upd('cosmicTime', parseFloat(t.toFixed(2)));
            var cv = document.querySelector('[data-universe-canvas]');
            if (cv) cv.dataset.time = String(t);
          }, 50);
        }

        // ── Handle epoch jump ──
        function handleEpochJump(ep) {
          upd('cosmicTime', ep.t);
          var cv = document.querySelector('[data-universe-canvas]');
          if (cv) cv.dataset.time = String(ep.t);
          visitEpoch(ep.name);
          if (awardStemXP) awardStemXP('universe_explore', 5, 'Visited epoch: ' + ep.name);
          playSound('epochChange');
        }

        // ── Handle quiz answer ──
        function handleQuizAnswer(choiceIdx) {
          var q = QUIZ_QUESTIONS[quizIdx];
          if (!q) return;
          var correct = choiceIdx === q.answer;
          var newScore = correct ? quizScore + 1 : quizScore;
          var newTotal = quizTotal + 1;

          if (correct) {
            playSound('quizCorrect');
            if (awardStemXP) awardStemXP('universe_quiz', 10, 'Correct quiz answer');
          } else {
            playSound('quizWrong');
          }

          updMulti({
            quizScore: newScore,
            quizTotal: newTotal,
            quizFeedback: correct ? 'Correct! Well done!' : 'Not quite. The correct answer was: ' + q.choices[q.answer]
          });

          checkBadges(undefined, newScore, undefined, undefined);

          // Advance to next question after delay
          setTimeout(function() {
            var nextIdx = (quizIdx + 1) % QUIZ_QUESTIONS.length;
            updMulti({ quizIdx: nextIdx, quizFeedback: null });
          }, 2200);
        }

        // ── Handle AI tutor ──
        function handleAskAI() {
          if (!callGemini || !aiQuestion.trim()) return;
          upd('aiLoading', true);

          var gradeHint = band === 'k2' ? 'Explain simply for a young child (ages 5-7).'
            : band === 'g35' ? 'Explain clearly for an elementary student (ages 8-10).'
            : band === 'g68' ? 'Explain at a middle school level with some scientific vocabulary.'
            : 'Explain at a high school / advanced level with proper scientific terminology.';

          var prompt = 'You are a friendly cosmology tutor. ' + gradeHint + ' The student is exploring the "' + epoch.name + '" epoch of the universe. Answer their question concisely (2-3 sentences). Question: ' + aiQuestion;

          callGemini(prompt, function(response) {
            var newCount = aiUseCount + 1;
            updMulti({
              aiResponse: response || 'Sorry, I could not get a response right now.',
              aiLoading: false,
              aiUseCount: newCount
            });
            checkBadges(undefined, undefined, newCount, undefined);
          });
        }

        // ── Handle TTS ──
        function handleTTS() {
          if (callTTS) {
            callTTS(epoch.name + '. ' + epoch.desc);
          }
        }

        // ── Handle snapshot ──
        function handleSnapshot() {
          playSound('snapshot');
          if (setToolSnapshots) {
            setToolSnapshots(function(prev) {
              return prev.concat([{
                id: 'uni-' + Date.now(),
                tool: 'universe',
                label: 'Universe: ' + epoch.name,
                data: Object.assign({}, d),
                timestamp: Date.now()
              }]);
            });
          }
          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
        }

        // ── Cleanup on back ──
        function handleBack() {
          var cv = document.querySelector('[data-universe-canvas]');
          if (cv && cv._universeCleanup) cv._universeCleanup();
          if (cv && cv._ro) cv._ro.disconnect();
          if (window._universeTimeLapse) {
            clearInterval(window._universeTimeLapse);
            window._universeTimeLapse = null;
          }
          setStemLabTool(null);
        }

        // ═══ BUILD UI ═══
        var children = [];

        // ── Header ──
        children.push(
          h('div', { className: 'flex items-center gap-3 mb-3', key: 'header' },
            h('button', {
              onClick: handleBack,
              className: 'p-1.5 hover:bg-slate-100 rounded-lg',
              'aria-label': 'Back to tools'
            }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
            h('div', { className: 'flex-1' },
              h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83C\uDF20 Universe Time-Lapse'),
              h('p', { className: 'text-xs text-slate-500 mt-0.5' }, introText)
            )
          )
        );

        // ── Mode tabs ──
        var modeButtons = [
          { id: 'explore', label: '\uD83D\uDD2D Explore', color: 'violet' },
          { id: 'quiz', label: '\uD83E\uDDE0 Quiz', color: 'amber' },
          { id: 'badges', label: '\uD83C\uDFC6 Badges', color: 'emerald' }
        ];

        children.push(
          h('div', { className: 'flex gap-1.5 mb-3', key: 'tabs' },
            modeButtons.map(function(mb) {
              var isActive = mode === mb.id;
              return h('button', {
                key: mb.id,
                onClick: function() { upd('mode', mb.id); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                  (isActive
                    ? 'bg-' + mb.color + '-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-' + mb.color + '-300'),
                style: isActive ? { backgroundColor: mb.color === 'violet' ? '#7c3aed' : mb.color === 'amber' ? '#d97706' : '#059669', color: '#fff' } : {}
              }, mb.label);
            })
          )
        );

        // ── Canvas container ──
        children.push(
          h('div', {
            className: 'relative rounded-xl overflow-hidden border-2 border-violet-300 shadow-lg',
            style: { height: '360px', background: '#050510' },
            key: 'canvas-wrap'
          },
            h('canvas', {
              'data-universe-canvas': 'true',
              ref: canvasRefCb,
              'data-time': String(cosmicTime),
              style: { width: '100%', height: '100%', display: 'block' }
            })
          )
        );

        // ── Timeline slider + playback controls (explore mode) ──
        if (mode === 'explore') {
          children.push(
            h('div', {
              className: 'mt-3 bg-gradient-to-r from-amber-50 via-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4',
              key: 'timeline'
            },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xs font-bold text-violet-700' }, '\u23F3 Cosmic Timeline'),
                h('span', { className: 'ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full' },
                  cosmicTime < 1 ? (cosmicTime * 1000).toFixed(0) + ' Myr' : cosmicTime.toFixed(1) + ' Gyr'
                )
              ),

              // Slider row
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[9px] text-violet-400' }, 'Big Bang'),
                h('input', {
                  type: 'range', min: 0, max: 13.8, step: 0.01, value: cosmicTime,
                  onChange: function(e) {
                    var val = parseFloat(e.target.value);
                    upd('cosmicTime', val);
                    var cv = document.querySelector('[data-universe-canvas]');
                    if (cv) cv.dataset.time = String(val);
                  },
                  className: 'flex-1 h-1.5 accent-violet-500'
                }),
                h('span', { className: 'text-[9px] text-violet-400' }, 'Now')
              ),

              // Playback controls
              h('div', { className: 'flex gap-2 mt-2' },
                h('button', {
                  onClick: handlePlayToggle,
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' +
                    (isPlaying ? 'bg-red-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700') +
                    ' transition-all'
                }, isPlaying ? '\u23F9 Stop' : '\u25B6 Play'),

                h('div', { className: 'flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-violet-200' },
                  h('span', { className: 'text-[9px] text-violet-500 font-bold' }, 'Speed'),
                  h('input', {
                    type: 'range', min: 0.5, max: 5, step: 0.5, value: speed,
                    onChange: function(e) { upd('speed', parseFloat(e.target.value)); },
                    className: 'w-16 h-1 accent-violet-400'
                  }),
                  h('span', { className: 'text-[10px] text-violet-600 font-bold w-6' }, speed + 'x')
                )
              ),

              // Epoch quick-jump buttons
              h('div', { className: 'flex flex-wrap gap-1 mt-2' },
                EPOCHS.map(function(ep2) {
                  var epIdx = EPOCHS.indexOf(ep2);
                  var isCurrent = cosmicTime >= ep2.t && (epIdx === EPOCHS.length - 1 || cosmicTime < EPOCHS[epIdx + 1].t);
                  return h('button', {
                    key: ep2.name,
                    onClick: function() { handleEpochJump(ep2); },
                    className: 'px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105 ' +
                      (isCurrent
                        ? 'text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'),
                    style: isCurrent ? { backgroundColor: ep2.border } : {}
                  }, ep2.emoji + ' ' + ep2.name);
                })
              )
            )
          );

          // ── Epoch info card ──
          children.push(
            h('div', {
              className: 'mt-3 rounded-xl border-2 p-5 animate-in fade-in duration-300 shadow-lg',
              style: { backgroundColor: epoch.color, borderColor: epoch.border },
              key: 'epoch-card'
            },
              // Header row
              h('div', { className: 'flex items-center gap-3 mb-3' },
                h('span', { className: 'text-3xl', style: { filter: 'drop-shadow(0 0 8px ' + epoch.border + ')' } }, epoch.emoji),
                h('div', { className: 'flex-1' },
                  h('h4', { className: 'text-base font-black tracking-wide', style: { color: epoch.border } }, epoch.name),
                  h('p', { className: 'text-[11px] font-medium', style: { color: 'rgba(200,210,230,0.8)' } },
                    cosmicTime < 1
                      ? (cosmicTime * 1000).toFixed(0) + ' million years after the Big Bang'
                      : cosmicTime.toFixed(1) + ' billion years after the Big Bang'
                  )
                )
              ),

              // Key metrics strip
              epoch.temp ? h('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                h('div', { className: 'rounded-lg p-2 text-center', style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  h('p', { className: 'text-[9px] font-bold', style: { color: 'rgba(200,200,230,0.6)' } }, '\uD83C\uDF21\uFE0F Temperature'),
                  h('p', { className: 'text-[11px] font-bold', style: { color: '#fbbf24' } }, epoch.temp)
                ),
                h('div', { className: 'rounded-lg p-2 text-center', style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  h('p', { className: 'text-[9px] font-bold', style: { color: 'rgba(200,200,230,0.6)' } }, '\uD83D\uDCCF Scale'),
                  h('p', { className: 'text-[11px] font-bold', style: { color: '#a78bfa' } }, epoch.scale)
                ),
                h('div', { className: 'rounded-lg p-2 text-center', style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },
                  h('p', { className: 'text-[9px] font-bold', style: { color: 'rgba(200,200,230,0.6)' } }, '\u26A1 Key Event'),
                  h('p', { className: 'text-[10px] font-bold', style: { color: '#34d399' } }, epoch.keyEvent)
                )
              ) : null,

              // Description
              h('p', { className: 'text-[13px] leading-relaxed mb-3', style: { color: 'rgba(230,235,245,0.92)' } }, epoch.desc),

              // TTS + AI tutor buttons
              h('div', { className: 'flex gap-2 mb-3' },
                callTTS ? h('button', {
                  onClick: handleTTS,
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-700/50 text-violet-200 hover:bg-violet-700/70 border border-violet-500/30 transition-all'
                }, '\uD83D\uDD0A Read Aloud') : null,
                callGemini ? h('button', {
                  onClick: function() { upd('showAITutor', !d.showAITutor); },
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-700/50 text-indigo-200 hover:bg-indigo-700/70 border border-indigo-500/30 transition-all'
                }, '\uD83E\uDD16 AI Tutor') : null
              ),

              // AI Tutor section
              d.showAITutor ? h('div', {
                className: 'rounded-lg p-3 mb-3',
                style: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
              },
                h('p', { className: 'text-[10px] font-bold mb-2', style: { color: 'rgba(200,210,255,0.8)' } }, '\uD83E\uDD16 Ask about this epoch:'),
                h('div', { className: 'flex gap-2' },
                  h('input', {
                    type: 'text',
                    value: aiQuestion,
                    onChange: function(e) { upd('aiQuestion', e.target.value); },
                    onKeyDown: function(e) { if (e.key === 'Enter') handleAskAI(); },
                    placeholder: 'e.g. Why did the Dark Ages end?',
                    className: 'flex-1 px-2 py-1.5 rounded-lg text-[11px] bg-white/10 text-white border border-white/20 placeholder-white/30 focus:outline-none focus:border-violet-400',
                    style: { color: '#e0e5f0' }
                  }),
                  h('button', {
                    onClick: handleAskAI,
                    disabled: aiLoading || !aiQuestion.trim(),
                    className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all'
                  }, aiLoading ? '\u23F3...' : 'Ask')
                ),
                aiResponse ? h('div', {
                  className: 'mt-2 p-2 rounded-lg text-[11px] leading-relaxed',
                  style: { backgroundColor: 'rgba(99,102,241,0.15)', color: 'rgba(220,225,245,0.9)', border: '1px solid rgba(99,102,241,0.3)' }
                }, aiResponse) : null
              ) : null,

              // Facts grid
              h('div', { className: 'space-y-1.5', style: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' } },
                h('p', { className: 'text-[11px] font-bold mb-1', style: { color: epoch.border } }, '\uD83D\uDCA1 Key Facts'),
                epoch.facts.map(function(fact, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-[11px]', style: { color: 'rgba(210,215,230,0.85)' } },
                    h('span', { className: 'mt-0.5 flex-shrink-0', style: { color: epoch.border } }, '\u2022'),
                    h('span', null, fact)
                  );
                })
              )
            )
          );
        }

        // ── Quiz mode ──
        if (mode === 'quiz') {
          var q = QUIZ_QUESTIONS[quizIdx];
          children.push(
            h('div', {
              className: 'mt-3 rounded-xl border-2 border-amber-300 p-5 shadow-lg',
              style: { backgroundColor: '#1a1508' },
              key: 'quiz'
            },
              h('div', { className: 'flex items-center gap-3 mb-4' },
                h('span', { className: 'text-2xl' }, '\uD83E\uDDE0'),
                h('div', { className: 'flex-1' },
                  h('h4', { className: 'text-base font-bold text-amber-400' }, 'Cosmic Quiz'),
                  h('p', { className: 'text-[11px] text-amber-300/70' }, 'Question ' + (quizIdx + 1) + ' of ' + QUIZ_QUESTIONS.length)
                ),
                h('div', { className: 'text-right' },
                  h('p', { className: 'text-[11px] font-bold text-amber-400' }, 'Score: ' + quizScore + '/' + quizTotal),
                  h('p', { className: 'text-[9px] text-amber-300/50' }, 'Epoch: ' + q.epoch)
                )
              ),

              // Question
              h('div', {
                className: 'rounded-lg p-3 mb-3',
                style: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
              },
                h('p', { className: 'text-[13px] font-medium', style: { color: 'rgba(230,235,245,0.92)' } }, q.q)
              ),

              // Answer choices
              h('div', { className: 'space-y-2' },
                q.choices.map(function(choice, ci) {
                  var isCorrectAnswer = quizFeedback && ci === q.answer;
                  var isWrongPick = quizFeedback && !isCorrectAnswer && quizFeedback.indexOf('Not quite') === 0;
                  return h('button', {
                    key: ci,
                    onClick: function() { if (!quizFeedback) handleQuizAnswer(ci); },
                    disabled: !!quizFeedback,
                    className: 'w-full text-left px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all ' +
                      (isCorrectAnswer
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                        : quizFeedback
                          ? 'opacity-50 border-white/10 text-white/50'
                          : 'hover:bg-white/10 border-white/10 text-white/80 hover:border-amber-400/50'),
                    style: { border: '1px solid', borderColor: isCorrectAnswer ? '#34d399' : 'rgba(255,255,255,0.1)' }
                  }, String.fromCharCode(65 + ci) + '. ' + choice);
                })
              ),

              // Feedback
              quizFeedback ? h('div', {
                className: 'mt-3 p-3 rounded-lg text-[12px] font-bold text-center',
                style: {
                  backgroundColor: quizFeedback.indexOf('Correct') === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: quizFeedback.indexOf('Correct') === 0 ? '#34d399' : '#f87171',
                  border: '1px solid ' + (quizFeedback.indexOf('Correct') === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)')
                }
              }, quizFeedback) : null
            )
          );
        }

        // ── Badges panel ──
        if (mode === 'badges') {
          var earnedCount = 0;
          for (var bk in badges) {
            if (badges[bk]) earnedCount++;
          }

          children.push(
            h('div', {
              className: 'mt-3 rounded-xl border-2 border-emerald-300 p-5 shadow-lg',
              style: { backgroundColor: '#0a1510' },
              key: 'badges'
            },
              h('div', { className: 'flex items-center gap-3 mb-4' },
                h('span', { className: 'text-2xl' }, '\uD83C\uDFC6'),
                h('div', { className: 'flex-1' },
                  h('h4', { className: 'text-base font-bold text-emerald-400' }, 'Cosmic Badges'),
                  h('p', { className: 'text-[11px] text-emerald-300/70' }, earnedCount + ' of ' + BADGES.length + ' earned')
                )
              ),

              h('div', { className: 'grid grid-cols-2 gap-2' },
                BADGES.map(function(b) {
                  var earned = !!badges[b.id];
                  return h('div', {
                    key: b.id,
                    className: 'rounded-lg p-3 text-center transition-all ' + (earned ? 'scale-100' : 'opacity-50'),
                    style: {
                      backgroundColor: earned ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid ' + (earned ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)')
                    }
                  },
                    h('span', { className: 'text-2xl block mb-1' }, earned ? b.icon : '\uD83D\uDD12'),
                    h('p', { className: 'text-[11px] font-bold', style: { color: earned ? '#34d399' : 'rgba(255,255,255,0.4)' } }, b.label),
                    h('p', { className: 'text-[9px] mt-0.5', style: { color: earned ? 'rgba(200,230,210,0.7)' : 'rgba(255,255,255,0.25)' } }, b.desc)
                  );
                })
              )
            )
          );
        }

        // ── Snapshot button ──
        children.push(
          h('div', { className: 'flex mt-3', key: 'snap' },
            h('button', {
              onClick: handleSnapshot,
              className: 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full hover:from-violet-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all'
            }, '\uD83D\uDCF8 Snapshot')
          )
        );

        return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-200' }, children);
      };
    }

    return h(this._UniverseComponent, { ctx: ctx });
  }
});

})();

} // end duplicate-registration guard
