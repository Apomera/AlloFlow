import io, sys
out = io.open('stem_tool_anatomy.js', 'w', encoding='utf-8')

out.write("""// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// stem_tool_anatomy.js \u2014 Human Anatomy Explorer
// Enhanced standalone module with layered anatomical visualization,
// 10 body systems, 129 structures, quiz mode, badge system,
// AI tutor, TTS, grade-band content, sound effects & snapshots.
// Extracted & enhanced from monolith stem_tool_science.js L5362-7429
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!window.StemLab.isRegistered('anatomy')) {
(function() {
  'use strict';

  // \u2500\u2500 Grade band helpers \u2500\u2500
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  var getGradeIntro = function(band) {
    if (band === 'k2') return 'Welcome! Look at the human body and tap on the glowing dots to learn about your bones, muscles, and organs.';
    if (band === 'g35') return 'Explore the human body! Select different systems to see how bones, muscles, and organs work together to keep you alive.';
    if (band === 'g68') return 'Investigate human anatomy across 10 body systems. Toggle layers to see how skeletal, muscular, and organ systems overlap. Use the quiz to test your knowledge.';
    return 'Analyze detailed clinical anatomy across 10 systems with 129 structures. Study origin/insertion, clinical significance, and pathology. Explore brain waves and sleep architecture.';
  };

  // \u2500\u2500 Sound engine (Web Audio API) \u2500\u2500
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
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
    } catch (e) { /* audio not available */ }
  }

  function playSound(type) {
    try {
      switch (type) {
        case 'systemSelect':
          playTone(440, 0.08, 'sine', 0.08);
          setTimeout(function() { playTone(554, 0.1, 'sine', 0.08); }, 60);
          break;
        case 'structureClick':
          playTone(660, 0.06, 'sine', 0.07);
          break;
        case 'layerToggle':
          playTone(330, 0.08, 'triangle', 0.06);
          setTimeout(function() { playTone(440, 0.08, 'triangle', 0.06); }, 50);
          break;
        case 'viewSwitch':
          playTone(392, 0.1, 'sine', 0.06);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.06); }, 80);
          break;
        case 'quizCorrect':
          playTone(523, 0.1, 'sine', 0.12);
          setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
          setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
          break;
        case 'quizWrong':
          playTone(220, 0.25, 'sawtooth', 0.08);
          break;
        case 'badge':
          playTone(523, 0.08, 'sine', 0.1);
          setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
          setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
          break;
        case 'snapshot':
          playTone(1200, 0.04, 'sine', 0.08);
          setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 50);
          break;
        case 'aiTutor':
          playTone(698, 0.06, 'sine', 0.06);
          setTimeout(function() { playTone(880, 0.08, 'sine', 0.06); }, 50);
          break;
        case 'tts':
          playTone(550, 0.05, 'triangle', 0.05);
          break;
        case 'guidedStep':
          playTone(440, 0.08, 'sine', 0.07);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.07); }, 60);
          break;
        case 'connectionView':
          playTone(350, 0.1, 'triangle', 0.06);
          setTimeout(function() { playTone(525, 0.1, 'triangle', 0.06); }, 80);
          break;
      }
    } catch (e) { /* audio not available */ }
  }

  // \u2500\u2500 Badge definitions \u2500\u2500
  var BADGE_DEFS = [
    { id: 'firstStructure', name: 'First Discovery', desc: 'Select your first structure', icon: '\\uD83D\\uDD2C', xp: 10 },
    { id: 'systemExplorer5', name: 'System Explorer', desc: 'Explore 5 body systems', icon: '\\uD83E\\uDDED', xp: 15 },
    { id: 'allSystems', name: 'Body Master', desc: 'Explore all 10 systems', icon: '\\uD83C\\uDFC6', xp: 30 },
    { id: 'layerMaster', name: 'Layer Master', desc: 'Toggle all 7 layers', icon: '\\uD83C\\uDF9A', xp: 15 },
    { id: 'quizAce5', name: 'Quiz Ace', desc: '5 quiz questions correct', icon: '\\u2B50', xp: 20 },
    { id: 'quizAce15', name: 'Quiz Champion', desc: '15 quiz questions correct', icon: '\\uD83C\\uDF1F', xp: 40 },
    { id: 'streak3', name: 'Hot Streak', desc: '3-question streak', icon: '\\uD83D\\uDD25', xp: 15 },
    { id: 'viewToggler', name: 'Both Sides', desc: 'View both anterior and posterior', icon: '\\uD83D\\uDD04', xp: 10 },
    { id: 'searchPro', name: 'Search Pro', desc: 'Use search to find 3 structures', icon: '\\uD83D\\uDD0D', xp: 10 },
    { id: 'aiCurious', name: 'Curious Mind', desc: 'Ask AI tutor 3 questions', icon: '\\uD83E\\uDD16', xp: 15 },
    { id: 'structureScholar', name: 'Structure Scholar', desc: 'View 50 different structures', icon: '\\uD83D\\uDCDA', xp: 25 },
    { id: 'tourComplete', name: 'Tour Guide', desc: 'Complete a guided tour', icon: '\\uD83D\\uDEB6', xp: 20 },
    { id: 'connectionExplorer', name: 'Systems Thinker', desc: 'Explore 5 system connections', icon: '\\uD83D\\uDD17', xp: 20 },
    { id: 'clinicalExpert', name: 'Clinical Expert', desc: 'Solve 3 clinical cases', icon: '\\uD83E\\uDE7A', xp: 25 },
    { id: 'anatomyChampion', name: 'Anatomy Champion', desc: 'Earn 10 other badges', icon: '\\uD83D\\uDC51', xp: 50 }
  ];

  // \u2500\u2500 TTS helper \u2500\u2500
  function speakText(text, callTTS) {
    playSound('tts');
    if (callTTS) {
      try { callTTS(text); return; } catch (e) { /* fallback below */ }
    }
    if (window.speechSynthesis) {
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }

  // \u2550\u2550\u2550 Register tool \u2550\u2550\u2550
  window.StemLab.registerTool('anatomy', {
    icon: '\\uD83E\\uDEC0',
    label: 'anatomy',
    desc: 'Explore 10 body systems with layered anatomical visualization',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;

      // \u2500\u2500 Tool body (anatomy) \u2500\u2500
      return (function() {
        var d = labToolData.anatomy || {};
        var upd = function(k, v) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, (function() { var o = {}; o[k] = v; return o; })()) });
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, obj) });
          });
        };

        // \u2500\u2500 Grade band \u2500\u2500
        var gradeBand = getGradeBand(ctx);
        var gradeIntro = getGradeIntro(gradeBand);

        // \u2500\u2500 Active tab \u2500\u2500
        var activeTab = d._activeTab || 'explore';

""")

out.close()
print('Part 1 written')
