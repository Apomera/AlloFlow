// ═══════════════════════════════════════════
// stem_tool_logiclab.js — Logic Lab
// Propositional Logic, Proofs & Reasoning
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id; config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id){return self._registry[id];}).filter(Boolean); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var t = this._registry[id]; if (!t||!t.render) return null; try{return t.render(ctx);}catch(e){console.error('[StemLab] Error rendering '+id,e);return null;} }
};

// WCAG 1.4.3 dark & high-contrast theme styling for Logic Lab
(function() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('allo-logiclab-hc-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-logiclab-hc-css';
  st.textContent =
    '.theme-contrast [data-stem-tool-shell="logicLab"] [style*="gradient("][style*="rgb(245, 243, 255)"]:not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}' +
    '.theme-contrast [data-logiclab-root="true"], .theme-contrast [data-logiclab-root="true"] .bg-white, .theme-contrast [data-logiclab-root="true"] .bg-violet-50, .theme-contrast [data-logiclab-root="true"] .bg-violet-100, .theme-contrast [data-logiclab-root="true"] .bg-slate-50, .theme-contrast [data-logiclab-root="true"] .bg-amber-50, .theme-contrast [data-logiclab-root="true"] .bg-emerald-50, .theme-contrast [data-logiclab-root="true"] .bg-red-50, .theme-contrast [data-logiclab-root="true"] .bg-purple-50 { background: #000000 !important; color: #ffff00 !important; border-color: #ffff00 !important; }' +
    '.theme-contrast [data-logiclab-root="true"] h2, .theme-contrast [data-logiclab-root="true"] h3, .theme-contrast [data-logiclab-root="true"] h4, .theme-contrast [data-logiclab-root="true"] p, .theme-contrast [data-logiclab-root="true"] span, .theme-contrast [data-logiclab-root="true"] td, .theme-contrast [data-logiclab-root="true"] th, .theme-contrast [data-logiclab-root="true"] label, .theme-contrast [data-logiclab-root="true"] code { color: #ffff00 !important; }' +
    '.theme-contrast [data-logiclab-root="true"] [aria-selected="true"] { background: #00ff00 !important; color: #000000 !important; border-color: #00ff00 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] { background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 12px; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .bg-white, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-slate-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-slate-100, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-slate-200, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-slate-300, [data-logiclab-root="true"][data-ll-theme="dark"] [style*="background: white"], [data-logiclab-root="true"][data-ll-theme="dark"] [style*="background: rgb(255, 255, 255)"] { background: #1e293b !important; color: #f8fafc !important; border-color: #475569 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .bg-violet-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-violet-100, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-violet-200, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-purple-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-purple-100, [data-logiclab-root="true"][data-ll-theme="dark"] [style*="background: rgb(245, 243, 255)"], [data-logiclab-root="true"][data-ll-theme="dark"] [style*="background: #f5f3ff"] { background: #1e1b4b !important; color: #ede9fe !important; border-color: #6d28d9 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .text-slate-950, [data-logiclab-root="true"][data-ll-theme="dark"] .text-slate-900, [data-logiclab-root="true"][data-ll-theme="dark"] .text-slate-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-slate-600, [data-logiclab-root="true"][data-ll-theme="dark"] .text-slate-500 { color: #e2e8f0 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .text-violet-900, [data-logiclab-root="true"][data-ll-theme="dark"] .text-violet-800, [data-logiclab-root="true"][data-ll-theme="dark"] .text-violet-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-violet-600, [data-logiclab-root="true"][data-ll-theme="dark"] .text-purple-900, [data-logiclab-root="true"][data-ll-theme="dark"] .text-purple-800, [data-logiclab-root="true"][data-ll-theme="dark"] .text-purple-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-purple-600 { color: #ddd6fe !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .bg-emerald-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-emerald-100 { background: #064e3b !important; color: #a7f3d0 !important; border-color: #10b981 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .bg-red-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-red-100 { background: #450a0a !important; color: #fecaca !important; border-color: #ef4444 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .bg-amber-50, [data-logiclab-root="true"][data-ll-theme="dark"] .bg-amber-100 { background: #451a03 !important; color: #fde68a !important; border-color: #f59e0b !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .text-amber-900, [data-logiclab-root="true"][data-ll-theme="dark"] .text-amber-800, [data-logiclab-root="true"][data-ll-theme="dark"] .text-amber-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-amber-600 { color: #fde68a !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .text-emerald-800, [data-logiclab-root="true"][data-ll-theme="dark"] .text-emerald-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-emerald-600 { color: #6ee7b7 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] .text-red-800, [data-logiclab-root="true"][data-ll-theme="dark"] .text-red-700, [data-logiclab-root="true"][data-ll-theme="dark"] .text-red-500 { color: #fca5a5 !important; }' +
    '[data-logiclab-root="true"][data-ll-theme="dark"] input, [data-logiclab-root="true"][data-ll-theme="dark"] textarea { background: #0f172a !important; color: #f8fafc !important; border-color: #6d28d9 !important; }';
  document.head.appendChild(st);
})();

// STEM_GRADING_CORE_BEGIN v1 (copied verbatim into each tool that grades; tests/stem_grading_core.test.js keeps the copies identical)
(function () {
  var MINUS = String.fromCharCode(0x2212);
  // A typed answer as a number: "-3", "2.5", "1,000", "3/4", "1 1/2" and the typographic minus.
  // Anything else (units, words, "1/0") is NaN, so a caller can tell "not a number" from "wrong".
  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    var s = value.split(MINUS).join('-').replace(/\s+/g, ' ').trim();
    if (!s) return NaN;
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    var m = s.match(/^([+-]?)(\d+) (\d+)\/(\d+)$/);
    if (m) {
      var den = +m[4];
      if (!den) return NaN;
      var mixed = +m[2] + (+m[3]) / den;
      return m[1] === '-' ? -mixed : mixed;
    }
    m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)) ?\/ ?([+-]?(?:\d+\.?\d*|\.\d+))$/);
    if (m) {
      var d = parseFloat(m[2]);
      return d ? parseFloat(m[1]) / d : NaN;
    }
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
  }
  // Equal within an absolute tolerance, a relative one, or float noise, whichever is largest.
  function sameNumber(a, b, opts) {
    var x = toNumber(a), y = toNumber(b);
    if (!isFinite(x) || !isFinite(y)) return false;
    var o = opts || {};
    var tol = Math.max(+o.tolerance || 0, (+o.relative || 0) * Math.abs(y), 1e-9 * Math.max(1, Math.abs(y)));
    return Math.abs(x - y) <= tol;
  }
  // Credit an item once: returns whether `key` is new and the next seen-map to store.
  // The map is never mutated, so it can live in tool state.
  function creditOnce(seen, key) {
    var map = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
    var k = String(key);
    if (Object.prototype.hasOwnProperty.call(map, k)) return { isNew: false, seen: map };
    var next = {};
    for (var p in map) if (Object.prototype.hasOwnProperty.call(map, p)) next[p] = map[p];
    next[k] = true;
    return { isNew: true, seen: next };
  }
  var api = { version: 1, toNumber: toNumber, sameNumber: sameNumber, creditOnce: creditOnce };
  var current = window.StemLab.grading;
  if (!current || !(current.version >= api.version)) window.StemLab.grading = api;
})();
// STEM_GRADING_CORE_END

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _logiclAC = null;
  var _logiclMuted = false;
  function getLogiclAC() { if (!_logiclAC) { try { _logiclAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_logiclAC && _logiclAC.state === "suspended") { try { _logiclAC.resume(); } catch(e) {} } return _logiclAC; }
  function logiclTone(f,d,tp,v) { if (_logiclMuted || (typeof window !== 'undefined' && window.AlloGlobalMuted)) return; var ac = getLogiclAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxLogiclClick() { logiclTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-logiclab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-logiclab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  var _drag = { sym: null, proofKey: null };

  // Proofs actually solved (written when a proof completes). The challenge quests used
  // the SELECTED level index, so clicking the Level 4 tab completed them.
  function _solvedProofCount(d) {
    var m = d && d.solvedProofs;
    return m && typeof m === 'object' && !Array.isArray(m) ? Object.keys(m).filter(function(k) { return m[k] === true; }).length : 0;
  }

  window.StemLab.registerTool('logicLab', {
    icon: '\u2234',
    label: 'Logic Lab',
    desc: 'Propositional Logic, Proofs & Reasoning',
    color: 'violet',
    category: 'math',
    questHooks: [
      { id: 'build_truth_table', label: 'Build a truth table for a logical expression', icon: '\uD83D\uDCCB', check: function(d) { return d.expression && d.expression !== 'P \u2192 Q'; }, progress: function(d) { return d.expression && d.expression !== 'P \u2192 Q' ? 'Built!' : 'Modify the expression'; } },
      { id: 'complete_challenge', label: 'Complete a logic challenge', icon: '\uD83C\uDFAF', check: function(d) { return _solvedProofCount(d) >= 1; }, progress: function(d) { return _solvedProofCount(d) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'write_3_proof_steps', label: 'Write 3 proof steps', icon: '\u270D\uFE0F', check: function(d) { return (Array.isArray(d.proofSteps) ? d.proofSteps : []).length >= 3; }, progress: function(d) { return (Array.isArray(d.proofSteps) ? d.proofSteps : []).length + '/3 steps'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 logic challenges', icon: '\uD83C\uDFC6', check: function(d) { return _solvedProofCount(d) >= 3; }, progress: function(d) { return Math.min(3, _solvedProofCount(d)) + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      // AI generate/explain controls render only when the host says text AI is usable.
      var _aiOn = !!(ctx.aiAvailable !== false && typeof callGemini === 'function');
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;
      var isDark = !!ctx.isDark;
      var isContrast = !!ctx.isContrast;
      var llTheme = isContrast ? 'contrast' : (isDark ? 'dark' : 'light');
      var llCardBg = isContrast ? '#000000' : (isDark ? '#1e293b' : '#ffffff');
      var llSubtleBg = isContrast ? '#000000' : (isDark ? '#17153b' : '#f5f3ff');
      var llInk = isContrast ? '#ffff00' : (isDark ? '#f8fafc' : '#0f172a');
      var llMuted = isContrast ? '#fde047' : (isDark ? '#cbd5e1' : '#475569');
      var llBorder = isContrast ? '#ffff00' : (isDark ? '#4c1d95' : '#ddd6fe');

      // ── Tool body (logicLab) ──
      var _llAiLoadingState = React.useState(false);
      var aiLoading = _llAiLoadingState[0], setAiLoading = _llAiLoadingState[1];
      var _llCanvasRef = React.useRef(null);
      return (function() {
// ── state ──

          var d = labToolData.logicLab || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('logicLab', 'init', {
              first: 'Logic Lab loaded. Explore logic gates, truth tables, and build digital circuits interactively.',
              repeat: 'Logic Lab active.',
              terse: 'Logic Lab.'
            }, { debounce: 800 });
          }

          var mode = d.mode || 'truth';

          var expr = typeof d.expression === 'string' ? d.expression : 'P → Q';

          // Saved state is input: a null entry crashed the proof list on render.
          var proofSteps = Array.isArray(d.proofSteps) ? d.proofSteps.filter(function(s) { return s && typeof s.result === 'string'; }) : [];

          var currentChallenge = (Number.isInteger(d.currentChallenge) && d.currentChallenge >= 0) ? d.currentChallenge : 0;

          var challengeMode = d.challengeMode || 'fallacy';

          // Indexes FALLACIES / TT_CHALLENGES as `challengeIdx % len`; -1 % n
          // is -1 in JS and 'abc' % n is NaN, so both leave the lookup undefined.
          var challengeIdx = (Number.isInteger(d.challengeIdx) && d.challengeIdx >= 0) ? d.challengeIdx : 0;

          var challengeAnswer = d.challengeAnswer || null;
          // The AI cards answer separately: sharing challengeAnswer marked an unanswered AI
          // argument "Correct!" and let "AI Generate" reopen the built-in card for more points.
          var aiChallengeAnswer = d.aiChallengeAnswer || null;

          var showEnglish = d.showEnglish || false;

          var proofComplete = d.proofComplete || false;

          var showEdu = d.showEdu || false;
          var showTruthLab = !!d.showTruthLab;

          var userTopic = d.userTopic || '';

          var aiFallacy = d.aiFallacy || null;

          // Stands in for a PROOF_CHALLENGES entry: consumers read .premises and
          // .conclusion (the AI prompt's schema). Requiring a .steps array, which the
          // prompt never asks for, discarded every generated proof.
          var aiProof = (d.aiProof && typeof d.aiProof === 'object' && !Array.isArray(d.aiProof)
            && Array.isArray(d.aiProof.premises) && d.aiProof.premises.length > 0
            && d.aiProof.premises.every(function(p) { return typeof p === 'string'; })
            && typeof d.aiProof.conclusion === 'string') ? d.aiProof : null;

          var aiDetective = d.aiDetective || null;

          var aiExplain = typeof d.aiExplain === 'string' ? d.aiExplain : '';
          var score = d.score || 0;
          var streak = d.streak || 0;
          var bestStreak = d.bestStreak || 0;
          var animTick = d.animTick || 0;
          var gateType = (typeof d.gateType === 'string' && d.gateType) ? d.gateType : 'AND';
          var gateInputs = d.gateInputs || { A: false, B: false };



          var upd = function(patch) {

            setLabToolData(function(prev) {

              return Object.assign({}, prev, { logicLab: Object.assign({}, prev.logicLab || {}, patch) });

            });

          };

          // Pay each XP item once (shared grading core). Claim XP, the Learn panel and the
          // presets paid again on every click.
          var payOnce = function(key, xp, reason) {
            var r = window.StemLab.grading.creditOnce(d.xpCredited, key);
            if (!r.isNew) return false;
            upd({ xpCredited: r.seen });
            if (typeof awardStemXP === 'function') awardStemXP('logicLab', xp, reason);
            return true;
          };



          // ── AI generation helper ──

          var aiGenerate = function(prompt, field) {

            if (!_aiOn) return;
            setAiLoading(true);

            callGemini(prompt, true).then(function(result) {

              try {

                var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                var gs = cleaned.indexOf('{');

                if (gs > 0) cleaned = cleaned.substring(gs);

                var ge = cleaned.lastIndexOf('}');

                if (ge > 0) cleaned = cleaned.substring(0, ge + 1);

                var parsed = JSON.parse(cleaned);

                var patch = {};

                patch[field] = parsed;

                setAiLoading(false);
                upd(patch);

              } catch(e) {

                if (addToast) addToast('AI response parsing failed. Try again!', 'warning');

                setAiLoading(false);

              }

            }).catch(function() {

              if (addToast) addToast('AI unavailable. Using static challenges.', 'info');

              setAiLoading(false);

            });

          };



          var aiExplainCall = function(prompt) {

            if (!_aiOn) return;
            setAiLoading(true);

            callGemini(prompt, true).then(function(result) {

              setAiLoading(false);
              upd({ aiExplain: result });

            }).catch(function() {

              setAiLoading(false);

            });

          };



          var topicClause = function() { return userTopic ? ' about ' + userTopic : ''; };



          // ── connective definitions ──

          var CONN = {

            '∧': { sym: '∧', eng: 'AND', fn: function(a,b){return a&&b;}, prec: 3 },

            '∨': { sym: '∨', eng: 'OR',  fn: function(a,b){return a||b;}, prec: 2 },

            '¬': { sym: '¬', eng: 'NOT', fn: function(a){return !a;}, prec: 5, unary: true },

            '→': { sym: '→', eng: 'IF...THEN', fn: function(a,b){return !a||b;}, prec: 1 },

            '↔': { sym: '↔', eng: 'IF AND ONLY IF', fn: function(a,b){return a===b;}, prec: 0 },

            '⊕': { sym: '⊕', eng: 'XOR', fn: function(a,b){return a!==b;}, prec: 2 }

          };



          // ── expression parser & evaluator ──

          var tokenize = function(s) {
            var str = String(s || '');
            var tokens = []; var i = 0;
            while (i < str.length) {
              var ch = str[i];
              if (/\s/.test(ch)) { i++; continue; }
              if (ch === '(' || ch === ')') { tokens.push(ch); i++; continue; }
              if ('∧∨¬→↔⊕'.indexOf(ch) !== -1) { tokens.push(ch); i++; continue; }
              if (/[A-Z]/.test(ch)) { tokens.push(ch); i++; continue; }
              // Unknown non-whitespace symbol: push as-is so parser rejects invalid/foreign syntax instead of silently dropping it.
              tokens.push(ch);
              i++;
            }
            return tokens;
          };



          // Precedence-climbing parse so ¬ > ∧ > ∨/⊕ > → > ↔ (the CONN[op].prec fields were previously
          // ignored, so "P ∨ Q ∧ R" wrongly parsed as "(P ∨ Q) ∧ R" instead of "P ∨ (Q ∧ R)").
          // minPrec+1 on the right keeps binary operators left-associative (unchanged for same-operator chains).
          var parseExpr = function(tokens, pos, minPrec) {

            minPrec = minPrec || 0;

            var left = parseUnary(tokens, pos);

            while (left.pos < tokens.length) {

              var tok = tokens[left.pos];

              if (!tok || !CONN[tok] || CONN[tok].unary) break;

              var prec = CONN[tok].prec;

              if (prec < minPrec) break;

              var op = tok;

              // Implication is RIGHT-associative by standard convention:
              // P → Q → R means P → (Q → R). Recursing at the same precedence
              // (not prec+1) lets the right side absorb further arrows first.
              // With prec+1 the chain parsed as (P → Q) → R, which genuinely
              // differs (P=F, Q=T, R=F: standard reading true, left-assoc
              // reading false). All other connectives stay left-associative;
              // for ∧, ∨, ⊕, ↔ the grouping cannot change the truth table.
              var nextMin = op === '→' ? prec : prec + 1;

              var right = parseExpr(tokens, left.pos + 1, nextMin);

              left = { node: { type: 'bin', op: op, left: left.node, right: right.node }, pos: right.pos };

            }

            return left;

          };



          var parseUnary = function(tokens, pos) {

            if (tokens[pos] === '¬') {

              var inner = parseUnary(tokens, pos + 1);

              return { node: { type: 'not', child: inner.node }, pos: inner.pos };

            }

            if (tokens[pos] === '(') {

              var inner2 = parseExpr(tokens, pos + 1);

              var closePos = inner2.pos; // skip ')'

              if (tokens[closePos] !== ')') throw new Error('unclosed (');

              return { node: inner2.node, pos: closePos + 1 };

            }

            // A missing operand used to become P, so "P →" (mid-typing) was a tautology
            // with a Claim XP button. Only a variable letter is an operand.
            if (!/^[A-Z]$/.test(tokens[pos] || '')) throw new Error('missing operand');

            return { node: { type: 'var', name: tokens[pos] }, pos: pos + 1 };

          };



          var evalNode = function(node, env) {

            if (node.type === 'var') return !!env[node.name];

            if (node.type === 'not') return !evalNode(node.child, env);

            if (node.type === 'bin') {

              var a = evalNode(node.left, env);

              var b = evalNode(node.right, env);

              return CONN[node.op].fn(a, b);

            }

            return false;

          };



          var getVars = function(node) {

            if (node.type === 'var') return [node.name];

            if (node.type === 'not') return getVars(node.child);

            if (node.type === 'bin') return getVars(node.left).concat(getVars(node.right));

            return [];

          };



          var uniqueVars = function(arr) {

            var seen = {}; var out = [];

            for (var i = 0; i < arr.length; i++) { if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); } }

            return out.sort();

          };



          // ── generate truth table ──

          var genTable = function(exprStr) {

            try {

              var tokens = tokenize(exprStr);

              if (tokens.length === 0) return null;

              var parsed = parseExpr(tokens, 0);

              // Leftover tokens mean the text was not one formula ("P -> Q" tabled only P).
              if (parsed.pos !== tokens.length) return null;

              var vars = uniqueVars(getVars(parsed.node));

              // Rows double with every letter: 16 letters froze the tab for 18 s. 8 letters is 256 rows.
              if (vars.length > 8) return null;

              var rows = [];

              var n = Math.pow(2, vars.length);

              for (var i = 0; i < n; i++) {

                var env = {};

                for (var v = 0; v < vars.length; v++) {

                  env[vars[v]] = !!(i & (1 << (vars.length - 1 - v)));

                }

                rows.push({ env: env, result: evalNode(parsed.node, env) });

              }

              var allTrue = rows.every(function(r){return r.result;});

              var allFalse = rows.every(function(r){return !r.result;});

              return { vars: vars, rows: rows, type: allTrue ? 'tautology' : allFalse ? 'contradiction' : 'contingency' };

            } catch(e) { return null; }

          };



          // Letters in a formula, for saying why a table was refused.

          var tableLetterCount = function(exprStr) {

            try {

              var tokens = tokenize(exprStr);

              if (tokens.length === 0) return 0;

              var parsed = parseExpr(tokens, 0);

              return parsed.pos === tokens.length ? uniqueVars(getVars(parsed.node)).length : 0;

            } catch(e) { return 0; }

          };



          // ── English translations ──

          var engMap = {

            'P': "It's sunny", 'Q': "It's warm", 'R': "We go outside", 'S': "We're happy"

          };

          var nodeToEng = function(node) {

            if (node.type === 'var') return engMap[node.name] || node.name;

            if (node.type === 'not') return "it's NOT the case that " + nodeToEng(node.child);

            if (node.type === 'bin') {

              var l = nodeToEng(node.left); var r = nodeToEng(node.right);

              if (node.op === '→') return 'If ' + l + ', then ' + r;

              if (node.op === '↔') return l + ' if and only if ' + r;

              if (node.op === '∧') return l + ' AND ' + r;

              if (node.op === '∨') return l + ' OR ' + r;

              if (node.op === '⊕') return 'Either ' + l + ' or ' + r + ' (but not both)';

            }

            return '';

          };



          // ── presets ──

          var PRESETS = [

            { label: t('stem.logiclab.implication', 'Implication'), expr: 'P → Q' },

            { label: t('stem.logiclab.de_morgan_s_1', "De Morgan's 1"), expr: '¬ (P ∧ Q)' },

            { label: t('stem.logiclab.de_morgan_s_2', "De Morgan's 2"), expr: '(¬ P) ∨ (¬ Q)' },

            { label: t('stem.logiclab.contrapositive', 'Contrapositive'), expr: '(¬ Q) → (¬ P)' },

            { label: 'XOR', expr: 'P ⊕ Q' },

            { label: t('stem.logiclab.tautology', 'Tautology'), expr: 'P ∨ (¬ P)' },

            { label: t('stem.logiclab.contradiction', 'Contradiction'), expr: 'P ∧ (¬ P)' },

            { label: t('stem.logiclab.biconditional', 'Biconditional'), expr: 'P ↔ Q' },

            { label: t('stem.logiclab.distributive', 'Distributive'), expr: 'P ∧ (Q ∨ R)' },

            { label: t('stem.logiclab.modus_ponens_form', 'Modus Ponens form'), expr: '(P ∧ (P → Q)) → Q' }

          ];





          // ── Inference Rules ──

          // ── Fallacy detection for failed rule applications ──
          // The two classic invalid moves are recognizable from the selection:
          // P→Q with Q (affirming the consequent) and P→Q with ¬P (denying the
          // antecedent). Name the fallacy with a counter-example instead of a
          // generic "doesn't apply" — the wrong move becomes the lesson.
          var diagnoseFallacy = function(selTexts) {
            for (var fi = 0; fi < selTexts.length; fi++) {
              if (typeof selTexts[fi] !== 'string') continue;
              var fm = selTexts[fi].match(/^(.+)\s*→\s*(.+)$/);
              if (!fm) continue;
              var fp = fm[1].trim(), fq = fm[2].trim();
              for (var fj = 0; fj < selTexts.length; fj++) {
                if (fi === fj || typeof selTexts[fj] !== 'string') continue;
                var fOther = selTexts[fj].trim();
                if (fOther === fq) return 'That move is AFFIRMING THE CONSEQUENT — a classic fallacy. From "' + fp + ' → ' + fq + '" and "' + fq + '" you cannot conclude "' + fp + '": something ELSE could have caused ' + fq + '. (If it rains, the ground is wet. The ground IS wet — but maybe a sprinkler did it.)';
                if (fOther === '¬' + fp || fOther === '¬(' + fp + ')') return 'That move is DENYING THE ANTECEDENT — a classic fallacy. From "' + fp + ' → ' + fq + '" and "¬' + fp + '" you cannot conclude "¬' + fq + '": the rule only says what happens IF ' + fp + ' is true. It is silent when ' + fp + ' is false.';
              }
            }
            return null;
          };

          // Strip balanced outer parentheses so rule matching compares the
          // formula, not its punctuation. Without this, Proof Challenge 5 was
          // unsolvable: its premise reads "(P ∧ Q) → R", Conjunction produces
          // the string "P ∧ Q", and Modus Ponens compared the two literally —
          // '(P ∧ Q)' never equalled 'P ∧ Q', so the taught conj-then-MP proof
          // could not complete. Only BALANCED outer parens are stripped:
          // "(P) ∧ (Q)" is left alone because its first paren closes early.
          var stripOuterParens = function(s) {
            s = s.trim();
            while (s.length > 1 && s[0] === '(' && s[s.length - 1] === ')') {
              var depth = 0, closesEarly = false;
              for (var i = 0; i < s.length - 1; i++) {
                if (s[i] === '(') depth++;
                else if (s[i] === ')') { depth--; if (depth === 0) { closesEarly = true; break; } }
              }
              if (closesEarly) break;
              s = s.slice(1, -1).trim();
            }
            return s;
          };

          // Rules act on the PARSED formula, not on regex splits of its text. Greedy splits
          // read "P → Q → R" as (P → Q) → R, Conjunction dropped parentheses ("¬Q ∧ P → Q"
          // then fed Modus Tollens), and Simplification of "(P ∧ Q) → R" gave "(P": invalid
          // steps that could still end in "Proof complete".
          // Same grammar and AST as parseExpr (¬ > ∧ > ∨/⊕ > → (right) > ↔), kept local so
          // this block stands alone; any character outside the grammar rejects the formula.
          var propNode = function(s) {
            var tk = String(s == null ? '' : s).split('').filter(function(c) { return c !== ' '; });
            var PREC = { '↔': 0, '→': 1, '∨': 2, '⊕': 2, '∧': 3 }, pos = 0;
            var unary = function() {
              var c = tk[pos];
              if (c === '¬') { pos++; return { type: 'not', child: unary() }; }
              if (c === '(') { pos++; var e = binary(0); if (tk[pos] !== ')') throw 0; pos++; return e; }
              if (!/^[A-Z]$/.test(c || '')) throw 0;
              pos++; return { type: 'var', name: c };
            };
            var binary = function(min) {
              var left = unary();
              while (pos < tk.length && PREC[tk[pos]] !== undefined && PREC[tk[pos]] >= min) {
                var op = tk[pos++];
                left = { type: 'bin', op: op, left: left, right: binary(op === '→' ? PREC[op] : PREC[op] + 1) };
              }
              return left;
            };
            try { if (!tk.length) return null; var node = binary(0); return pos === tk.length ? node : null; } catch (e) { return null; }
          };
          var propText = function(n, top) {
            if (n.type === 'var') return n.name;
            if (n.type === 'not') return '¬' + propText(n.child, false);
            var s = propText(n.left, false) + ' ' + n.op + ' ' + propText(n.right, false);
            return top ? s : '(' + s + ')';
          };
          var propCanon = function(s) { var n = propNode(s); return n ? propText(n, true) : null; };
          var sameProp = function(a, b) { return propText(a, true) === propText(b, true); };
          var isOp = function(n, op) { return !!n && n.type === 'bin' && n.op === op; };
          var notNode = function(n) { return { type: 'not', child: n }; };
          var binNode = function(op, l, r) { return { type: 'bin', op: op, left: l, right: r }; };
          var pairRule = function(sel, fn) {
            for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {
              if (i === j) continue;
              var a = propNode(sel[i]), b = propNode(sel[j]);
              var out = a && b ? fn(a, b) : null;
              if (out) return propText(out, true);
            }
            return null;
          };
          var oneRule = function(sel, fn) { var a = propNode(sel[0]); var out = a ? fn(a) : null; return out ? propText(out, true) : null; };

          var RULES = [

            { id: 'mp', name: t('stem.logiclab.modus_ponens', 'Modus Ponens'), form: 'P→Q, P ∴ Q', eng: 'If you study, you pass. You studied. ∴ You pass.', needs: 2,

              check: function(premises, sel) {

                return pairRule(sel, function(a, b) { return isOp(a, '→') && sameProp(a.left, b) ? a.right : null; });

              }

            },

            { id: 'mt', name: t('stem.logiclab.modus_tollens', 'Modus Tollens'), form: 'P→Q, ¬Q ∴ ¬P', eng: "If it rains, ground is wet. Ground isn't wet. ∴ It didn't rain.", needs: 2,

              check: function(premises, sel) {

                return pairRule(sel, function(a, b) { return isOp(a, '→') && b.type === 'not' && sameProp(b.child, a.right) ? notNode(a.left) : null; });

              }

            },

            { id: 'hs', name: t('stem.logiclab.hypothetical_syllogism', 'Hypothetical Syllogism'), form: 'P→Q, Q→R ∴ P→R', eng: 'If A then B, if B then C. ∴ If A then C.', needs: 2,

              check: function(premises, sel) {

                return pairRule(sel, function(a, b) { return isOp(a, '→') && isOp(b, '→') && sameProp(a.right, b.left) ? binNode('→', a.left, b.right) : null; });

              }

            },

            { id: 'ds', name: t('stem.logiclab.disjunctive_syllogism', 'Disjunctive Syllogism'), form: 'P∨Q, ¬P ∴ Q', eng: "It's red or blue. It's not red. ∴ It's blue.", needs: 2,

              check: function(premises, sel) {

                return pairRule(sel, function(a, b) {
                  if (!isOp(a, '∨') || b.type !== 'not') return null;
                  if (sameProp(b.child, a.left)) return a.right;
                  return sameProp(b.child, a.right) ? a.left : null;
                });

              }

            },

            { id: 'conj', name: t('stem.logiclab.conjunction', 'Conjunction'), form: 'P, Q ∴ P∧Q', eng: 'Combine two truths into one.', needs: 2,

              check: function(premises, sel) {

                if (sel.length !== 2) return null;

                var ca = propNode(sel[0]), cb = propNode(sel[1]);

                return ca && cb ? propText(binNode('∧', ca, cb), true) : null;

              }

            },

            { id: 'simp', name: t('stem.logiclab.simplification', 'Simplification'), form: 'P∧Q ∴ P', eng: 'Extract one truth from a pair.', needs: 1,

              check: function(premises, sel) {

                return oneRule(sel, function(a) { return isOp(a, '∧') ? a.left : null; });

              }

            },

            { id: 'add', name: t('stem.logiclab.addition', 'Addition'), form: 'P ∴ P∨Q', eng: 'Add any alternative to a truth.', needs: 1,

              check: function(premises, sel) {

                return oneRule(sel, function(a) { return binNode('∨', a, { type: 'var', name: 'Q' }); });

              }

            },

            { id: 'dn', name: t('stem.logiclab.double_negation', 'Double Negation'), form: '¬¬P ≡ P', eng: '"Not not raining" = "Raining."', needs: 1,

              check: function(premises, sel) {

                return oneRule(sel, function(a) { return a.type === 'not' && a.child.type === 'not' ? a.child.child : notNode(notNode(a)); });

              }

            },

            { id: 'contra', name: t('stem.logiclab.contrapositive_2', 'Contrapositive'), form: 'P→Q ≡ ¬Q→¬P', eng: 'Reverse and negate.', needs: 1,

              check: function(premises, sel) {

                return oneRule(sel, function(a) { return isOp(a, '→') ? binNode('→', notNode(a.right), notNode(a.left)) : null; });

              }

            },

            { id: 'demorgan', name: t('stem.logiclab.de_morgan_s', "De Morgan's"), form: '¬(P∧Q) ≡ ¬P∨¬Q', eng: '"Not both" = "at least one isn\'t."', needs: 1,

              check: function(premises, sel) {

                return oneRule(sel, function(a) {
                  if (a.type !== 'not') return null;
                  if (isOp(a.child, '∧')) return binNode('∨', notNode(a.child.left), notNode(a.child.right));
                  return isOp(a.child, '∨') ? binNode('∧', notNode(a.child.left), notNode(a.child.right)) : null;
                });

              }

            }

          ];



          // ── Proof Challenges ──

          var PROOF_CHALLENGES = [
            { level: 1, title: t('stem.logiclab.simple_deduction', 'Simple Deduction'), premises: ['P \u2192 Q', 'P'], conclusion: 'Q', rulesNeeded: ['mp'], hint: t('stem.logiclab.use_modus_ponens_p_q_and_p_gives_q', 'Use Modus Ponens: P\u2192Q and P gives Q') },
            { level: 2, title: t('stem.logiclab.denial', 'Denial'), premises: ['P \u2192 Q', '\u00ACQ'], conclusion: '\u00ACP', rulesNeeded: ['mt'], hint: t('stem.logiclab.use_modus_tollens_p_q_and_q_gives_p', 'Use Modus Tollens: P\u2192Q and \u00ACQ gives \u00ACP') },
            { level: 3, title: t('stem.logiclab.chain_reaction', 'Chain Reaction'), premises: ['P \u2192 Q', 'Q \u2192 R', 'P'], conclusion: 'R', rulesNeeded: ['hs', 'mp'], hint: t('stem.logiclab.hs_chains_p_q_and_q_r_then_mp_with_p', 'HS chains P\u2192Q and Q\u2192R, then MP with P') },
            { level: 4, title: t('stem.logiclab.elimination', 'Elimination'), premises: ['P \u2228 Q', '\u00ACP'], conclusion: 'Q', rulesNeeded: ['ds'], hint: t('stem.logiclab.disjunctive_syllogism_p_q_and_p_gives_', 'Disjunctive Syllogism: P\u2228Q and \u00ACP gives Q') },
            { level: 5, title: t('stem.logiclab.combine_conclude', 'Combine & Conclude'), premises: ['(P \u2227 Q) \u2192 R', 'P', 'Q'], conclusion: 'R', rulesNeeded: ['conj', 'mp'], hint: t('stem.logiclab.conjunction_gives_p_q_then_modus_ponen', 'Conjunction gives P\u2227Q, then Modus Ponens gives R') },
            { level: 6, title: t('stem.logiclab.long_chain', 'Long Chain'), premises: ['P \u2192 Q', 'Q \u2192 R', 'R \u2192 S', 'P'], conclusion: 'S', rulesNeeded: ['hs', 'mp'], hint: t('stem.logiclab.chain_p_q_and_q_r_with_hs_then_again_w', 'Chain P\u2192Q and Q\u2192R with HS, then again with R\u2192S, then MP') },
            { level: 7, title: t('stem.logiclab.double_deny', 'Double Deny'), premises: ['P \u2192 Q', '\u00ACQ', 'P \u2228 R'], conclusion: 'R', rulesNeeded: ['mt', 'ds'], hint: t('stem.logiclab.mt_on_p_q_gives_p_then_ds_on_p_r_gives', 'MT on P\u2192Q gives \u00ACP, then DS on P\u2228R gives R') },
            { level: 8, title: t('stem.logiclab.master_proof', 'Master Proof'), premises: ['P \u2192 Q', 'Q \u2192 R', '\u00ACR'], conclusion: '\u00ACP', rulesNeeded: ['hs', 'mt'], hint: t('stem.logiclab.hs_gives_p_r_then_mt_with_r_gives_p', 'HS gives P\u2192R, then MT with \u00ACR gives \u00ACP') }
          ];



          // ── Fallacy challenges ──

          var FALLACIES = [

            { arg: 'If it rains, the ground is wet. The ground is wet. Therefore, it rained.', valid: false, name: t('stem.logiclab.affirming_the_consequent', 'Affirming the Consequent'), formal: 'P→Q, Q ∴ P ✗', explain: 'The ground could be wet for other reasons (sprinkler, spill).' },

            { arg: 'If you study, you\'ll pass. You didn\'t study. Therefore, you won\'t pass.', valid: false, name: t('stem.logiclab.denying_the_antecedent', 'Denying the Antecedent'), formal: 'P→Q, ¬P ∴ ¬Q ✗', explain: 'You might pass anyway (natural talent, lucky guesses).' },

            { arg: 'All dogs are mammals. Fido is a dog. Therefore, Fido is a mammal.', valid: true, name: t('stem.logiclab.valid_syllogism', 'Valid Syllogism'), formal: '∀x(Dog(x)→Mammal(x)), Dog(Fido) ∴ Mammal(Fido) ✓', explain: 'Classic valid deductive reasoning.' },

            { arg: 'If you\'re a cat, you have four legs. Spot has four legs. Therefore, Spot is a cat.', valid: false, name: t('stem.logiclab.affirming_the_consequent_2', 'Affirming the Consequent'), formal: 'P→Q, Q ∴ P ✗', explain: 'Spot could be a dog, a horse, or any four-legged animal!' },

            { arg: 'Either we go to the park or we go to the movies. We\'re not going to the park. Therefore, we go to the movies.', valid: true, name: t('stem.logiclab.disjunctive_syllogism_2', 'Disjunctive Syllogism'), formal: 'P∨Q, ¬P ∴ Q ✓', explain: 'With only two options, eliminating one leaves the other.' },

            { arg: 'If it snows, school is cancelled. School is not cancelled. Therefore, it did not snow.', valid: true, name: t('stem.logiclab.modus_tollens_2', 'Modus Tollens'), formal: 'P→Q, ¬Q ∴ ¬P ✓', explain: 'Denying the consequent validly denies the antecedent.' },

            { arg: 'Everyone who exercises is healthy. Maria is healthy. Therefore, Maria exercises.', valid: false, name: t('stem.logiclab.affirming_the_consequent_3', 'Affirming the Consequent'), formal: 'P→Q, Q ∴ P ✗', explain: 'Maria might be healthy for other reasons (genetics, diet).' },

            { arg: 'If a shape is a square, it has four sides. This shape has four sides. Therefore, it\'s a square.', valid: false, name: t('stem.logiclab.affirming_the_consequent_4', 'Affirming the Consequent'), formal: 'P\u2192Q, Q \u2234 P \u2717', explain: 'Rectangles and rhombuses also have four sides!' },
            { arg: 'If you eat vegetables, you grow tall. Sam doesn\'t eat vegetables. Therefore, Sam won\'t grow tall.', valid: false, name: t('stem.logiclab.denying_the_antecedent_2', 'Denying the Antecedent'), formal: 'P\u2192Q, \u00ACP \u2234 \u00ACQ \u2717', explain: 'Height depends on many factors — genetics, sleep, and more.' },
            { arg: 'If the alarm goes off, there is a fire. The alarm went off. Therefore, there is a fire.', valid: true, name: t('stem.logiclab.modus_ponens_2', 'Modus Ponens'), formal: 'P\u2192Q, P \u2234 Q \u2713', explain: 'Classic valid MP — the alarm confirms the fire consequence.' },
            { arg: 'It is raining OR it is sunny. It is raining. Therefore, it is not sunny.', valid: false, name: t('stem.logiclab.false_exclusive_disjunction', 'False Exclusive Disjunction'), formal: 'P\u2228Q, P \u2234 \u00ACQ \u2717', explain: 'OR is inclusive — both could be true (a light rain in sunshine).' },
            { arg: 'If we win the game, we celebrate. We did not win. Therefore, we do not celebrate.', valid: false, name: t('stem.logiclab.denying_the_antecedent_3', 'Denying the Antecedent'), formal: 'P\u2192Q, \u00ACP \u2234 \u00ACQ \u2717', explain: 'You could celebrate the season ending, effort, or other achievements.' }
          ];



          // ── Quick-fire truth table challenges ──

          var TT_CHALLENGES = [

            { expr: 'P ∧ Q', desc: t('stem.logiclab.and_gate', 'AND gate') },

            { expr: 'P ∨ Q', desc: t('stem.logiclab.or_gate', 'OR gate') },

            { expr: 'P → Q', desc: t('stem.logiclab.implication_2', 'Implication') },

            { expr: '¬ P', desc: t('stem.logiclab.negation', 'Negation') },

            { expr: 'P ⊕ Q', desc: t('stem.logiclab.exclusive_or', 'Exclusive OR') },

            { expr: '(P \u2192 Q) \u2227 (Q \u2192 P)', desc: t('stem.logiclab.biconditional_equivalence', 'Biconditional equivalence') },
            { expr: '\u00AC (P \u2227 Q)', desc: t('stem.logiclab.nand_gate', 'NAND gate') },
            { expr: '\u00AC (P \u2228 Q)', desc: t('stem.logiclab.nor_gate', 'NOR gate') },
            { expr: 'P \u2227 (\u00AC P)', desc: t('stem.logiclab.contradiction_2', 'Contradiction') },
            { expr: 'P \u2228 (\u00AC P)', desc: t('stem.logiclab.tautology_2', 'Tautology') }
          ];



          var activeCh = aiProof || PROOF_CHALLENGES[currentChallenge] || PROOF_CHALLENGES[0];

          // ── Grade-banded rule palette ──
          // Younger bands start with the two most intuitive rules; the middle band
          // adds four more; 9-12 sees all eight. Rules the ACTIVE challenge needs
          // are always unlocked (so no proof is ever blocked), AI-generated proofs
          // show everything (their requirements are unknown), and a "show all"
          // toggle lets any student opt out of the training wheels.
          var _llGl = (gradeLevel || '').toLowerCase();
          var _llBand = /k|1st|2nd|pre/.test(_llGl) ? 'K-2' : /3rd|4th|5th/.test(_llGl) ? '3-5' : /6th|7th|8th/.test(_llGl) ? '6-8' : '9-12';
          var _llBandRules = _llBand === '9-12' ? null : (_llBand === '6-8' ? { mp: 1, mt: 1, hs: 1, ds: 1, conj: 1, simp: 1 } : { mp: 1, ds: 1 });
          var _llNeeded = (!aiProof && activeCh && activeCh.rulesNeeded) || [];
          var showAllRules = !!d.showAllRules;
          var ruleVisible = function(rid) {
            if (showAllRules || _llBandRules === null || aiProof) return true;
            return !!_llBandRules[rid] || _llNeeded.indexOf(rid) >= 0;
          };





          // ── gradient map ──

          var _gViolet = isContrast ? '#000000' : 'linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed)';

          var _gCard = isContrast ? '#000000' : (isDark ? 'linear-gradient(135deg, #17153b, #1e1b4b, #17153b)' : 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)');



          // ── render ──

          // ── Logic gate evaluator ──
          var evalGate = function(type, a, b) {
            if (type === 'AND') return a && b;
            if (type === 'OR') return a || b;
            if (type === 'NOT') return !a;
            if (type === 'NAND') return !(a && b);
            if (type === 'NOR') return !(a || b);
            if (type === 'XOR') return a !== b;
            if (type === 'XNOR') return a === b;
            return false;
          };
          var isUnaryGate = gateType === 'NOT';
          var gateOutput = evalGate(gateType, gateInputs.A, gateInputs.B);
          var GATE_TYPES = ['AND','OR','NOT','NAND','NOR','XOR','XNOR'];

          // ── Symbol colors for drag palette (all >= 4.5:1 with white text) ──
          var _symColor = {
            '∧': '#6d28d9', '∨': '#1d4ed8', '¬': '#b91c1c',
            '→': '#047857', '↔': '#b45309', '⊕': '#be185d',
            'P': '#4338ca', 'Q': '#6d28d9', 'R': '#7e22ce', 'S': '#9333ea',
            '(': '#475569', ')': '#475569'
          };

          var solvedCount = _solvedProofCount(d);

          var renderLogicStudioFocus = function() {
            var table = genTable(expr);
            var rowCount = table && table.rows ? table.rows.length : 0;
            var trueCount = table && table.rows ? table.rows.filter(function(r) { return r.result; }).length : 0;
            var falseCount = rowCount - trueCount;
            var truePct = rowCount ? Math.round((trueCount / rowCount) * 100) : 0;
            var modeLabels = {
              truth: 'Truth Tables',
              proof: 'Proof Builder',
              challenges: 'Challenges',
              gates: 'Logic Gates',
              simLogic: 'Probability Logic'
            };
            var activeModeLabel = modeLabels[mode] || modeLabels.truth;
            var proofTarget = activeCh && activeCh.conclusion ? activeCh.conclusion : 'Q';
            var routeCards = [
              { id: 'truth', icon: '\uD83D\uDCCA', title: 'Truth Tables', detail: rowCount ? rowCount + ' rows ready' : 'Build every case', accent: '#7c3aed', soft: isDark ? '#1e1b4b' : '#f5f3ff' },
              { id: 'proof', icon: '\uD83E\uDDE9', title: 'Proof Builder', detail: solvedCount + '/8 solved \u00B7 target ' + proofTarget, accent: '#0891b2', soft: isDark ? '#083344' : '#ecfeff' },
              { id: 'challenges', icon: '\u26A1', title: 'Challenge Run', detail: score + ' pts \u00B7 streak ' + streak, accent: '#d97706', soft: isDark ? '#451a03' : '#fffbeb' },
              { id: 'gates', icon: '\u26A1', title: 'Logic Gates', detail: gateType + ' output ' + (gateOutput ? 'HIGH (1)' : 'LOW (0)'), accent: '#16a34a', soft: isDark ? '#052e16' : '#f0fdf4' },
              { id: 'simLogic', icon: '\uD83C\uDFB2', title: 'Probability', detail: 'Reason with uncertainty', accent: '#db2777', soft: isDark ? '#500724' : '#fdf2f8' }
            ];
            var invertingGate = gateType === 'NOT' || gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR';
            var gateBase = (gateType === 'AND' || gateType === 'NAND') ? 'and'
              : (gateType === 'OR' || gateType === 'NOR') ? 'or'
              : (gateType === 'XOR' || gateType === 'XNOR') ? 'xor' : 'not';

            return React.createElement("section", {
              "data-logiclab-focus": "true",
              role: "region",
              "aria-label": t('stem.logiclab.reasoning_studio', 'Logic Lab reasoning studio'),
              className: "mb-5 overflow-hidden rounded-2xl border shadow-sm",
              style: { background: llCardBg, borderColor: llBorder }
            },
              React.createElement("div", {
                className: "grid grid-cols-1 lg:grid-cols-5 gap-0",
                style: {
                  background: isContrast ? '#000000' : (isDark ? 'linear-gradient(135deg, #17153b 0%, #1e1b4b 54%, #0f172a 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 54%, #eef2ff 100%)')
                }
              },
                React.createElement("div", { className: "lg:col-span-3 p-5 sm:p-6", style: { minWidth: 0 } },
                  React.createElement("div", { className: "flex flex-wrap items-start gap-3 justify-between" },
                    React.createElement("div", { style: { minWidth: 0 } },
                      React.createElement("p", { className: "text-xs font-black uppercase tracking-wide", style: { color: isContrast ? '#00ff00' : (isDark ? '#c4b5fd' : '#6d28d9') } }, t('stem.logiclab.current_workspace', 'Current workspace')),
                      React.createElement("h3", { className: "mt-1 text-xl sm:text-2xl font-black", style: { color: llInk } }, t('stem.logiclab.reasoning_studio_title', 'Reasoning Studio')),
                      React.createElement("p", { className: "mt-2 max-w-xl text-sm leading-relaxed", style: { color: llMuted } }, t('stem.logiclab.reasoning_studio_hint', 'Move between truth tables, proof steps, logic gates, and probability without losing the thread of the argument.'))
                    ),
                    React.createElement("span", {
                      className: "rounded-full px-3 py-1 text-xs font-black border",
                      style: isContrast
                        ? { background: '#000000', color: '#00ff00', borderColor: '#00ff00' }
                        : { background: _gViolet, color: '#ffffff', borderColor: '#7c3aed' }
                    }, activeModeLabel)
                  ),
                  React.createElement("div", { className: "mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" },
                    [
                      ['Expression', expr || 'P \u2192 Q', rowCount ? table.type : 'ready'],
                      ['Rows', rowCount || 'Build', trueCount + ' true'],
                      ['Proofs', solvedCount + ' / ' + PROOF_CHALLENGES.length, 'target ' + proofTarget],
                      ['Best', bestStreak + ' streak', score + ' pts']
                    ].map(function(stat) {
                      return React.createElement("div", {
                        key: stat[0],
                        className: "rounded-xl border p-3 shadow-sm",
                        style: {
                          minHeight: 86,
                          minWidth: 0,
                          background: llCardBg,
                          borderColor: llBorder
                        }
                      },
                        React.createElement("div", { className: "text-[0.6875rem] font-black uppercase tracking-wide", style: { color: llMuted } }, stat[0]),
                        React.createElement("div", { className: "mt-1 truncate text-sm font-black", style: { color: llInk }, title: String(stat[1]) }, stat[1]),
                        React.createElement("div", { className: "mt-1 text-xs font-bold", style: { color: isContrast ? '#00ff00' : (isDark ? '#c4b5fd' : '#6d28d9') } }, stat[2])
                      );
                    })
                  ),
                  React.createElement("div", { className: "mt-4 rounded-xl border p-3", style: { background: llCardBg, borderColor: llBorder } },
                    React.createElement("div", { className: "flex items-center justify-between text-xs font-black", style: { color: llMuted } },
                      React.createElement("span", null, t('stem.logiclab.truth_mix', 'Truth density')),
                      React.createElement("span", { style: { color: llInk } }, trueCount + ' true / ' + falseCount + ' false (' + truePct + '%)')
                    ),
                    React.createElement("div", { className: "mt-2 h-3 overflow-hidden rounded-full", style: { background: isContrast ? '#333333' : (isDark ? '#450a0a' : '#fee2e2') } },
                      React.createElement("div", {
                        className: "h-full rounded-full",
                        style: {
                          width: truePct + '%',
                          minWidth: rowCount && truePct === 0 ? 0 : 10,
                          background: isContrast ? '#00ff00' : 'linear-gradient(90deg, #10b981, #06b6d4)'
                        }
                      })
                    )
                  )
                ),
                React.createElement("div", {
                  className: "lg:col-span-2 border-t bg-slate-950 p-4 lg:border-l lg:border-t-0 flex items-center",
                  style: { borderColor: llBorder, background: isContrast ? '#000000' : '#0b1120' }
                },
                  React.createElement("svg", {
                    viewBox: "0 0 520 220",
                    role: "img",
                    "aria-label": t('stem.logiclab.logic_flow_visual', 'Logic flow schematic showing inputs, IEEE logic gate, truth rows, and output signal.'),
                    className: "w-full",
                    style: { display: 'block', minHeight: 190 }
                  },
                    React.createElement("defs", null,
                      React.createElement("linearGradient", { id: "logicStudioLine", x1: "0", x2: "1", y1: "0", y2: "0" },
                        React.createElement("stop", { offset: "0%", stopColor: isContrast ? "#ffff00" : "#a78bfa" }),
                        React.createElement("stop", { offset: "100%", stopColor: isContrast ? "#00ff00" : "#22d3ee" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-pcb-bg", cx: "50%", cy: "48%", r: "68%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#14223c" }),
                        React.createElement("stop", { offset: "65%", stopColor: "#0c1528" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#070c18" })
                      ),
                      !isContrast && React.createElement("pattern", { id: "ll-pcb-pads", width: "24", height: "24", patternUnits: "userSpaceOnUse" },
                        React.createElement("circle", { cx: "12", cy: "12", r: "1.1", fill: "#38bdf8", opacity: "0.22" }),
                        React.createElement("path", { d: "M 0 12 H 24 M 12 0 V 24", stroke: "#1e293b", strokeWidth: "0.6", opacity: "0.55" })
                      ),
                      !isContrast && React.createElement("linearGradient", { id: "ll-gate-bevel", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#7c3aed" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#4c1d95" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#2e1065" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-led-on", cx: "36%", cy: "32%", r: "68%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#bbf7d0" }),
                        React.createElement("stop", { offset: "42%", stopColor: "#22c55e" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#14532d" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-led-off", cx: "36%", cy: "32%", r: "68%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#fca5a5" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#dc2626" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#7f1d1d" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-led-halo-on", cx: "50%", cy: "50%", r: "50%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#4ade80", stopOpacity: "0.68" }),
                        React.createElement("stop", { offset: "52%", stopColor: "#22c55e", stopOpacity: "0.22" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#22c55e", stopOpacity: "0" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-pulse-packet", cx: "50%", cy: "50%", r: "50%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: "1" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#86efac", stopOpacity: "0.85" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#22c55e", stopOpacity: "0" })
                      ),
                      !isContrast && React.createElement("radialGradient", { id: "ll-gate-aura", cx: "50%", cy: "50%", r: "50%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#4ade80", stopOpacity: "0.38" }),
                        React.createElement("stop", { offset: "58%", stopColor: "#8b5cf6", stopOpacity: "0.14" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#8b5cf6", stopOpacity: "0" })
                      )
                    ),
                    React.createElement("rect", { x: "4", y: "4", width: "512", height: "212", rx: "24", fill: isContrast ? "#000000" : "url(#ll-pcb-bg)", stroke: isContrast ? "#ffff00" : "#334155", strokeWidth: "2" }),
                    !isContrast && React.createElement("rect", { x: "6", y: "6", width: "508", height: "208", rx: "22", fill: "url(#ll-pcb-pads)" }),
                    // Subtle PCB corner mounting pads
                    !isContrast && [[24, 24], [496, 24], [24, 196], [496, 196]].map(function(pt, ci) {
                      return React.createElement("g", { key: "mp-" + ci },
                        React.createElement("circle", { cx: pt[0], cy: pt[1], r: "5", fill: "none", stroke: "#f59e0b", strokeWidth: "1.4", opacity: "0.45" }),
                        React.createElement("circle", { cx: pt[0], cy: pt[1], r: "2", fill: "#0f172a" })
                      );
                    }),
                    // PCB major guide buses
                    React.createElement("path", { d: "M120 12 V208 M260 12 V208 M400 12 V208 M12 72 H508 M12 148 H508", stroke: isContrast ? "#222222" : "#1e293b", strokeWidth: "1" }),
                    // Dual-pass luminous HIGH-signal copper/neon wires + staggered energy pulse packets
                    gateInputs.A && !isContrast && React.createElement("path", { d: "M84 72 H188", stroke: "#4ade80", strokeWidth: "15", strokeLinecap: "round", opacity: "0.24" }),
                    React.createElement("path", { d: "M84 72 H188", stroke: gateInputs.A ? (isContrast ? "#00ff00" : "#22c55e") : (isContrast ? "#ffff00" : "#475569"), strokeWidth: "7", strokeLinecap: "round" }),
                    gateInputs.A && !isContrast && React.createElement("path", { d: "M84 72 H188", stroke: "#dcfce7", strokeWidth: "2", strokeLinecap: "round", opacity: "0.85" }),
                    gateInputs.A && !isContrast && React.createElement("g", { style: { animation: "llSignalIn 1.35s linear infinite" } },
                      React.createElement("ellipse", { cx: "92", cy: "72", rx: "11", ry: "5.5", fill: "url(#ll-pulse-packet)", opacity: "0.82" }),
                      React.createElement("circle", { cx: "96", cy: "72", r: "4.2", fill: "#ffffff" })
                    ),
                    gateInputs.A && !isContrast && React.createElement("g", { style: { animation: "llSignalIn 1.35s linear 0.675s infinite" } },
                      React.createElement("ellipse", { cx: "92", cy: "72", rx: "10", ry: "5", fill: "url(#ll-pulse-packet)", opacity: "0.75" }),
                      React.createElement("circle", { cx: "96", cy: "72", r: "3.6", fill: "#ecfdf5" })
                    ),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("path", { d: "M84 148 H188", stroke: "#4ade80", strokeWidth: "15", strokeLinecap: "round", opacity: "0.24" }),
                    !isUnaryGate && React.createElement("path", { d: "M84 148 H188", stroke: gateInputs.B ? (isContrast ? "#00ff00" : "#22c55e") : (isContrast ? "#ffff00" : "#475569"), strokeWidth: "7", strokeLinecap: "round" }),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("path", { d: "M84 148 H188", stroke: "#dcfce7", strokeWidth: "2", strokeLinecap: "round", opacity: "0.85" }),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("g", { style: { animation: "llSignalIn 1.35s linear 0.3s infinite" } },
                      React.createElement("ellipse", { cx: "92", cy: "148", rx: "11", ry: "5.5", fill: "url(#ll-pulse-packet)", opacity: "0.82" }),
                      React.createElement("circle", { cx: "96", cy: "148", r: "4.2", fill: "#ffffff" })
                    ),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("g", { style: { animation: "llSignalIn 1.35s linear 0.975s infinite" } },
                      React.createElement("ellipse", { cx: "92", cy: "148", rx: "10", ry: "5", fill: "url(#ll-pulse-packet)", opacity: "0.75" }),
                      React.createElement("circle", { cx: "96", cy: "148", r: "3.6", fill: "#ecfdf5" })
                    ),
                    gateOutput && !isContrast && React.createElement("path", { d: "M336 110 H430", stroke: "#4ade80", strokeWidth: "16", strokeLinecap: "round", opacity: "0.26" }),
                    React.createElement("path", { d: "M336 110 H430", stroke: gateOutput ? (isContrast ? "#00ff00" : "#22c55e") : (isContrast ? "#ffff00" : "#ef4444"), strokeWidth: "8", strokeLinecap: "round" }),
                    gateOutput && !isContrast && React.createElement("path", { d: "M336 110 H430", stroke: "#dcfce7", strokeWidth: "2.2", strokeLinecap: "round", opacity: "0.9" }),
                    gateOutput && !isContrast && React.createElement("g", { style: { animation: "llSignalOut 1.1s linear infinite" } },
                      React.createElement("ellipse", { cx: "340", cy: "110", rx: "12", ry: "6", fill: "url(#ll-pulse-packet)", opacity: "0.88" }),
                      React.createElement("circle", { cx: "344", cy: "110", r: "4.6", fill: "#ffffff" })
                    ),
                    gateOutput && !isContrast && React.createElement("g", { style: { animation: "llSignalOut 1.1s linear 0.55s infinite" } },
                      React.createElement("ellipse", { cx: "340", cy: "110", rx: "10", ry: "5", fill: "url(#ll-pulse-packet)", opacity: "0.76" }),
                      React.createElement("circle", { cx: "344", cy: "110", r: "3.8", fill: "#ecfdf5" })
                    ),
                    // Copper terminal solder pads + active pin resonance glints
                    !isContrast && [[184, 72, gateInputs.A], [!isUnaryGate ? 184 : -20, 148, gateInputs.B], [338, 110, gateOutput]].map(function(pad, pi) {
                      if (pad[0] < 0) return null;
                      return React.createElement("g", { key: "pad-" + pi },
                        pad[2] && React.createElement("circle", { cx: pad[0], cy: pad[1], r: "10.5", fill: "none", stroke: "#86efac", strokeWidth: "1.6", style: { animation: "llPinGlint 1.8s ease-in-out " + (pi * 0.25) + "s infinite" } }),
                        React.createElement("circle", { cx: pad[0], cy: pad[1], r: "5.5", fill: "#0f172a", stroke: pad[2] ? "#4ade80" : "#f59e0b", strokeWidth: "2.2" }),
                        pad[2] && React.createElement("circle", { cx: pad[0], cy: pad[1], r: "2.1", fill: "#dcfce7", opacity: "0.92" })
                      );
                    }),
                    // Input nodes with subtle outer halo when energized
                    gateInputs.A && !isContrast && React.createElement("circle", { cx: "66", cy: "72", r: "38", fill: "url(#ll-led-halo-on)", style: { animation: "llLedBreath 2.4s ease-in-out infinite" } }),
                    React.createElement("circle", { cx: "66", cy: "72", r: "28", fill: gateInputs.A ? (isContrast ? "#00ff00" : "url(#ll-led-on)") : "#1e293b", stroke: isContrast ? "#ffff00" : (gateInputs.A ? "#86efac" : "#a78bfa"), strokeWidth: "3.2" }),
                    !isContrast && React.createElement("path", { d: "M 48 58 A 22 22 0 0 1 78 50", fill: "none", stroke: "#ffffff", strokeWidth: "2", strokeLinecap: "round", opacity: "0.35" }),
                    React.createElement("text", { x: "66", y: "72", textAnchor: "middle", fontSize: "19", fontWeight: "900", fill: gateInputs.A && isContrast ? "#000000" : "#f8fafc" }, "P"),
                    React.createElement("text", { x: "66", y: "91", textAnchor: "middle", fontSize: "11", fontWeight: "800", fill: gateInputs.A && isContrast ? "#000000" : "#bbf7d0" }, gateInputs.A ? "1" : "0"),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("circle", { cx: "66", cy: "148", r: "38", fill: "url(#ll-led-halo-on)", style: { animation: "llLedBreath 2.4s ease-in-out 0.6s infinite" } }),
                    React.createElement("circle", { cx: "66", cy: "148", r: "28", fill: (!isUnaryGate && gateInputs.B) ? (isContrast ? "#00ff00" : "url(#ll-led-on)") : "#1e293b", stroke: isContrast ? "#ffff00" : ((!isUnaryGate && gateInputs.B) ? "#86efac" : "#a78bfa"), strokeWidth: "3.2", opacity: isUnaryGate ? "0.35" : "1" }),
                    !isContrast && !isUnaryGate && React.createElement("path", { d: "M 48 134 A 22 22 0 0 1 78 126", fill: "none", stroke: "#ffffff", strokeWidth: "2", strokeLinecap: "round", opacity: "0.35" }),
                    React.createElement("text", { x: "66", y: "148", textAnchor: "middle", fontSize: "19", fontWeight: "900", fill: (!isUnaryGate && gateInputs.B && isContrast) ? "#000000" : "#f8fafc", opacity: isUnaryGate ? "0.4" : "1" }, "Q"),
                    React.createElement("text", { x: "66", y: "167", textAnchor: "middle", fontSize: "11", fontWeight: "800", fill: (!isUnaryGate && gateInputs.B && isContrast) ? "#000000" : "#bbf7d0", opacity: isUnaryGate ? "0.4" : "1" }, gateInputs.B ? "1" : "0"),
                    // Gate energized aura + state-transition flash halo
                    !isContrast && gateOutput && React.createElement("ellipse", { cx: "256", cy: "110", rx: "86", ry: "68", fill: "url(#ll-gate-aura)", style: { animation: "llLedBreath 2.6s ease-in-out infinite" } }),
                    !isContrast && React.createElement("circle", {
                      key: "ll-hero-flash-" + gateType + "-" + (gateOutput ? "1" : "0"),
                      cx: "256", cy: "110", r: "64",
                      fill: "none",
                      stroke: gateOutput ? "#4ade80" : "#a78bfa",
                      strokeWidth: "3.2",
                      style: { transformOrigin: "256px 110px", animation: "llGateFlash 0.55s ease-out forwards" }
                    }),
                    // Authentic IEEE gate body with grounded shadow & bevel-shaded gradient
                    gateBase === 'and' && React.createElement("g", null,
                      !isContrast && React.createElement("path", { d: "M188 53 L256 53 A62 62 0 0 1 256 177 L188 177 Z", fill: "rgba(2,6,23,0.55)" }),
                      React.createElement("path", { d: "M186 48 L254 48 A62 62 0 0 1 254 172 L186 172 Z", fill: isContrast ? "#000000" : "url(#ll-gate-bevel)", stroke: isContrast ? "#ffff00" : (gateOutput ? "#86efac" : "#c4b5fd"), strokeWidth: "3.8" }),
                      !isContrast && React.createElement("path", { d: "M192 54 L252 54", fill: "none", stroke: "#ffffff", strokeWidth: "1.8", strokeLinecap: "round", opacity: "0.38" })
                    ),
                    gateBase === 'or' && React.createElement("g", null,
                      !isContrast && React.createElement("path", { d: "M184 53 Q218 115 184 177 Q266 171 324 115 Q266 59 184 53 Z", fill: "rgba(2,6,23,0.55)" }),
                      React.createElement("path", { d: "M182 48 Q216 110 182 172 Q264 166 322 110 Q264 54 182 48 Z", fill: isContrast ? "#000000" : "url(#ll-gate-bevel)", stroke: isContrast ? "#ffff00" : (gateOutput ? "#86efac" : "#c4b5fd"), strokeWidth: "3.8" })
                    ),
                    gateBase === 'xor' && React.createElement("g", null,
                      !isContrast && React.createElement("path", { d: "M194 53 Q228 115 194 177 Q270 171 324 115 Q270 59 194 53 Z", fill: "rgba(2,6,23,0.55)" }),
                      React.createElement("path", { d: "M192 48 Q226 110 192 172 Q268 166 322 110 Q268 54 192 48 Z", fill: isContrast ? "#000000" : "url(#ll-gate-bevel)", stroke: isContrast ? "#ffff00" : (gateOutput ? "#86efac" : "#c4b5fd"), strokeWidth: "3.8" }),
                      React.createElement("path", { d: "M176 48 Q210 110 176 172", fill: "none", stroke: isContrast ? "#ffff00" : (gateOutput ? "#86efac" : "#c4b5fd"), strokeWidth: "4" })
                    ),
                    gateBase === 'not' && React.createElement("g", null,
                      !isContrast && React.createElement("path", { d: "M192 55 L320 115 L192 175 Z", fill: "rgba(2,6,23,0.55)" }),
                      React.createElement("path", { d: "M190 50 L318 110 L190 170 Z", fill: isContrast ? "#000000" : "url(#ll-gate-bevel)", stroke: isContrast ? "#ffff00" : (gateOutput ? "#86efac" : "#c4b5fd"), strokeWidth: "3.8" })
                    ),
                    invertingGate && React.createElement("circle", { cx: "328", cy: "110", r: "10", fill: isContrast ? "#000000" : "#0f172a", stroke: isContrast ? "#00ff00" : (gateOutput ? "#4ade80" : "#c4b5fd"), strokeWidth: "3.8" }),
                    React.createElement("text", { x: "248", y: "108", textAnchor: "middle", fontSize: "24", fontWeight: "900", fill: isContrast ? "#ffff00" : "#ffffff" }, gateType),
                    React.createElement("text", { x: "248", y: "132", textAnchor: "middle", fontSize: "13", fontWeight: "800", fill: isContrast ? "#00ff00" : "#ddd6fe" }, rowCount + " rows"),
                    // Glowing LED Output Indicator dome + layered ambient halo bloom
                    gateOutput && !isContrast && React.createElement("circle", { cx: "454", cy: "110", r: "56", fill: "url(#ll-led-halo-on)", opacity: "0.52", style: { animation: "llLedBreath 2.2s ease-in-out infinite" } }),
                    gateOutput && !isContrast && React.createElement("circle", { cx: "454", cy: "110", r: "44", fill: "url(#ll-led-halo-on)" }),
                    React.createElement("circle", { cx: "454", cy: "110", r: "34", fill: gateOutput ? (isContrast ? "#00ff00" : "url(#ll-led-on)") : (isContrast ? "#000000" : "url(#ll-led-off)"), stroke: isContrast ? "#ffff00" : (gateOutput ? "#bbf7d0" : "#fca5a5"), strokeWidth: "3.6" }),
                    !isContrast && React.createElement("path", { d: "M 432 94 A 26 26 0 0 1 468 84", fill: "none", stroke: "#ffffff", strokeWidth: "2.6", strokeLinecap: "round", opacity: "0.48" }),
                    !isContrast && React.createElement("circle", { cx: "442", cy: "92", r: "3.2", fill: "#ffffff", opacity: gateOutput ? "0.75" : "0.35" }),
                    React.createElement("text", { x: "454", y: "117", textAnchor: "middle", fontSize: "19", fontWeight: "900", fill: gateOutput && isContrast ? "#000000" : "#ffffff" }, gateOutput ? "TRUE" : "FALSE"),
                    React.createElement("text", { x: "24", y: "203", fontSize: "13", fontWeight: "800", fill: isContrast ? "#ffff00" : "#c4b5fd" }, "Formula: " + (expr || "P \u2192 Q")),
                    React.createElement("text", { x: "496", y: "203", textAnchor: "end", fontSize: "13", fontWeight: "800", fill: isContrast ? "#00ff00" : "#67e8f9" }, truePct + "% true")
                  )
                )
              ),
              React.createElement("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 border-t p-3",
                style: { background: llCardBg, borderColor: llBorder }
              },
                routeCards.map(function(card) {
                  var active = mode === card.id;
                  return React.createElement("button", {
                    key: card.id,
                    type: "button",
                    "aria-label": "Open " + card.title,
                    "aria-pressed": active,
                    onClick: function() { sfxLogiclClick(); upd({ mode: card.id }); },
                    className: "text-left rounded-xl border p-3 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer",
                    style: {
                      minHeight: 88,
                      background: isContrast ? (active ? '#00ff00' : '#000000') : (active ? card.soft : llCardBg),
                      borderColor: isContrast ? (active ? '#00ff00' : '#ffff00') : (active ? card.accent : llBorder),
                      color: isContrast ? (active ? '#000000' : '#ffff00') : llInk,
                      boxShadow: active && !isContrast ? '0 8px 18px rgba(124,58,237,0.14)' : 'none'
                    }
                  },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { "aria-hidden": "true", className: "text-lg" }, card.icon),
                      React.createElement("span", { className: "text-sm font-black", style: { color: isContrast ? (active ? '#000000' : '#ffff00') : llInk } }, card.title)
                    ),
                    React.createElement("div", { className: "mt-1.5 text-xs font-bold leading-snug", style: { color: isContrast ? (active ? '#000000' : '#fde047') : llMuted } }, card.detail)
                  );
                })
              )
            );
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto", "data-logiclab-root": "true", "data-ll-theme": llTheme },

            // CSS animations (pulse propagation, pin resonance, LED bloom & gate transition flash — respects prefers-reduced-motion)
            React.createElement("style", null,
              '@keyframes logicPop{0%{transform:scale(0.7);opacity:0.4}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:1}}' +
              '@keyframes wrongShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}' +
              '@keyframes llSignalIn{0%{transform:translateX(0);opacity:0}16%{opacity:0.98}84%{opacity:0.98}100%{transform:translateX(84px);opacity:0}}' +
              '@keyframes llSignalOut{0%{transform:translateX(0);opacity:0}16%{opacity:0.98}84%{opacity:0.98}100%{transform:translateX(76px);opacity:0}}' +
              '@keyframes llGatePulseIn{0%{transform:translateX(0);opacity:0}18%{opacity:0.98}82%{opacity:0.98}100%{transform:translateX(28px);opacity:0}}' +
              '@keyframes llGatePulseOut{0%{transform:translateX(0);opacity:0}18%{opacity:0.98}82%{opacity:0.98}100%{transform:translateX(22px);opacity:0}}' +
              '@keyframes llPinGlint{0%,100%{opacity:0.28;stroke-width:1.4}50%{opacity:0.92;stroke-width:2.3}}' +
              '@keyframes llLedBreath{0%,100%{opacity:0.52}50%{opacity:0.9}}' +
              '@keyframes llGateFlash{0%{transform:scale(0.84);opacity:0.86}100%{transform:scale(1.22);opacity:0}}' +
              '@media (prefers-reduced-motion: reduce){[data-logiclab-root] svg circle,[data-logiclab-root] svg ellipse,[data-logiclab-root] svg g,[data-logiclab-root] svg path{animation:none!important}}'
            ),

            // Bespoke Formal Logic Workbench Header
            React.createElement("div", { className: "mb-5" },
              React.createElement("div", {
                className: "rounded-2xl p-4 sm:p-5 border flex flex-wrap items-center justify-between gap-3",
                style: isContrast
                  ? { background: '#000000', borderColor: '#ffff00', borderWidth: '2px', color: '#ffff00' }
                  : { background: _gViolet, borderColor: '#6d28d9', boxShadow: '0 8px 28px rgba(91,33,182,0.28)', color: '#ffffff' }
              },
                React.createElement("div", { className: "flex items-center gap-3", style: { minWidth: 0 } },
                  React.createElement("span", { className: "text-3xl shrink-0", "aria-hidden": "true" }, "\uD83E\uDDE0"),
                  React.createElement("div", { style: { minWidth: 0 } },
                    React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                      React.createElement("span", {
                        className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-black uppercase tracking-wider border",
                        style: isContrast
                          ? { background: '#000000', color: '#00ff00', borderColor: '#00ff00' }
                          : { background: 'rgba(255,255,255,0.16)', color: '#ede9fe', borderColor: 'rgba(255,255,255,0.3)' }
                      }, t('stem.logiclab.subject_badge', 'Computer Science \u00B7 Discrete Logic')),
                      React.createElement("span", {
                        className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold tabular-nums border",
                        style: isContrast
                          ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                          : { background: 'rgba(16,185,129,0.22)', color: '#a7f3d0', borderColor: 'rgba(52,211,153,0.4)' }
                      }, solvedCount + '/8 ' + t('stem.logiclab.proofs_pill', 'Proofs'))
                    ),
                    React.createElement("h2", { className: "text-2xl font-black tracking-tight mt-0.5", style: { color: isContrast ? '#ffff00' : '#ffffff' } }, t('stem.logiclab.logic_lab', "Logic Lab")),
                    React.createElement("p", { className: "text-xs sm:text-sm font-medium", style: { color: isContrast ? '#fde047' : '#ede9fe' } }, t('stem.logiclab.propositional_logic_reasoning', "Propositional Logic, Truth Tables, Natural Deduction & Digital Gates"))
                  )
                ),
                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                  React.createElement("span", {
                    className: "px-3 py-1.5 rounded-xl text-xs font-black tabular-nums border",
                    style: isContrast
                      ? { background: '#000000', color: '#00ff00', borderColor: '#00ff00' }
                      : { background: 'rgba(15,23,42,0.38)', color: '#fef3c7', borderColor: 'rgba(255,255,255,0.22)' }
                  }, '\uD83C\uDF1F ' + score + ' pts'),
                  React.createElement("span", {
                    className: "px-3 py-1.5 rounded-xl text-xs font-black tabular-nums border",
                    style: isContrast
                      ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { background: 'rgba(15,23,42,0.38)', color: '#a5f3fc', borderColor: 'rgba(255,255,255,0.22)' }
                  }, '\uD83D\uDD25 ' + streak + ' streak'),
                  React.createElement("button", {
                    type: "button",
                    "aria-pressed": !!d.muted,
                    "aria-label": d.muted ? t('stem.logiclab.unmute_audio', 'Muted — unmute sound effects') : t('stem.logiclab.mute_audio', 'Sound on — mute sound effects'),
                    onClick: function() {
                      var nextMuted = !d.muted;
                      _logiclMuted = nextMuted;
                      upd({ muted: nextMuted });
                    },
                    className: "min-h-11 px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer",
                    style: isContrast
                      ? { background: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { background: 'rgba(15,23,42,0.45)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }
                  }, d.muted ? '\uD83D\uDD07 ' + t('stem.logiclab.muted', 'Muted') : '\uD83D\uDD0A ' + t('stem.logiclab.sound_on', 'Sound on'))
                )
              ),

              // Accessible WAI-ARIA Mode Tabs
              React.createElement("div", {
                role: "tablist",
                "aria-label": t('stem.logiclab.modes_tablist', 'Logic Lab modes'),
                className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3"
              },
                (function() {
                  var _llModes = [['truth', '\uD83D\uDCCA', 'Truth Tables'], ['proof', '\uD83E\uDDE9', 'Proof Builder'], ['challenges', '\u26A1', 'Challenges'], ['gates', '\u26A1\uFE0F', 'Logic Gates'], ['simLogic', '\uD83C\uDFB2', 'Probability']];
                  _logiclMuted = !!d.muted;
                  return _llModes.map(function(m, mi) {
                  var active = mode === m[0];
                  return React.createElement("button", {
                    type: "button",
                    role: "tab",
                    tabIndex: active ? 0 : -1,
                    "aria-selected": active,
                    "aria-label": m[2] + " — switch mode",
                    key: m[0],
                    onClick: function() { sfxLogiclClick(); upd({ mode: m[0] }); },
                    onKeyDown: function(e) {
                      var nextIdx = null;
                      if (e.key === 'ArrowRight') nextIdx = (mi + 1) % _llModes.length;
                      else if (e.key === 'ArrowLeft') nextIdx = (mi - 1 + _llModes.length) % _llModes.length;
                      else if (e.key === 'Home') nextIdx = 0;
                      else if (e.key === 'End') nextIdx = _llModes.length - 1;
                      if (nextIdx === null) return;
                      e.preventDefault();
                      sfxLogiclClick();
                      upd({ mode: _llModes[nextIdx][0] });
                      var tabs = e.currentTarget.parentElement && e.currentTarget.parentElement.querySelectorAll('[role="tab"]');
                      if (tabs && tabs[nextIdx]) tabs[nextIdx].focus();
                    },
                    className: "px-3 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer",
                    style: active
                      ? {
                          background: isContrast ? '#00ff00' : _gViolet,
                          color: isContrast ? '#000000' : '#ffffff',
                          borderColor: isContrast ? '#00ff00' : '#6d28d9',
                          boxShadow: isContrast ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
                          minHeight: 44
                        }
                      : {
                          background: llSubtleBg,
                          color: isContrast ? '#ffff00' : (isDark ? '#ddd6fe' : '#5b21b6'),
                          borderColor: llBorder,
                          minHeight: 44
                        }
                  }, m[1] + " " + m[2]);
                });
                })()
              )
            ),

            renderLogicStudioFocus(),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                truth:      { accent: '#7c3aed', darkAccent: '#c4b5fd', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDCCA', title: t('stem.logiclab.truth_tables_every_input_combination_e', 'Truth Tables \u2014 every input combination, every output'), hint: t('stem.logiclab.for_n_variables_the_table_has_2_rows_a', 'For n variables, the table has 2\u207F rows. AND, OR, NOT, XOR, IFF \u2014 each gate is just a column. Boolean algebra (Boole 1854) underlies every digital circuit, every search query, every conditional in code.') },
                proof:      { accent: '#0e7490', darkAccent: '#67e8f9', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83E\uDDE9', title: t('stem.logiclab.proof_builder_derive_conclusions_step_', 'Proof Builder \u2014 derive conclusions step by step'),     hint: t('stem.logiclab.modus_ponens_modus_tollens_hypothetica', 'Modus ponens, modus tollens, hypothetical syllogism, disjunctive syllogism \u2014 the eight inference rules cover most introductory propositional logic. Each step justifies itself by NAME, not vibe.') },
                challenges: { accent: '#b45309', darkAccent: '#fcd34d', soft: 'rgba(217,119,6,0.10)',  icon: '\u26A1',         title: t('stem.logiclab.challenges_graded_tautology_contradict', 'Challenges \u2014 graded tautology + contradiction puzzles'), hint: t('stem.logiclab.tautology_always_true_contradiction_al', 'Tautology = always true; contradiction = always false; contingency = sometimes both. Aristotle\u2019s law of non-contradiction (350 BCE) is the oldest published rule. AP CS Principles practice + intro discrete math.') },
                gates:      { accent: '#15803d', darkAccent: '#86efac', soft: 'rgba(22,163,74,0.10)',  icon: '\u26A1\uFE0F', title: t('stem.logiclab.logic_gates_transistors_all_the_way_do', 'Logic Gates \u2014 transistors all the way down'),         hint: t('stem.logiclab.nand_is_functionally_complete_you_can_', 'NAND is functionally complete \u2014 you can build every other gate from NAND alone. A modern CPU contains ~10 billion transistors implementing the same boolean math you\u2019re building here.') },
                simLogic:   { accent: '#be185d', darkAccent: '#f9a8d4', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDFB2', title: t('stem.logiclab.probability_logic_inference_under_unce', 'Probability Logic \u2014 inference under uncertainty'), hint: t('stem.logiclab.p_and_q_each_carry_a_probability_inste', 'P and Q each carry a probability instead of a hard true/false. For independent events, P(P\u2227Q) = P(P) \u00D7 P(Q). Watch how a confidence threshold turns soft probabilities into discrete inferences.') }
              };
              var meta = MODE_META[mode] || MODE_META.truth;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isContrast ? '#000000' : (isDark ? '#1e293b' : 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)'),
                  border: '1px solid ' + (isContrast ? '#ffff00' : meta.accent + '55'),
                  borderLeft: '4px solid ' + (isContrast ? '#00ff00' : meta.accent),
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 200 } },
                  React.createElement('h3', { style: { color: isContrast ? '#ffff00' : (isDark ? meta.darkAccent : meta.accent), fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: llMuted, fontSize: 11.5, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // ═══ MODE 1: TRUTH TABLES ═══

            mode === 'truth' && React.createElement("div", { className: "space-y-4" },

              // Expression builder — drag-and-drop
              React.createElement("div", { 'data-logic-expression-builder': true, className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-3" },
                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83E\uDDE9"),
                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, t('stem.logiclab.expression_builder', 'Expression builder')),
                  React.createElement("span", { className: "text-xs text-violet-700 font-bold ml-auto" }, t('stem.logiclab.drag_tiles_or_click_to_add', "Drag tiles or click to add"))
                ),

                // Symbol palette
                React.createElement("div", { className: "mb-3 space-y-2" },
                  React.createElement("div", { className: "text-xs font-black text-violet-700 uppercase tracking-wider" }, t('stem.logiclab.variables', "Variables")),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['P','Q','R','S'].map(function(v) {
                      return React.createElement("button", { type: "button",
                        key: v, draggable: true,
                        onDragStart: function(e) { _drag.sym = v; e.dataTransfer.effectAllowed='copy'; },
                        'aria-label': 'Insert variable ' + v,
                        onClick: function() { upd({ expression: expr + v }); },
                        className: "w-11 h-11 flex items-center justify-center font-black text-white text-base rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        style: { background: _symColor[v], minWidth: 44, minHeight: 44 }
                      }, v);
                    })
                  ),
                  React.createElement("div", { className: "text-xs font-black text-violet-700 uppercase tracking-wider" }, t('stem.logiclab.connectives', "Connectives")),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['\u2227','\u2228','\u00AC','\u2192','\u2194','\u2295'].map(function(sym) {
                      return React.createElement("button", { type: "button",
                        key: sym, draggable: true,
                        onDragStart: function(e) { _drag.sym = ' '+sym+' '; e.dataTransfer.effectAllowed='copy'; },
                        'aria-label': 'Insert ' + (CONN[sym] ? CONN[sym].eng : sym),
                        onClick: function() { upd({ expression: expr+' '+sym+' ' }); },
                        className: "px-3 py-2 flex items-center justify-center font-black text-white text-sm rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        title: CONN[sym] ? CONN[sym].eng : sym,
                        style: { background: _symColor[sym], minWidth: 44, minHeight: 44, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' }
                      }, sym + ' ' + (CONN[sym] ? CONN[sym].eng : ''));
                    }),
                    ['(',')'].map(function(v) {
                      return React.createElement("button", { type: "button",
                        key: v, draggable: true,
                        onDragStart: function(e) { _drag.sym = v; e.dataTransfer.effectAllowed='copy'; },
                        'aria-label': v === '(' ? 'Insert opening parenthesis' : 'Insert closing parenthesis',
                        style: { minWidth: 44, minHeight: 44 },
                        onClick: function() { upd({ expression: expr+v }); },
                        className: "w-11 h-11 flex items-center justify-center font-black text-slate-600 text-base rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform bg-slate-100 hover:bg-slate-200"
                      }, v);
                    })
                  )
                ),

                // Drop zone — expression canvas
                React.createElement("div", {
                  className: "min-h-14 p-3 rounded-xl border-2 border-dashed flex items-center gap-1 flex-wrap mb-3 transition-all",
                  style: { borderColor: d._dragOver ? '#7c3aed' : '#c4b5fd', background: d._dragOver ? '#f5f3ff' : 'white', boxShadow: d._dragOver ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none' },
                  onDragOver: function(e) { e.preventDefault(); upd({ _dragOver: true }); },
                  onDragLeave: function() { upd({ _dragOver: false }); },
                  onDrop: function(e) { e.preventDefault(); if (_drag.sym) { upd({ expression: expr+_drag.sym, _dragOver: false }); _drag.sym=null; } }
                },
                  expr.length === 0
                    ? React.createElement("span", { className: "text-slate-600 text-sm font-bold" }, t('stem.logiclab.drop_symbols_here_or_click_above', "Drop symbols here or click above…"))
                    : (function() {
                        var toks = tokenize(expr);
                        return toks.length === 0
                          ? React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800" }, expr)
                          : toks.map(function(tok, ti) {
                              return React.createElement("span", {
                                key: ti,
                                className: "inline-flex items-center justify-center px-2 py-1 rounded-lg font-black text-white text-sm shadow-sm",
                                style: { background: _symColor[tok] || '#94a3b8', animation: ti===toks.length-1?'logicPop 0.25s ease-out':'none' }
                              }, tok);
                            });
                      })()
                ),

                // Inline controls row
                React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-3" },
                  React.createElement("input", {
                    type: "text", value: expr, style: { minHeight: 44, flexBasis: '100%' },
                    onChange: function(e) { upd({ expression: e.target.value }); },
                    placeholder: t('stem.logiclab.or_type_p_q', "Or type: P \u2192 Q"),
                    'aria-label': t('stem.logiclab.logic_expression_input', 'Logic expression input'),
                    className: "min-w-0 flex-1 px-3 py-2 rounded-lg border border-violet-500 text-sm font-mono text-violet-800 bg-white focus:ring-2 focus:ring-violet-400 outline-none"
                  }),
                  React.createElement("button", { style: { minHeight: 44, minWidth: 44 }, "aria-label": t('stem.logiclab.remove_last_character', 'Delete last character'),
                    onClick: function() { upd({ expression: expr.slice(0,-1).trimEnd() }); },
                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-sm"
                  }, t('stem.logiclab.remove_last_character', 'Delete last character')),
                  React.createElement("button", { "aria-label": t('stem.logiclab.clear', "Clear"),
                    onClick: function() { upd({ expression: '' }); },
                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-sm"
                  }, t('stem.logiclab.clear_2', "Clear"))
                ),

                // Current expression display (kept for English toggle)
                React.createElement("div", { className: "flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-violet-200" },
                  React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800 flex-1" }, expr),

                  React.createElement("button", { "aria-label": t('stem.logiclab.toggle_english_and_formal_notation', "Toggle English and Formal notation"),

                    onClick: function() { upd({ showEnglish: !showEnglish }); },

                    className: "text-xs font-bold px-3 py-1.5 rounded-full transition-all " + (showEnglish ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700 hover:bg-violet-200")

                  }, showEnglish ? "\uD83D\uDCDD English" : "\u2234 Formal")

                ),

                showEnglish && (function() {

                  try {

                    var toks = tokenize(expr);

                    if (toks.length > 0) {

                      var parsed = parseExpr(toks, 0);
                      if (!parsed || !parsed.node || parsed.pos !== toks.length) return null;

                      return React.createElement("div", { className: "mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 italic" },

                        "\"\u200A" + nodeToEng(parsed.node) + "\u200A\""

                      );

                    }

                  } catch(e) {}

                  return null;

                })(),

                // Presets

                React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-700 mr-1 self-center" }, "Presets:"),

                  PRESETS.map(function(p) {

                    return React.createElement("button", { "aria-label": "Load preset: " + p.label,

                      key: p.label,

                      onClick: function() { upd({ expression: p.expr }); payOnce('preset:' + p.expr, 3, 'Truth table explored'); },

                      className: "px-2.5 py-1 bg-white border border-violet-200 hover:border-violet-400 text-violet-600 text-xs font-bold rounded-full transition-all hover:shadow-sm"

                    }, p.label);

                  })

                )

              ),



              // Tautology/Contradiction XP
              (function() {
                var _t2 = genTable(expr);
                if (!_t2 || _t2.type === 'contingency') return null;
                var claimKey = 'claim:' + _t2.type + ':' + expr.replace(/\s+/g, '');
                var claimed = !window.StemLab.grading.creditOnce(d.xpCredited, claimKey).isNew;
                return React.createElement("div", { className: "flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200" },
                  React.createElement("span", { className: "text-xl" }, _t2.type === 'tautology' ? '\uD83C\uDF89' : '\uD83D\uDCA5'),
                  React.createElement("span", { className: "font-black text-amber-800 text-sm flex-1" },
                    _t2.type === 'tautology' ? 'Always TRUE! You found a tautology!' : 'Always FALSE! You found a contradiction!'
                  ),
                  claimed ? React.createElement("span", { className: "px-4 py-2 text-xs font-black text-amber-800" }, t('stem.logiclab.xp_claimed', '\u2713 XP claimed')) :
                  React.createElement("button", { "aria-label": t('stem.logiclab.claim_xp', "Claim XP"),
                    onClick: function() {
                      var xp = _t2.type === 'tautology' ? 10 : 5;
                      if (!payOnce(claimKey, xp, 'Found '+_t2.type)) return;
                      if (stemCelebrate) stemCelebrate();
                      if (addToast) addToast('\uD83C\uDF1F +'+xp+' XP for the '+_t2.type+'!', 'success');
                    },
                    className: "px-4 py-2 text-xs font-black text-white rounded-xl",
                    style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #b45309, #92400e)', color: isContrast ? '#ffff00' : '#ffffff', border: isContrast ? '2px solid #ffff00' : 'none', boxShadow: isContrast ? 'none' : '0 2px 8px rgba(180,83,9,0.3)' }
                  }, t('stem.logiclab.claim_xp_2', '\uD83C\uDF1F Claim XP'))
                );
              })(),

              // Live Expression Syntax Tree (AST) SVG — makes operator precedence visually immediate
              (function() {
                try {
                  var toksAst = tokenize(expr);
                  if (!toksAst || toksAst.length === 0 || tableLetterCount(expr) > 8) return null;
                  var parsedAst = parseExpr(toksAst, 0);
                  if (!parsedAst || !parsedAst.node || parsedAst.pos !== toksAst.length) return null;
                  var nodes = [];
                  var edges = [];
                  var maxDepth = 0;
                  var walkAst = function(nd, depth, xMin, xMax) {
                    if (!nd || depth > 5) return null;
                    if (depth > maxDepth) maxDepth = depth;
                    var cx = Math.round((xMin + xMax) / 2);
                    var cy = 24 + depth * 36;
                    var id = nodes.length;
                    var label = nd.type === 'var' ? nd.name : (nd.type === 'not' ? '\u00AC' : nd.op);
                    var kind = nd.type === 'var' ? 'var' : (nd.type === 'not' ? 'not' : 'bin');
                    nodes.push({ id: id, x: cx, y: cy, label: label, kind: kind });
                    if (nd.type === 'not' && nd.child) {
                      var cid = walkAst(nd.child, depth + 1, xMin, xMax);
                      if (cid !== null) edges.push({ x1: cx, y1: cy, x2: nodes[cid].x, y2: nodes[cid].y });
                    } else if (nd.type === 'bin') {
                      var mid = (xMin + xMax) / 2;
                      var lid = walkAst(nd.left, depth + 1, xMin, mid);
                      var rid = walkAst(nd.right, depth + 1, mid, xMax);
                      if (lid !== null) edges.push({ x1: cx, y1: cy, x2: nodes[lid].x, y2: nodes[lid].y });
                      if (rid !== null) edges.push({ x1: cx, y1: cy, x2: nodes[rid].x, y2: nodes[rid].y });
                    }
                    return id;
                  };
                  walkAst(parsedAst.node, 0, 24, 396);
                  var svgH = Math.max(66, 48 + maxDepth * 36);
                  return React.createElement("div", {
                    className: "rounded-2xl border-2 p-3",
                    style: { background: llCardBg, borderColor: llBorder }
                  },
                    React.createElement("div", { className: "flex items-center justify-between gap-2 flex-wrap mb-2" },
                      React.createElement("span", { className: "text-xs font-black uppercase tracking-wider", style: { color: isContrast ? '#ffff00' : (isDark ? '#c4b5fd' : '#5b21b6') } }, t('stem.logiclab.ast_heading', '\uD83C\uDF33 Parse Tree (Operator Precedence)')),
                      React.createElement("span", { className: "text-[0.6875rem] font-mono", style: { color: llMuted } }, '\u00AC > \u2227 > \u2228 > \u2192 > \u2194')
                    ),
                    React.createElement("svg", {
                      viewBox: "0 0 420 " + svgH,
                      width: "100%",
                      style: { maxHeight: 190, display: 'block', borderRadius: 10 },
                      role: "img",
                      "aria-label": t('stem.logiclab.ast_aria', 'Syntax parse tree for expression ') + expr
                    },
                      !isContrast && React.createElement("defs", null,
                        React.createElement("pattern", { id: "ll-ast-grid", width: 20, height: 20, patternUnits: "userSpaceOnUse" },
                          React.createElement("circle", { cx: 10, cy: 10, r: 0.85, fill: isDark ? "#334155" : "#cbd5e1", opacity: isDark ? 0.45 : 0.6 })
                        ),
                        React.createElement("radialGradient", { id: "ll-ast-gloss", cx: "32%", cy: "26%", r: "70%" },
                          React.createElement("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: 0.52 }),
                          React.createElement("stop", { offset: "55%", stopColor: "#ffffff", stopOpacity: 0 }),
                          React.createElement("stop", { offset: "100%", stopColor: "#020617", stopOpacity: 0.28 })
                        )
                      ),
                      !isContrast && React.createElement("rect", { x: 0, y: 0, width: 420, height: svgH, rx: 10, fill: isDark ? "#0f172a" : "#f8fafc" }),
                      !isContrast && React.createElement("rect", { x: 0, y: 0, width: 420, height: svgH, rx: 10, fill: "url(#ll-ast-grid)" }),
                      edges.map(function(e, ei) {
                        var midY = (e.y1 + e.y2) * 0.5;
                        var pathD = "M " + e.x1 + " " + e.y1 + " C " + e.x1 + " " + midY + ", " + e.x2 + " " + midY + ", " + e.x2 + " " + e.y2;
                        return React.createElement("g", { key: "ae" + ei },
                          !isContrast && React.createElement("path", { d: pathD, fill: "none", stroke: isDark ? "#818cf8" : "#a78bfa", strokeWidth: 5, opacity: 0.18 }),
                          React.createElement("path", {
                            d: pathD, fill: "none",
                            stroke: isContrast ? '#ffff00' : (isDark ? '#818cf8' : '#7c3aed'),
                            strokeWidth: 2.2
                          })
                        );
                      }),
                      nodes.map(function(n) {
                        var fill = isContrast
                          ? (n.kind === 'var' ? '#000000' : '#00ff00')
                          : (_symColor[n.label] || '#6366f1');
                        var textFill = isContrast ? (n.kind === 'var' ? '#ffff00' : '#000000') : '#ffffff';
                        var isRoot = n.id === 0;
                        return React.createElement("g", { key: "an" + n.id },
                          isRoot && !isContrast && React.createElement("circle", { cx: n.x, cy: n.y, r: 20, fill: fill, opacity: 0.22 }),
                          !isContrast && React.createElement("circle", { cx: n.x + 1, cy: n.y + 2, r: 14, fill: "rgba(15,23,42,0.28)" }),
                          React.createElement("circle", {
                            cx: n.x, cy: n.y, r: 14,
                            fill: fill,
                            stroke: isContrast ? '#ffff00' : '#ffffff',
                            strokeWidth: isRoot ? 2.4 : 1.8
                          }),
                          !isContrast && React.createElement("circle", { cx: n.x, cy: n.y, r: 14, fill: "url(#ll-ast-gloss)" }),
                          React.createElement("text", {
                            x: n.x, y: n.y + 4.5,
                            textAnchor: "middle",
                            fontSize: 12,
                            fontWeight: 900,
                            fill: textFill
                          }, n.label)
                        );
                      })
                    )
                  );
                } catch (e) { return null; }
              })(),

              // Truth table output

              (function() {

                var table = genTable(expr);

                // text-slate-600 on the dark tool shell is ~2:1. Use the theme var so the
                // empty state stays readable in light, dark and high-contrast.
                if (!table && tableLetterCount(expr) > 8) return React.createElement("div", { role: "status", "data-logic-too-many": "true", className: "p-8 text-center text-sm", style: { color: 'var(--allo-stem-text-soft, #475569)' } }, t('stem.logiclab.too_many_letters', 'This formula uses {n} different letters. A truth table doubles with each letter, so this lab stops at 8 letters, or 256 rows. Try a formula with fewer letters.').replace('{n}', tableLetterCount(expr)));
            if (!table) return React.createElement("div", { className: "p-8 text-center text-sm", style: { color: 'var(--allo-stem-text-soft, #475569)' } }, t('stem.logiclab.enter_an_expression_above_to_generate_', "Enter an expression above to generate a truth table"));

                var typeBadge = table.type === 'tautology' ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: t('stem.logiclab.tautology_always_true', '\u2705 Tautology (always true)'), glow: '0 0 20px rgba(16,185,129,0.3)' }

                  : table.type === 'contradiction' ? { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('stem.logiclab.contradiction_always_false', '\u274C Contradiction (always false)'), glow: '0 0 20px rgba(239,68,68,0.3)' }

                  : { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: t('stem.logiclab.contingency_sometimes_true', '\u26A0\uFE0F Contingency (sometimes true)'), glow: 'none' };



                return React.createElement("div", { className: "rounded-2xl border-2 border-violet-200 overflow-hidden", style: { background: _gCard } },

                  // Badge

                  React.createElement("div", { className: "px-5 py-3 flex items-center justify-between" },

                    React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, t('stem.logiclab.truth_table', "\uD83D\uDCCA Truth Table")),

                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black border " + typeBadge.bg + " " + typeBadge.text + " " + typeBadge.border, style: { boxShadow: typeBadge.glow } }, typeBadge.label),

                    _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.ai_explain_truth_table_expression', "AI explain truth table expression"),

                      onClick: function() {

                        if (aiExplain) { upd({ aiExplain: '' }); return; }

                        aiExplainCall('Explain the propositional logic expression: ' + expr + '. It is a ' + table.type + '. Include: (1) what it means in plain English, (2) why it is a ' + table.type + ', (3) a real-world analogy' + (userTopic ? ' using ' + userTopic : '') + '. Keep it under 4 sentences. Use simple language suitable for a student.');

                      },

                      className: "px-3 py-1 rounded-full text-xs font-bold border transition-all " + (aiExplain ? "bg-purple-100 text-purple-700 border-purple-600" : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100"),

                      disabled: aiLoading,

                    'aria-busy': aiLoading

                    }, aiExplain ? "\u25B2 Hide" : "\uD83E\uDDE0 Explain")

                  ),

                  aiExplain && React.createElement("div", { className: "mx-4 mb-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-sm text-purple-800 leading-relaxed" },

                    React.createElement("span", { className: "font-bold" }, t('stem.logiclab.ai_explanation', "\uD83E\uDD16 AI Explanation: ")),

                    aiExplain

                  ),

                  // Table

                  React.createElement("div", { className: "overflow-x-auto px-4 pb-4" },

                    React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                      React.createElement("caption", { className: "sr-only" }, t('stem.logiclab.logiclab_data_table', "logiclab data table")), React.createElement("thead", null,

                        React.createElement("tr", null,

                          table.vars.map(function(v) {

                            return React.createElement("th", { scope: "col", key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100 first:rounded-l-lg last:rounded-r-lg" }, v);

                          }),

                          React.createElement("th", { scope: "col", className: "px-4 py-2 text-white font-black text-center rounded-lg", style: { background: _gViolet } }, expr)

                        )

                      ),

                      React.createElement("tbody", null,

                        table.rows.map(function(row, ri) {

                          return React.createElement("tr", { key: ri, className: "group" },

                            table.vars.map(function(v) {

                              return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white group-hover:bg-violet-50 transition-colors " + (row.env[v] ? "text-emerald-600" : "text-slate-600") },

                                row.env[v] ? "T" : "F"

                              );

                            }),

                            React.createElement("td", { key: "result", className: "px-4 py-2 text-center font-black transition-colors " + (row.result ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" : "bg-red-50 text-red-700 group-hover:bg-red-100") },

                              row.result ? "\u2705 T" : "\u274C F"

                            )

                          );

                        })

                      )

                    ),
                    // \u2500\u2500 Row stats: T/F counts + visual ratio bar \u2500\u2500
                    // Quick read on the table's character: how often the expression is satisfied.
                    (function() {
                      var trueCount = table.rows.filter(function(r) { return r.result; }).length;
                      var falseCount = table.rows.length - trueCount;
                      var truePct = (trueCount / table.rows.length) * 100;
                      return React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-2 border border-slate-200" },
                        React.createElement("div", { className: "flex items-center justify-between text-[0.6875rem] font-bold mb-1.5" },
                          React.createElement("span", { className: "text-emerald-700" }, "\u2713 True: " + trueCount + " / " + table.rows.length + " rows"),
                          React.createElement("span", { className: "text-slate-500 font-mono" }, truePct.toFixed(0) + "% satisfied"),
                          React.createElement("span", { className: isDark ? "text-red-400" : "text-red-700" }, "\u2717 False: " + falseCount + " / " + table.rows.length + " rows")
                        ),
                        React.createElement("div", { className: "h-2 rounded-full overflow-hidden flex bg-red-100" },
                          React.createElement("div", { className: "bg-gradient-to-r from-emerald-400 to-emerald-500", style: { width: truePct + '%', transition: 'width 0.3s' } })
                        )
                      );
                    })()

                  )

                );

              })()

            ),





            // ═══ MODE 2: PROOF BUILDER ═══

            mode === 'proof' && React.createElement("div", { className: "space-y-4" },

              // Challenge selector

              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83C\uDFAF"),

                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, t('stem.logiclab.proof_challenges', "Proof Challenges")),

                  proofComplete && React.createElement("span", { className: "ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full border border-emerald-300" }, t('stem.logiclab.complete', "\uD83C\uDF89 Complete!"))

                ),

                React.createElement("div", { className: "grid grid-cols-5 gap-2" },

                  PROOF_CHALLENGES.map(function(ch, ci) {

                    var isActive = ci === currentChallenge;

                    // Solved, not merely passed over: selecting Level 4 used to tick L1-L3.
                    var isCompleted = !!(d.solvedProofs && d.solvedProofs['L' + ci]) || (ci === currentChallenge && proofComplete && !aiProof);

                    return React.createElement("button", { "aria-label": "Select proof challenge: Level " + (ci + 1),

                      key: ci,

                      onClick: function() { upd({ currentChallenge: ci, proofSteps: [], proofComplete: false, aiProof: null, selectedSteps: [], fallacyNote: null }); },

                      className: "p-3 rounded-xl text-center transition-all " + (isActive ? "ring-2 ring-violet-500 shadow-lg" : "hover:shadow-md"),

                      style: isContrast
                        ? { background: '#000000', border: isCompleted ? '2px solid #00ff00' : '2px solid #ffff00' }
                        : isDark
                          ? { background: isCompleted ? '#064e3b' : isActive ? '#1e293b' : '#1e1b4b', border: isCompleted ? '2px solid #34d399' : '2px solid #4c1d95' }
                          : { background: isCompleted ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : isActive ? 'white' : '#f5f3ff', border: isCompleted ? '2px solid #6ee7b7' : '2px solid #e9d5ff' }

                    },

                      React.createElement("div", { className: "text-lg font-black " + (isCompleted ? "text-emerald-600" : "text-violet-700") }, isCompleted ? "\u2714" : "L" + ch.level),

                      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-600 mt-0.5" }, ch.title)

                    );

                  })

                ),

                // AI Proof Generator

                React.createElement("div", { className: "mt-3 flex items-center gap-2" },

                  _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.ai_generate_proof_challenge', "AI-Generate Proof Challenge"),

                    onClick: function() {

                      var diff = (currentChallenge || 0) + 1;

                      aiGenerate('Generate a propositional logic proof challenge' + topicClause() + '. Use ONLY variables P, Q, R, S. Use ONLY connectives: \u2192 (implies), \u2227 (and), \u2228 (or), \u00AC (not). Difficulty level: ' + diff + ' out of 5. The premises should be solvable using standard inference rules (Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism, Conjunction, Simplification). Return ONLY valid JSON: {"level":' + diff + ',"title":"<creative title>","premises":["<prop1>","<prop2>"],"conclusion":"<target>","hint":"<which rules to use>","context":"<1 sentence real-world framing>"}', 'aiProof');

                      upd({ proofSteps: [], proofComplete: false, selectedSteps: [] });

                    },

                    className: "px-4 py-2 text-xs font-bold rounded-xl transition-all",

                    style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                    disabled: aiLoading,

                  'aria-busy': aiLoading

                  }, t('stem.logiclab.ai_generate_proof_challenge_2', "\uD83E\uDD16 AI-Generate Proof Challenge")),

                  aiLoading && React.createElement("span", { className: "text-xs text-violet-700 font-bold" }, "Generating..."),

                  aiProof && React.createElement("button", { "aria-label": t('stem.logiclab.clear_ai', "Clear AI"),

                    onClick: function() { upd({ aiProof: null, proofSteps: [], proofComplete: false, selectedSteps: [], fallacyNote: null }); },

                    className: "text-xs text-red-400 hover:text-red-600 font-bold"

                  }, t('stem.logiclab.clear_ai_2', "\u2715 Clear AI"))

                )

              ),



              // Active proof workspace

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },

                // Left: Premises + Proof

                React.createElement("div", { className: "lg:col-span-2 space-y-3" },

                  // Premises

                  React.createElement("div", { className: "p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50" },

                    React.createElement("h4", { className: "text-xs font-black text-indigo-600 uppercase tracking-wider mb-2" }, t('stem.logiclab.premises_given', "\uD83D\uDCCB Premises (Given)")),

                    activeCh.premises.map(function(p, pi) {

                      var isSelected = (Array.isArray(d.selectedSteps) ? d.selectedSteps : []).indexOf('P' + pi) !== -1;

                      return React.createElement("button", { "aria-label": t('stem.logiclab.drag_or_click_to_select', "Drag or click to select"),
                        key: pi, draggable: true,
                        onDragStart: function(e) { _drag.proofKey = 'P'+pi; e.dataTransfer.effectAllowed='move'; },
                        onClick: function() {
                          var sel = (Array.isArray(d.selectedSteps) ? d.selectedSteps : []).slice();
                          var idx = sel.indexOf('P'+pi);
                          if (idx !== -1) sel.splice(idx, 1); else sel.push('P'+pi);
                          upd({ selectedSteps: sel });
                        },
                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-indigo-200 ring-2 ring-indigo-500 shadow-md" : "bg-white hover:bg-indigo-100 border border-indigo-200"),
                        title: t('stem.logiclab.drag_or_click_to_select_2', "Drag or click to select")
                      },

                        React.createElement("span", { className: isDark ? "text-xs font-black text-indigo-300 w-6" : "text-xs font-black text-indigo-700 w-6" }, "P" + (pi + 1)),

                        React.createElement("code", { className: isDark ? "font-mono font-bold text-indigo-200 flex-1" : "font-mono font-bold text-indigo-800 flex-1" }, p),

                        isSelected && React.createElement("span", { className: "text-indigo-600 text-xs font-black" }, "\u2714")

                      );

                    }),

                    React.createElement("div", { className: "mt-2 pt-2 border-t border-indigo-200 flex items-center gap-2" },

                      React.createElement("span", { className: "text-xs font-bold", style: { color: isContrast ? '#ffff00' : '#3730a3' } }, "Goal:"),

                      React.createElement("code", { className: "font-mono font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-lg" }, activeCh.conclusion)

                    ),

                    activeCh.context && React.createElement("div", { className: "mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200 text-[0.6875rem] text-purple-700 italic flex items-center gap-1" },

                      React.createElement("span", null, "\uD83E\uDD16"),

                      activeCh.context

                    )

                  ),



                  // Proof Steps

                  proofSteps.length > 0 && React.createElement("div", { className: "p-4 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                    React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-2" }, t('stem.logiclab.derivation', "\uD83D\uDD17 Derivation")),

                    proofSteps.map(function(step, si) {

                      var isSelected = (Array.isArray(d.selectedSteps) ? d.selectedSteps : []).indexOf('S' + si) !== -1;

                      return React.createElement("button", { "aria-label": "Select derivation step " + (si + 1) + ": " + step.result,
                        key: si,
                        style: { animation: si === proofSteps.length-1 ? 'logicPop 0.3s ease-out' : 'none' },
                        onClick: function() {

                          var sel = (Array.isArray(d.selectedSteps) ? d.selectedSteps : []).slice();

                          var idx = sel.indexOf('S' + si);

                          if (idx !== -1) sel.splice(idx, 1); else sel.push('S' + si);

                          upd({ selectedSteps: sel });

                        },

                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-violet-200 ring-2 ring-violet-500 shadow-md" : "bg-white hover:bg-violet-50 border border-violet-200")

                      },

                        React.createElement("span", { className: "text-xs font-black text-violet-700 w-6" }, (si + 1) + "."),

                        React.createElement("code", { className: "font-mono font-bold text-violet-800 flex-1" }, step.result),

                        React.createElement("span", { className: "text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded" }, step.rule),

                        step.result === activeCh.conclusion && React.createElement("span", { className: "text-emerald-500 font-black text-sm" }, "\uD83C\uDF89")

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-2" },

                      React.createElement("button", { "aria-label": t('stem.logiclab.undo', "Undo"),

                        onClick: function() {

                          var newSteps = proofSteps.slice(0, -1);

                          // Clear the selection too: a kept "S<n>" pointing at the removed
                          // step crashed the next rule click (reading .result of undefined).
                          upd({ proofSteps: newSteps, proofComplete: false, selectedSteps: [] });

                        },

                        className: "px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all",

                        disabled: proofSteps.length === 0

                      }, t('stem.logiclab.undo_2', "\u21A9 Undo")),

                      React.createElement("button", { "aria-label": t('stem.logiclab.reset_proof_steps', "Reset proof steps"),

                        onClick: function() { upd({ proofSteps: [], proofComplete: false, selectedSteps: [], fallacyNote: null }); },

                        className: "px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-400 rounded-lg transition-all"

                      }, t('stem.logiclab.reset', "\uD83D\uDD04 Reset"))

                    )

                  ),



                  // Hint

                  React.createElement("button", { "aria-label": t('stem.logiclab.toggle_proof_hint', "Toggle proof hint"),

                    onClick: function() { upd({ showHint: !d.showHint }); },

                    className: isDark ? "text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors" : "text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors"

                  }, d.showHint ? "\uD83D\uDCA1 " + activeCh.hint : "\uD83D\uDCA1 Show Hint")

                ),



                // Right: Rules panel

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-1" }, t('stem.logiclab.inference_rules', "\uD83D\uDCDA Inference Rules")),

                  RULES.filter(function(rule) { return ruleVisible(rule.id); }).map(function(rule) {

                    return React.createElement("button", { "aria-label": "Apply rule: " + rule.name,

                      key: rule.id,

                      onClick: function() {

                        if (proofComplete) return;

                        var sel = Array.isArray(d.selectedSteps) ? d.selectedSteps : [];

                        if (sel.length < rule.needs) {

                          if (addToast) addToast('Select ' + rule.needs + ' statement(s) first, then click the rule.', 'info');

                          return;

                        }

                        // Gather selected statement texts (guard against stale indices)
                        var selTexts = sel.map(function(s) {
                          if (typeof s !== 'string') return '';
                          var idx = parseInt(s.substring(1), 10);
                          if (!isFinite(idx) || idx < 0) return '';
                          if (s[0] === 'P') return (activeCh && Array.isArray(activeCh.premises) && typeof activeCh.premises[idx] === 'string') ? activeCh.premises[idx] : '';
                          if (s[0] === 'S') return (proofSteps[idx] && typeof proofSteps[idx].result === 'string') ? proofSteps[idx].result : '';
                          return '';
                        }).filter(Boolean);
                        if (selTexts.length < rule.needs) {
                          upd({ selectedSteps: [] });
                          if (addToast) addToast('Select ' + rule.needs + ' statement(s) first, then click the rule.', 'info');
                          return;
                        }

                        var result = rule.check([], selTexts);

                        if (result) {

                          var newSteps = proofSteps.concat([{ result: result, rule: rule.name, from: sel.slice() }]);

                          var goal = propCanon(activeCh.conclusion);

                          var done = goal !== null && propCanon(result) === goal;

                          upd({ proofSteps: newSteps, selectedSteps: [], proofComplete: done, fallacyNote: null });

                          if (done) {
                            // Record the solve (the quests read this) and pay once per challenge:
                            // Undo + re-derive paid "Proof completed" again.
                            var solvedKey = aiProof ? 'ai:' + activeCh.premises.join('|') + '=>' + goal : 'L' + currentChallenge;
                            var solvedMap = d.solvedProofs && typeof d.solvedProofs === 'object' ? d.solvedProofs : {};
                            if (stemCelebrate) stemCelebrate();
                            if (stemBeep) stemBeep(880, 0.2);
                            if (!solvedMap[solvedKey]) {
                              var _xp = 5 + (activeCh.level || 1) * 3;
                              if (typeof awardStemXP === 'function') awardStemXP('logicLab', _xp, 'Proof completed');
                              if (addToast) addToast('\uD83C\uDF89 Proof complete! +' + _xp + ' XP', 'success');
                              upd({ score: score + _xp, solvedProofs: Object.assign({}, solvedMap, { [solvedKey]: true }) });
                            }
                          }

                        } else {

                          var fallacyMsg = diagnoseFallacy(selTexts);

                          upd({ fallacyNote: fallacyMsg });

                          if (fallacyMsg && typeof announceToSR === 'function') announceToSR(fallacyMsg);

                          if (addToast) addToast(fallacyMsg ? '\uD83D\uDEAB Fallacy spotted \u2014 see the note below the rules.' : '\u274C That rule doesn\'t apply to the selected statements.', 'warning');

                        }

                      },

                      className: "w-full p-3 rounded-xl text-left transition-all bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400 hover:shadow-sm"

                    },

                      React.createElement("div", { className: "font-bold text-violet-800 text-xs" }, rule.name),

                      React.createElement("div", { className: "text-[0.6875rem] font-mono text-slate-600 mt-0.5" }, rule.form),

                      React.createElement("div", { className: "text-[0.6875rem] text-slate-600 mt-0.5 italic" }, rule.eng)

                    );

                  }),

                  // Rule-palette toggle — visible only when the grade band hides rules
                  (function() {
                    var hiddenCount = RULES.filter(function(rule) { return !ruleVisible(rule.id); }).length;
                    if (hiddenCount === 0 && !showAllRules) return null;
                    if (showAllRules && _llBandRules !== null && !aiProof) {
                      return React.createElement("button", {
                        "aria-label": t('stem.logiclab.hide_advanced_rules', "Hide advanced rules"),
                        onClick: function() { upd({ showAllRules: false }); },
                        className: "w-full px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-violet-50 text-violet-600 border border-violet-300 hover:bg-violet-100 transition-all"
                      }, "🎯 Focus mode: show fewer rules");
                    }
                    if (hiddenCount > 0) {
                      return React.createElement("button", {
                        "aria-label": t('stem.logiclab.show_all_rules', "Show all inference rules"),
                        onClick: function() { upd({ showAllRules: true }); },
                        className: "w-full px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-slate-50 text-slate-600 border border-slate-300 hover:bg-violet-50 transition-all"
                      }, "🔓 Show " + hiddenCount + " advanced rule" + (hiddenCount > 1 ? "s" : ""));
                    }
                    return null;
                  })(),

                  // Fallacy note — appears when a failed rule application matches a
                  // classic invalid move; cleared on the next valid step or reset.
                  typeof d.fallacyNote === 'string' && d.fallacyNote && React.createElement("div", { className: "p-2.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-[0.6875rem] leading-relaxed text-amber-900", role: "status" },
                    React.createElement("span", { className: "font-black" }, "🚫 "),
                    d.fallacyNote
                  )

                )

              )

            ),





            // ═══ MODE 3: CHALLENGES ═══

            mode === 'challenges' && React.createElement("div", { className: "space-y-4" },

              // Score banner
              React.createElement("div", { className: "flex items-center gap-3 p-3 rounded-xl mb-2", style: { background: isContrast ? '#000000' : (isDark ? 'linear-gradient(to right, #1e1b4b, #312e81)' : 'linear-gradient(to right, #f5f3ff, #ede9fe)'), border: isContrast ? '2px solid #ffff00' : 'none' } },
                React.createElement("span", { className: "text-lg" }, "\uD83C\uDF1F"),
                React.createElement("span", { className: "font-black text-violet-800 text-sm" }, "Score: " + score),
                React.createElement("span", { className: "text-violet-300 font-bold" }, "|"),
                React.createElement("span", { className: "font-black text-amber-600 text-sm" }, "\uD83D\uDD25 Streak: " + streak + " (Best: " + bestStreak + ")"),
                React.createElement("button", { "aria-label": t('stem.logiclab.reset_challenge_score', "Reset challenge score"), onClick: function(){upd({score:0,streak:0,bestStreak:0});}, className: "ml-auto text-[0.6875rem] text-slate-600 hover:text-red-400 font-bold" }, t('stem.logiclab.reset_2', "Reset"))
              ),

              // Challenge type tabs
              React.createElement("div", { className: "flex gap-2 justify-center" },

                [['fallacy', '\uD83D\uDD0D', 'Fallacy Spotter'], ['quickfire', '\u23F1\uFE0F', 'Quick-Fire Tables'], ['detective', '\uD83D\uDD75\uFE0F', 'Reasoning']].map(function(ct) {

                  var active = challengeMode === ct[0];

                  return React.createElement("button", { "aria-label": "Switch to " + ct[2] + " challenge mode",

                    key: ct[0],

                    onClick: function() { upd({ challengeMode: ct[0], challengeIdx: 0, challengeAnswer: null, aiChallengeAnswer: null, qfAnswers: {} }); },

                    className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (active ? "bg-violet-600 text-white shadow-lg" : "bg-violet-50 text-violet-600 hover:bg-violet-100")

                  }, ct[1] + " " + ct[2]);

                })

              ),

              // ── Topic personalization input ──

              React.createElement("div", { className: "flex items-center gap-2 p-3 rounded-xl border border-violet-200 bg-violet-50/50" },

                React.createElement("span", { className: "text-base" }, "\uD83C\uDFAF"),

                React.createElement("input", {

                  type: "text",

                  value: userTopic,

                  onChange: function(e) { upd({ userTopic: e.target.value }); },

                  placeholder: t('stem.logiclab.your_interests_basketball_cooking_vide', "Your interests (basketball, cooking, video games...)"),

                  'aria-label': t('stem.logiclab.your_interests_for_ai_personalization', 'Your interests for AI personalization'),

                  className: "flex-1 px-3 py-1.5 rounded-lg border border-violet-500 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"

                }),

                userTopic && React.createElement("span", { className: "text-[0.6875rem] font-bold text-violet-700" }, t('stem.logiclab.ai_will_personalize', "AI will personalize \u2728"))

              ),

              // AI loading indicator

              aiLoading && React.createElement("div", { className: "flex items-center justify-center gap-2 p-3 bg-violet-100 rounded-xl border border-violet-200" },

                React.createElement("div", { className: "animate-spin w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full", role: "status", "aria-label": t('stem.logiclab.loading_ai_content', "Loading AI content") }),

                React.createElement("span", { className: "text-xs font-bold text-violet-600" }, t('stem.logiclab.generating_with_ai', "Generating with AI..."))

              ),



              // Fallacy Spotter

              challengeMode === 'fallacy' && (function() {

                var f = FALLACIES[challengeIdx % FALLACIES.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD0D"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.is_this_argument_valid', "Is this argument valid?")),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-700" }, ((challengeIdx % FALLACIES.length) + 1) + " / " + FALLACIES.length)

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + f.arg + '"'

                  ),

                  // Answer buttons

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": t('stem.logiclab.valid', "Valid"),
                      onClick: function() {
                        var correct = f.valid === true;
                        var ns = correct ? streak + 1 : 0; var nb = Math.max(bestStreak, ns);
                        upd({ challengeAnswer: correct ? 'correct' : 'wrong', streak: ns, bestStreak: nb, score: correct ? score + 10 + (ns > 2 ? ns : 0) : score, animTick: animTick + 1 });
                        if (correct) { if (stemBeep) stemBeep(660, 0.1); payOnce('fallacy:' + (challengeIdx % FALLACIES.length), 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 0.12); }
                      },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl border-2 border-emerald-600 transition-all hover:shadow-md text-sm"

                    }, t('stem.logiclab.valid_2', "\u2705 Valid")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.invalid_fallacy', "Invalid (Fallacy)"),
                      onClick: function() {
                        var correct = f.valid === false;
                        var ns = correct ? streak + 1 : 0; var nb = Math.max(bestStreak, ns);
                        upd({ challengeAnswer: correct ? 'correct' : 'wrong', streak: ns, bestStreak: nb, score: correct ? score + 10 + (ns > 2 ? ns : 0) : score, animTick: animTick + 1 });
                        if (correct) { if (stemBeep) stemBeep(660, 0.1); payOnce('fallacy:' + (challengeIdx % FALLACIES.length), 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 0.12); }
                      },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl border-2 border-red-600 transition-all hover:shadow-md text-sm"

                    }, t('stem.logiclab.invalid_fallacy_2', "\u274C Invalid (Fallacy)"))

                  ),

                  // Feedback

                  challengeAnswer && React.createElement("div", {
                    className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"),
                    style: { animation: 'logicPop 0.3s ease-out' }
                  },
                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },
                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct! +" + (10 + (streak > 2 ? streak : 0)) + " pts" : "\u274C Not quite!"
                    ),
                    streak >= 3 && challengeAnswer === 'correct' && React.createElement("div", { className: "text-xs font-black text-amber-600 mb-1" }, "\uD83D\uDD25 " + streak + " in a row! Streak bonus!"),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, f.name + " — " + f.formal),

                    React.createElement("div", { className: "text-xs text-slate-600" }, f.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": t('stem.logiclab.next', "Next"),

                        onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiFallacy: null }); },

                        className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                      }, t('stem.logiclab.next_2', "Next \u2192")),

                      _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.ai_generate', "AI Generate"),

                        onClick: function() {

                          aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                          upd({ aiChallengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading,

                      'aria-busy': aiLoading

                      }, t('stem.logiclab.ai_generate_2', "\uD83E\uDD16 AI Generate"))

                    )

                  )

                );

              })(),

              // ── AI-generated fallacy card ──

              challengeMode === 'fallacy' && aiFallacy && !aiLoading && (function() {

                var af = aiFallacy;

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: isContrast ? '#000000' : (isDark ? 'linear-gradient(135deg, #1e1b4b, #2e1065, #1e1b4b)' : 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)'), borderColor: isContrast ? '#ffff00' : undefined } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83E\uDD16"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, t('stem.logiclab.ai_generated_is_this_argument_valid', "AI-Generated: Is this argument valid?")),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[0.6875rem] font-bold rounded-full border border-purple-200" }, t('stem.logiclab.ai', "\u2728 AI"))

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + af.arg + '"'

                  ),

                  aiChallengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": t('stem.logiclab.valid_3', "Valid"),

                      onClick: function() { var c = af.valid === true ? 'correct' : 'wrong'; upd({ aiChallengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm"

                    }, t('stem.logiclab.valid_4', "\u2705 Valid")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.invalid_fallacy_3', "Invalid (Fallacy)"),

                      onClick: function() { var c = af.valid === false ? 'correct' : 'wrong'; upd({ aiChallengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl border-2 border-red-600 transition-all text-sm"

                    }, t('stem.logiclab.invalid_fallacy_4', "\u274C Invalid (Fallacy)"))

                  ),

                  aiChallengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (aiChallengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (aiChallengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      aiChallengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, af.name + " \u2014 " + af.formal),

                    React.createElement("div", { className: "text-xs text-slate-600" }, af.explain),

                    _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.generate_another', "Generate Another"),

                      onClick: function() {

                        aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                        upd({ aiChallengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading,

                    'aria-busy': aiLoading

                    }, t('stem.logiclab.generate_another_2', "\uD83E\uDD16 Generate Another"))

                  )

                );

              })(),



              // Quick-fire Truth Tables

              challengeMode === 'quickfire' && (function() {

                var ch = TT_CHALLENGES[challengeIdx % TT_CHALLENGES.length];

                var table = genTable(ch.expr);

                if (!table) return null;

                var userAnswers = d.qfAnswers || {};

                var allFilled = table.rows.every(function(r, ri) { return userAnswers[ri] !== undefined; });

                var allCorrect = allFilled && table.rows.every(function(r, ri) { return userAnswers[ri] === r.result; });

                // Pay on the answer that completes an all-correct table. Paying in the render
                // tree paid again on every re-render; payOnce keys each card so Next cycling
                // back to it does not pay again (the game score still counts repeats).
                var answerQf = function(ri, value) {
                  var a = Object.assign({}, userAnswers); a[ri] = value;
                  upd({ qfAnswers: a });
                  var full = table.rows.every(function(r, k) { return a[k] !== undefined; });
                  if (!allFilled && full && table.rows.every(function(r, k) { return a[k] === r.result; })) payOnce('quickfire:' + (challengeIdx % TT_CHALLENGES.length), 3, 'Quick-fire completed');
                };



                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\u23F1\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.fill_the_result_column', "Fill the Result Column")),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-700" }, ch.desc)

                  ),

                  React.createElement("code", { className: "block text-center text-lg font-mono font-bold text-violet-800 mb-4 p-2 bg-white rounded-lg" }, ch.expr),

                  React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                    React.createElement("caption", { className: "sr-only" }, t('stem.logiclab.fill_the_result_column_2', "Fill the Result Column")), React.createElement("thead", null,

                      React.createElement("tr", null,

                        table.vars.map(function(v) { return React.createElement("th", { scope: "col", key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100" }, v); }),

                        React.createElement("th", { scope: "col", className: "px-4 py-2 text-white font-black text-center", style: { background: _gViolet } }, "Result?")

                      )

                    ),

                    React.createElement("tbody", null,

                      table.rows.map(function(row, ri) {

                        var ua = userAnswers[ri];

                        var showResult = ua !== undefined;

                        var isCorrect = ua === row.result;

                        return React.createElement("tr", { key: ri },

                          table.vars.map(function(v) { return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white " + (row.env[v] ? "text-emerald-600" : "text-slate-600") }, row.env[v] ? "T" : "F"); }),

                          React.createElement("td", { className: "px-4 py-2 text-center" },

                            showResult

                              ? React.createElement("span", { className: "font-black " + (isCorrect ? "text-emerald-600" : "text-red-500") }, (isCorrect ? "\u2705 " : "\u274C ") + (ua ? "T" : "F"))

                              : React.createElement("div", { className: "flex gap-1 justify-center" },

                                  React.createElement("button", { "aria-label": "T",

                                    onClick: function() { answerQf(ri, true); },

                                    className: "px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded text-xs"

                                  }, "T"),

                                  React.createElement("button", { "aria-label": "F",

                                    onClick: function() { answerQf(ri, false); },

                                    className: "px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded text-xs"

                                  }, "F")

                                )

                          )

                        );

                      })

                    )

                  ),

                  allFilled && React.createElement("div", { className: "mt-4 text-center" },

                    React.createElement("div", { className: "font-black text-sm mb-2 " + (allCorrect ? "text-emerald-600" : "text-amber-600") },

                      allCorrect ? "\uD83C\uDF89 Perfect! All correct!" : "\uD83E\uDD14 Some answers are incorrect. Check the red cells."

                    ),


                    React.createElement("button", { "aria-label": t('stem.logiclab.next_challenge', "Next Challenge"),

                      onClick: function() { upd({ challengeIdx: challengeIdx + 1, qfAnswers: {} }); },

                      className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                    }, t('stem.logiclab.next_challenge_2', "Next Challenge \u2192"))

                  )

                );

              })(),



              // Detective / Real-world reasoning

              challengeMode === 'detective' && (function() {

                var DETECTIVE = [

                  { scenario: 'Detective Jones has three clues:\n1. If the butler did it, the window is broken.\n2. If the maid did it, there are footprints in the garden.\n3. The window is NOT broken.', question: t('stem.logiclab.detective_did_the_butler_do_it', 'Did the butler do it?'), answer: false, rule: 'Modus Tollens', explain: 'Clue 1: Butler \u2192 Broken window. Clue 3: \u00ACBroken window. By Modus Tollens: \u00ACButler.' },

                  { scenario: t('stem.logiclab.detective_science_fair_scenario', 'At the science fair:\n1. If the volcano project wins, it gets a trophy.\n2. If it gets a trophy, it goes in the display case.\n3. The volcano project IS in the display case.'), question: t('stem.logiclab.detective_did_the_volcano_project_win', 'Did the volcano project win?'), answer: 'unknown', rule: t('stem.logiclab.detective_science_fair_rule', 'No rule applies. Concluding a win would be Affirming the Consequent (a fallacy).'), explain: t('stem.logiclab.detective_science_fair_explain', 'Wins \u2192 Trophy \u2192 Display case, and the project is in the display case. The clues never say that only winners go in the case, so both answers fit the clues.') },

                  { scenario: 'Lunch options:\n1. We are having pizza OR pasta.\n2. The pizza oven is broken (no pizza).', question: t('stem.logiclab.are_we_having_pasta', 'Are we having pasta?'), answer: true, rule: 'Disjunctive Syllogism', explain: 'Pizza\u2228Pasta, \u00ACPizza. By DS: Pasta. \u2714' },
                  { scenario: 'Animal mystery:\n1. If the creature has wings, it can fly.\n2. If it can fly, we would see it in the sky.\n3. We did NOT see anything in the sky.', question: t('stem.logiclab.detective_does_the_creature_have_wings', 'Does the creature have wings?'), answer: false, rule: 'HS + Modus Tollens', explain: 'Wings\u2192Fly\u2192Sky. HS: Wings\u2192Sky. MT with \u00ACSky: \u00ACWings. \u2714' },
                  { scenario: 'Treasure hunt:\n1. Gold is in Cave A or Cave B.\n2. Explorers searched Cave A \u2014 no gold there.', question: t('stem.logiclab.is_the_gold_in_cave_b', 'Is the gold in Cave B?'), answer: true, rule: 'Disjunctive Syllogism', explain: 'A\u2228B, \u00ACA. By DS: B. \u2714' },
                  { scenario: t('stem.logiclab.detective_weather_scenario', 'Weather:\n1. If there are dark clouds, it will rain.\n2. If it rains, the picnic is cancelled.\n3. There were NO dark clouds.'), question: t('stem.logiclab.detective_was_the_picnic_cancelled', 'Was the picnic cancelled?'), answer: 'unknown', rule: t('stem.logiclab.detective_weather_rule', 'No rule applies. Concluding the picnic went ahead would be Denying the Antecedent (a fallacy).'), explain: t('stem.logiclab.detective_weather_explain', 'Clouds \u2192 Rain \u2192 Cancel, and there were no dark clouds. The clues never say that rain needs dark clouds, and the picnic could be cancelled for another reason, so both answers fit the clues.') }
                ];

                var det = DETECTIVE[challengeIdx % DETECTIVE.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.real_world_reasoning', "Real-World Reasoning"))

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, det.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + det.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = det.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct') payOnce('detective:' + (challengeIdx % DETECTIVE.length), 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm" }, t('stem.logiclab.yes', "\u2705 Yes")),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = det.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct') payOnce('detective:' + (challengeIdx % DETECTIVE.length), 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl border-2 border-red-600 transition-all text-sm" }, t('stem.logiclab.no', "\u274C No")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.can_t_tell', "Can't tell"), onClick: function() { var c = det.answer === 'unknown' ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct') payOnce('detective:' + (challengeIdx % DETECTIVE.length), 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, t('stem.logiclab.can_t_tell_2', "\u2753 Can't tell"))

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + det.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, det.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiDetective: null }); }, className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all" }, t('stem.logiclab.next_3', "Next \u2192")),

                      _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.ai_mystery', "AI Mystery"),

                        onClick: function() {

                          aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                          upd({ aiChallengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading,

                      'aria-busy': aiLoading

                      }, t('stem.logiclab.ai_mystery_2', "\uD83D\uDD75\uFE0F AI Mystery"))

                    )

                  )

                );

              })(),

              // ── AI-generated detective scenario ──

              challengeMode === 'detective' && aiDetective && !aiLoading && (function() {

                var ad = aiDetective;

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: isContrast ? '#000000' : (isDark ? 'linear-gradient(135deg, #1e1b4b, #2e1065, #1e1b4b)' : 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)'), borderColor: isContrast ? '#ffff00' : undefined } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, t('stem.logiclab.ai_mystery_3', "AI Mystery")),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[0.6875rem] font-bold rounded-full border border-purple-200" }, t('stem.logiclab.ai_2', "\u2728 AI"))

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, ad.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + ad.question),

                  aiChallengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = ad.answer === true ? 'correct' : 'wrong'; upd({ aiChallengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm" }, t('stem.logiclab.yes_2', "\u2705 Yes")),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = ad.answer === false ? 'correct' : 'wrong'; upd({ aiChallengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl border-2 border-red-600 transition-all text-sm" }, t('stem.logiclab.no_2', "\u274C No")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.can_t_tell_3', "Can't tell"), onClick: function() { upd({ aiChallengeAnswer: 'wrong' }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, t('stem.logiclab.can_t_tell_4', "\u2753 Can't tell"))

                  ),

                  aiChallengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (aiChallengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (aiChallengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, aiChallengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + ad.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, ad.explain),

                    _aiOn && React.createElement("button", { "aria-label": t('stem.logiclab.generate_another_3', "Generate Another"),

                      onClick: function() {

                        aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                        upd({ aiChallengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading,

                    'aria-busy': aiLoading

                    }, t('stem.logiclab.generate_another_4', "\uD83D\uDD75\uFE0F Generate Another"))

                  )

                );

              })()

            ),



            // ═══ MODE 4: LOGIC GATES ═══
            mode === 'gates' && React.createElement("div", { className: "space-y-4" },
              React.createElement("div", { className: "p-5 rounded-2xl border-2", style: { background: _gCard, borderColor: llBorder } },
                React.createElement("div", { className: "flex items-center gap-2 mb-4 flex-wrap" },
                  React.createElement("span", { style: { fontSize: '20px' } }, "\u26A1\uFE0F"),
                  React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.logic_gate_simulator', "Logic Gate Simulator")),
                  React.createElement("span", { className: "text-xs text-violet-700 font-bold" }, t('stem.logiclab.toggle_inputs_to_see_the_output_live', "Toggle inputs to see the output live"))
                ),
                // Binary-state legend — clarifies what the 1s and 0s on the wires mean
                React.createElement("div", { className: "flex items-center gap-3 mb-4 text-[0.6875rem] font-bold flex-wrap" },
                  React.createElement("span", { className: "inline-flex items-center gap-1" }, React.createElement("span", { className: "inline-block w-4 h-4 rounded bg-emerald-700 text-white text-center leading-4" }, "1"), React.createElement("span", { className: "text-emerald-700" }, t('stem.logiclab.high_true_on', "HIGH · true · on"))),
                  React.createElement("span", { className: "inline-flex items-center gap-1" }, React.createElement("span", { className: "inline-block w-4 h-4 rounded bg-slate-300 text-slate-700 text-center leading-4" }, "0"), React.createElement("span", { className: "text-slate-600" }, t('stem.logiclab.low_false_off', "LOW · false · off")))
                ),
                // Gate selector
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                  GATE_TYPES.map(function(gt) {
                    var activeGt = gateType === gt;
                    return React.createElement("button", {
                      type: "button",
                      "aria-label": "Select logic gate: " + gt,
                      "aria-pressed": activeGt,
                      key: gt,
                      onClick: function(){upd({gateType:gt});if(stemBeep)stemBeep(440,0.05);},
                      className: "px-4 py-2 rounded-xl text-sm font-black transition-all border cursor-pointer",
                      style: activeGt
                        ? { background: isContrast ? '#00ff00' : 'linear-gradient(135deg,#6d28d9,#7c3aed)', color: isContrast ? '#000000' : '#ffffff', borderColor: isContrast ? '#00ff00' : '#6d28d9', boxShadow: isContrast ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }
                        : { background: llCardBg, color: isContrast ? '#ffff00' : (isDark ? '#ddd6fe' : '#5b21b6'), borderColor: llBorder }
                    }, gt);
                  })
                ),
                // Digital Breadboard Stage: Inputs + IEEE Gate SVG + Output
                React.createElement("div", {
                  className: "rounded-2xl border p-4 mb-4 flex items-center justify-center gap-6 flex-wrap",
                  style: { background: isContrast ? '#000000' : '#0f172a', borderColor: isContrast ? '#ffff00' : '#334155' }
                },
                  // Input toggles
                  React.createElement("div", { className: "flex flex-col gap-3" },
                    ['A', isUnaryGate ? null : 'B'].filter(Boolean).map(function(inp) {
                      var val = gateInputs[inp];
                      return React.createElement("div", { key: inp, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-xs font-black w-4", style: { color: isContrast ? '#ffff00' : '#cbd5e1' } }, inp),
                        React.createElement("button", {
                          type: "button",
                          "aria-label": "Toggle gate input " + inp + ": " + (val ? 'True to False' : 'False to True'),
                          "aria-pressed": val,
                          onClick: function() {
                            var ni = Object.assign({}, gateInputs); ni[inp] = !ni[inp];
                            upd({ gateInputs: ni });
                            if (stemBeep) stemBeep(val?330:523, 0.06);
                          },
                          className: "w-20 h-10 rounded-xl font-black text-sm shadow-md transition-all hover:scale-105 cursor-pointer border",
                          style: isContrast
                            ? { background: val ? '#00ff00' : '#000000', color: val ? '#000000' : '#ffff00', borderColor: '#ffff00' }
                            : { background: val ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#b91c1c,#dc2626)', color: '#ffffff', borderColor: val ? '#34d399' : '#f87171' }
                        }, val ? "1 (T)" : "0 (F)")
                      );
                    })
                  ),
                  // Gate SVG — PCB blueprint, dual-pass HIGH-signal copper/neon glow, bevel gate & glowing LED
                  React.createElement("svg", { role: 'img', 'aria-label': t('stem.logiclab.gate_img', 'Logic gate diagram showing the current input states'), width: "176", height: "104", viewBox: "0 0 132 82" },
                    !isContrast && React.createElement("defs", null,
                      React.createElement("pattern", { id: "ll-mini-pcb", width: "14", height: "14", patternUnits: "userSpaceOnUse" },
                        React.createElement("circle", { cx: "7", cy: "7", r: "0.75", fill: "#38bdf8", opacity: "0.26" })
                      ),
                      React.createElement("linearGradient", { id: "ll-mini-gate", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#7c3aed" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#3b0764" })
                      ),
                      React.createElement("radialGradient", { id: "ll-mini-led-on", cx: "35%", cy: "30%", r: "70%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#dcfce7" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#22c55e" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#14532d" })
                      ),
                      React.createElement("radialGradient", { id: "ll-mini-led-off", cx: "35%", cy: "30%", r: "70%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#fecaca" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#ef4444" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#7f1d1d" })
                      ),
                      React.createElement("radialGradient", { id: "ll-mini-halo-on", cx: "50%", cy: "50%", r: "50%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#4ade80", stopOpacity: "0.68" }),
                        React.createElement("stop", { offset: "55%", stopColor: "#22c55e", stopOpacity: "0.22" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#22c55e", stopOpacity: "0" })
                      ),
                      React.createElement("radialGradient", { id: "ll-mini-packet", cx: "50%", cy: "50%", r: "50%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: "1" }),
                        React.createElement("stop", { offset: "50%", stopColor: "#86efac", stopOpacity: "0.85" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#22c55e", stopOpacity: "0" })
                      )
                    ),
                    !isContrast && React.createElement("rect", { x: "1", y: "1", width: "130", height: "80", rx: "10", fill: "#0b1326", stroke: "#1e293b", strokeWidth: "1" }),
                    !isContrast && React.createElement("rect", { x: "2", y: "2", width: "128", height: "78", rx: "9", fill: "url(#ll-mini-pcb)" }),
                    // Input A wire (dual-pass glow + staggered energy pulse packets when HIGH)
                    gateInputs.A && !isContrast && React.createElement("line", { x1:"4",y1:isUnaryGate?"41":"26",x2:"38",y2:isUnaryGate?"41":"26",stroke:"#4ade80",strokeWidth:"8",strokeLinecap:"round",opacity:"0.26" }),
                    React.createElement("line", { x1:"4",y1:isUnaryGate?"41":"26",x2:"38",y2:isUnaryGate?"41":"26",stroke:gateInputs.A?(isContrast?"#00ff00":"#22c55e"):(isContrast?"#ffff00":"#ef4444"),strokeWidth:"3.5",strokeLinecap:"round" }),
                    gateInputs.A && !isContrast && React.createElement("g", { style:{animation:"llGatePulseIn 1.05s linear infinite"} },
                      React.createElement("ellipse", { cx:"7",cy:isUnaryGate?"41":"26",rx:"5.2",ry:"2.8",fill:"url(#ll-mini-packet)",opacity:"0.86" }),
                      React.createElement("circle", { cx:"8",cy:isUnaryGate?"41":"26",r:"2.2",fill:"#ffffff" })
                    ),
                    gateInputs.A && !isContrast && React.createElement("g", { style:{animation:"llGatePulseIn 1.05s linear 0.525s infinite"} },
                      React.createElement("ellipse", { cx:"7",cy:isUnaryGate?"41":"26",rx:"4.6",ry:"2.4",fill:"url(#ll-mini-packet)",opacity:"0.76" }),
                      React.createElement("circle", { cx:"8",cy:isUnaryGate?"41":"26",r:"1.8",fill:"#dcfce7" })
                    ),
                    // Input B wire
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("line", { x1:"4",y1:"56",x2:"38",y2:"56",stroke:"#4ade80",strokeWidth:"8",strokeLinecap:"round",opacity:"0.26" }),
                    !isUnaryGate && React.createElement("line", { x1:"4",y1:"56",x2:"38",y2:"56",stroke:gateInputs.B?(isContrast?"#00ff00":"#22c55e"):(isContrast?"#ffff00":"#ef4444"),strokeWidth:"3.5",strokeLinecap:"round" }),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("g", { style:{animation:"llGatePulseIn 1.05s linear 0.25s infinite"} },
                      React.createElement("ellipse", { cx:"7",cy:"56",rx:"5.2",ry:"2.8",fill:"url(#ll-mini-packet)",opacity:"0.86" }),
                      React.createElement("circle", { cx:"8",cy:"56",r:"2.2",fill:"#ffffff" })
                    ),
                    !isUnaryGate && gateInputs.B && !isContrast && React.createElement("g", { style:{animation:"llGatePulseIn 1.05s linear 0.775s infinite"} },
                      React.createElement("ellipse", { cx:"7",cy:"56",rx:"4.6",ry:"2.4",fill:"url(#ll-mini-packet)",opacity:"0.76" }),
                      React.createElement("circle", { cx:"8",cy:"56",r:"1.8",fill:"#dcfce7" })
                    ),
                    // Copper input & gate terminal solder pads with active resonance glints
                    !isContrast && React.createElement("g", null,
                      gateInputs.A && React.createElement("circle", { cx:"38",cy:isUnaryGate?"41":"26",r:"5.2",fill:"none",stroke:"#86efac",strokeWidth:"1.2",style:{animation:"llPinGlint 1.7s ease-in-out infinite"} }),
                      React.createElement("circle", { cx:"5",cy:isUnaryGate?"41":"26",r:"2.5",fill:"#0f172a",stroke:gateInputs.A?"#4ade80":"#f59e0b",strokeWidth:"1.2" }),
                      React.createElement("circle", { cx:"38",cy:isUnaryGate?"41":"26",r:"2.3",fill:gateInputs.A?"#dcfce7":"#0f172a",stroke:gateInputs.A?"#4ade80":"#f59e0b",strokeWidth:"1.2" }),
                      !isUnaryGate && gateInputs.B && React.createElement("circle", { cx:"38",cy:"56",r:"5.2",fill:"none",stroke:"#86efac",strokeWidth:"1.2",style:{animation:"llPinGlint 1.7s ease-in-out 0.3s infinite"} }),
                      !isUnaryGate && React.createElement("circle", { cx:"5",cy:"56",r:"2.5",fill:"#0f172a",stroke:gateInputs.B?"#4ade80":"#f59e0b",strokeWidth:"1.2" }),
                      !isUnaryGate && React.createElement("circle", { cx:"38",cy:"56",r:"2.3",fill:gateInputs.B?"#dcfce7":"#0f172a",stroke:gateInputs.B?"#4ade80":"#f59e0b",strokeWidth:"1.2" })
                    ),
                    // Gate state-transition flash halo & energized aura
                    !isContrast && gateOutput && React.createElement("circle", { cx:"64",cy:"41",r:"32",fill:"url(#ll-mini-halo-on)",opacity:"0.35",style:{animation:"llLedBreath 2.4s ease-in-out infinite"} }),
                    !isContrast && React.createElement("circle", {
                      key: "mini-flash-" + gateType + "-" + (gateOutput ? "1" : "0"),
                      cx:"64",cy:"41",r:"25",fill:"none",stroke:gateOutput?"#4ade80":"#a78bfa",strokeWidth:"2",
                      style:{transformOrigin:"64px 41px",animation:"llGateFlash 0.5s ease-out forwards"}
                    }),
                    (function() {
                      var inverting = gateType === 'NOT' || gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR';
                      var base = (gateType === 'AND' || gateType === 'NAND') ? 'and'
                               : (gateType === 'OR' || gateType === 'NOR') ? 'or'
                               : (gateType === 'XOR' || gateType === 'XNOR') ? 'xor' : 'not';
                      var fill = isContrast ? '#000000' : 'url(#ll-mini-gate)';
                      var stroke = isContrast ? '#ffff00' : (gateOutput ? '#86efac' : '#c4b5fd');
                      var bx = inverting ? 85 : 91;
                      var shapes = [];
                      if (base === 'and') {
                        var midx = bx - 25;
                        if (!isContrast) shapes.push(React.createElement('path', { key: 'sh', d: 'M39,18 L' + (midx + 1) + ',18 A25,25 0 0 1 ' + (midx + 1) + ',68 L39,68 Z', fill: 'rgba(2,6,23,0.55)' }));
                        shapes.push(React.createElement('path', { key: 'b', d: 'M38,16 L' + midx + ',16 A25,25 0 0 1 ' + midx + ',66 L38,66 Z', fill: fill, stroke: stroke, strokeWidth: 2.2 }));
                      } else if (base === 'or') {
                        if (!isContrast) shapes.push(React.createElement('path', { key: 'sh', d: 'M39,18 Q56,43 39,68 Q64,66 ' + (bx + 1) + ',43 Q64,20 39,18 Z', fill: 'rgba(2,6,23,0.55)' }));
                        shapes.push(React.createElement('path', { key: 'b', d: 'M38,16 Q55,41 38,66 Q63,64 ' + bx + ',41 Q63,18 38,16 Z', fill: fill, stroke: stroke, strokeWidth: 2.2 }));
                      } else if (base === 'xor') {
                        if (!isContrast) shapes.push(React.createElement('path', { key: 'sh', d: 'M43,18 Q60,43 43,68 Q68,66 ' + (bx + 1) + ',43 Q68,20 43,18 Z', fill: 'rgba(2,6,23,0.55)' }));
                        shapes.push(React.createElement('path', { key: 'b', d: 'M42,16 Q59,41 42,66 Q67,64 ' + bx + ',41 Q67,18 42,16 Z', fill: fill, stroke: stroke, strokeWidth: 2.2 }));
                        shapes.push(React.createElement('path', { key: 'x', d: 'M35,16 Q52,41 35,66', fill: 'none', stroke: stroke, strokeWidth: 2.2 }));
                      } else {
                        if (!isContrast) shapes.push(React.createElement('path', { key: 'sh', d: 'M42,19 L' + (bx + 1) + ',43 L42,67 Z', fill: 'rgba(2,6,23,0.55)' }));
                        shapes.push(React.createElement('path', { key: 'b', d: 'M41,17 L' + bx + ',41 L41,65 Z', fill: fill, stroke: stroke, strokeWidth: 2.2 }));
                      }
                      if (inverting) shapes.push(React.createElement('circle', { key: 'bub', cx: bx + 5, cy: 41, r: 4.2, fill: isContrast ? '#000000' : '#0f172a', stroke: isContrast ? '#00ff00' : (gateOutput ? '#4ade80' : '#c4b5fd'), strokeWidth: 2.2 }));
                      shapes.push(React.createElement('text', { key: 't', x: base === 'not' ? 55 : 61, y: 45, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#ffffff', fontWeight: '900', fontSize: '9' }, gateType));
                      return shapes;
                    })(),
                    // Output trace + terminal resonance pin + glowing LED dome with ambient halo bloom
                    gateOutput && !isContrast && React.createElement("line", { x1:"93",y1:"41",x2:"118",y2:"41",stroke:"#4ade80",strokeWidth:"8",strokeLinecap:"round",opacity:"0.28" }),
                    React.createElement("line", { x1:"93",y1:"41",x2:"118",y2:"41",stroke:gateOutput?(isContrast?"#00ff00":"#22c55e"):(isContrast?"#ffff00":"#ef4444"),strokeWidth:"3.5",strokeLinecap:"round" }),
                    gateOutput && !isContrast && React.createElement("circle", { cx:"93",cy:"41",r:"4.8",fill:"none",stroke:"#86efac",strokeWidth:"1.2",style:{animation:"llPinGlint 1.5s ease-in-out infinite"} }),
                    !isContrast && React.createElement("circle", { cx:"93",cy:"41",r:"2.2",fill:gateOutput?"#dcfce7":"#0f172a",stroke:gateOutput?"#4ade80":"#f59e0b",strokeWidth:"1.1" }),
                    gateOutput && !isContrast && React.createElement("g", { style:{animation:"llGatePulseOut 0.95s linear infinite"} },
                      React.createElement("ellipse", { cx:"95",cy:"41",rx:"5",ry:"2.8",fill:"url(#ll-mini-packet)",opacity:"0.88" }),
                      React.createElement("circle", { cx:"96",cy:"41",r:"2.3",fill:"#ffffff" })
                    ),
                    gateOutput && !isContrast && React.createElement("g", { style:{animation:"llGatePulseOut 0.95s linear 0.475s infinite"} },
                      React.createElement("ellipse", { cx:"95",cy:"41",rx:"4.4",ry:"2.3",fill:"url(#ll-mini-packet)",opacity:"0.75" }),
                      React.createElement("circle", { cx:"96",cy:"41",r:"1.8",fill:"#dcfce7" })
                    ),
                    gateOutput && !isContrast && React.createElement("circle", { cx:"120",cy:"41",r:"14",fill:"url(#ll-mini-halo-on)",opacity:"0.65",style:{animation:"llLedBreath 2.1s ease-in-out infinite"} }),
                    gateOutput && !isContrast && React.createElement("circle", { cx:"120",cy:"41",r:"9.5",fill:"url(#ll-mini-halo-on)" }),
                    React.createElement("circle", { cx:"120",cy:"41",r:"6",fill:gateOutput?(isContrast?"#00ff00":"url(#ll-mini-led-on)"):(isContrast?"#ffff00":"url(#ll-mini-led-off)"),stroke:isContrast?"#000000":(gateOutput?"#bbf7d0":"#fca5a5"),strokeWidth:"1.2" }),
                    !isContrast && React.createElement("circle", { cx:"118.2",cy:"39",r:"1.6",fill:"#ffffff",opacity:"0.75" })
                  ),
                  // Output
                  React.createElement("div", { className: "flex flex-col items-center gap-1" },
                    React.createElement("div", {
                      key: 'gate-'+animTick,
                      className: "w-20 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-2",
                      style: isContrast
                        ? { background: gateOutput ? '#00ff00' : '#000000', color: gateOutput ? '#000000' : '#ffff00', borderColor: '#ffff00' }
                        : { background: gateOutput ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#b91c1c,#dc2626)', color: '#ffffff', borderColor: gateOutput ? '#6ee7b7' : '#fca5a5', animation: 'logicPop 0.2s ease-out' }
                    }, gateOutput ? "1" : "0"),
                    React.createElement("span", { className: "text-xs font-bold", style: { color: isContrast ? '#ffff00' : '#cbd5e1' } }, t('stem.logiclab.output', "Output")),
                    React.createElement("span", { className: "text-sm font-black", style: { color: gateOutput ? (isContrast ? '#00ff00' : '#6ee7b7') : (isContrast ? '#ffff00' : '#fca5a5') } }, gateOutput ? "TRUE" : "FALSE")
                  )
                ),
                // Live 4-Row Digital Timing Waveform SVG
                (function() {
                  var states = isUnaryGate
                    ? [{ a: false, b: false, label: '0' }, { a: true, b: false, label: '1' }]
                    : [{ a: false, b: false, label: '00' }, { a: false, b: true, label: '01' }, { a: true, b: false, label: '10' }, { a: true, b: true, label: '11' }];
                  var stepW = Math.round(280 / states.length);
                  var buildWave = function(vals, yHi, yLo) {
                    var pts = [];
                    vals.forEach(function(v, i) {
                      var x0 = 56 + i * stepW;
                      var x1 = x0 + stepW;
                      var y = v ? yHi : yLo;
                      pts.push((i === 0 ? 'M ' : 'L ') + x0 + ' ' + y + ' L ' + x1 + ' ' + y);
                    });
                    return pts.join(' ');
                  };
                  var aVals = states.map(function(s) { return s.a; });
                  var bVals = states.map(function(s) { return s.b; });
                  var oVals = states.map(function(s) { return evalGate(gateType, s.a, s.b); });
                  var activeIdx = states.findIndex(function(s) { return s.a === gateInputs.A && (isUnaryGate || s.b === gateInputs.B); });
                  return React.createElement("div", {
                    className: "mb-4 rounded-xl border p-2.5",
                    style: { background: isContrast ? '#000000' : '#0f172a', borderColor: isContrast ? '#ffff00' : '#334155' }
                  },
                    React.createElement("div", { className: "flex items-center justify-between text-[0.6875rem] font-bold mb-1", style: { color: isContrast ? '#ffff00' : '#cbd5e1' } },
                      React.createElement("span", null, t('stem.logiclab.timing_waveform', 'Oscilloscope Timing Diagram (' + gateType + ')')),
                      React.createElement("span", { className: "font-mono", style: { color: isContrast ? '#00ff00' : '#67e8f9' } }, 'Active state highlighted')
                    ),
                    React.createElement("svg", {
                      viewBox: "0 0 360 112",
                      width: "100%",
                      role: "img",
                      "aria-label": gateType + " digital timing waveform across all input combinations"
                    },
                      !isContrast && React.createElement("defs", null,
                        React.createElement("linearGradient", { id: "ll-osc-active", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
                          React.createElement("stop", { offset: "0%", stopColor: "#8b5cf6", stopOpacity: 0.34 }),
                          React.createElement("stop", { offset: "100%", stopColor: "#22d3ee", stopOpacity: 0.16 })
                        )
                      ),
                      // Horizontal oscilloscope voltage reference rails (HIGH / LOW)
                      !isContrast && [14, 30, 44, 60, 74, 90].map(function(ry) {
                        return React.createElement("line", { key: "or-" + ry, x1: 56, y1: ry, x2: 336, y2: ry, stroke: "#1e293b", strokeWidth: 0.8 });
                      }),
                      activeIdx >= 0 && React.createElement("rect", {
                        x: 56 + activeIdx * stepW, y: 6, width: stepW, height: 92, rx: 4,
                        fill: isContrast ? '#00ff00' : 'url(#ll-osc-active)',
                        opacity: isContrast ? 0.22 : 1,
                        stroke: isContrast ? '#00ff00' : '#a78bfa', strokeWidth: 0.8, strokeOpacity: 0.45
                      }),
                      // Grid verticals
                      states.map(function(s, si) {
                        var gx = 56 + si * stepW;
                        return React.createElement("g", { key: "wg" + si },
                          React.createElement("line", { x1: gx, y1: 8, x2: gx, y2: 96, stroke: isContrast ? '#444444' : '#334155', strokeDasharray: '2 2' }),
                          React.createElement("text", { x: gx + stepW / 2, y: 108, textAnchor: "middle", fontSize: 9, fontWeight: 800, fill: si === activeIdx ? (isContrast ? '#00ff00' : '#fde047') : (isContrast ? '#ffff00' : '#94a3b8') }, s.label)
                        );
                      }),
                      // Wave A (dual-pass phosphor glow + active probe resonance glint)
                      React.createElement("text", { x: 14, y: 26, fontSize: 10, fontWeight: 900, fill: isContrast ? '#ffff00' : '#a78bfa' }, "A"),
                      !isContrast && React.createElement("path", { d: buildWave(aVals, 14, 30), fill: "none", stroke: '#a78bfa', strokeWidth: 6.5, opacity: 0.22, strokeLinejoin: "round" }),
                      React.createElement("path", { d: buildWave(aVals, 14, 30), fill: "none", stroke: isContrast ? '#ffff00' : '#a78bfa', strokeWidth: 2.5, strokeLinejoin: "round" }),
                      activeIdx >= 0 && React.createElement("g", null,
                        !isContrast && React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: aVals[activeIdx] ? 14 : 30, r: 6.4, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.2, style: { animation: 'llPinGlint 1.8s ease-in-out infinite' } }),
                        React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: aVals[activeIdx] ? 14 : 30, r: 3.4, fill: isContrast ? '#ffff00' : '#ddd6fe', stroke: '#0f172a', strokeWidth: 1 })
                      ),
                      // Wave B (for binary gates)
                      !isUnaryGate && React.createElement("g", null,
                        React.createElement("text", { x: 14, y: 56, fontSize: 10, fontWeight: 900, fill: isContrast ? '#ffff00' : '#38bdf8' }, "B"),
                        !isContrast && React.createElement("path", { d: buildWave(bVals, 44, 60), fill: "none", stroke: '#38bdf8', strokeWidth: 6.5, opacity: 0.22, strokeLinejoin: "round" }),
                        React.createElement("path", { d: buildWave(bVals, 44, 60), fill: "none", stroke: isContrast ? '#ffff00' : '#38bdf8', strokeWidth: 2.5, strokeLinejoin: "round" }),
                        activeIdx >= 0 && React.createElement("g", null,
                          !isContrast && React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: bVals[activeIdx] ? 44 : 60, r: 6.4, fill: 'none', stroke: '#7dd3fc', strokeWidth: 1.2, style: { animation: 'llPinGlint 1.8s ease-in-out 0.25s infinite' } }),
                          React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: bVals[activeIdx] ? 44 : 60, r: 3.4, fill: isContrast ? '#ffff00' : '#bae6fd', stroke: '#0f172a', strokeWidth: 1 })
                        )
                      ),
                      // Wave OUT (dual-pass emerald phosphor glow + ambient probe bloom)
                      React.createElement("text", { x: 14, y: 86, fontSize: 10, fontWeight: 900, fill: isContrast ? '#00ff00' : '#34d399' }, "OUT"),
                      !isContrast && React.createElement("path", { d: buildWave(oVals, 74, 90), fill: "none", stroke: '#34d399', strokeWidth: 7.5, opacity: 0.26, strokeLinejoin: "round" }),
                      React.createElement("path", { d: buildWave(oVals, 74, 90), fill: "none", stroke: isContrast ? '#00ff00' : '#34d399', strokeWidth: 3, strokeLinejoin: "round" }),
                      activeIdx >= 0 && React.createElement("g", null,
                        !isContrast && React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: oVals[activeIdx] ? 74 : 90, r: 9.5, fill: '#34d399', opacity: 0.22, style: { animation: 'llLedBreath 2s ease-in-out infinite' } }),
                        !isContrast && React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: oVals[activeIdx] ? 74 : 90, r: 6.8, fill: 'none', stroke: '#6ee7b7', strokeWidth: 1.3, style: { animation: 'llPinGlint 1.6s ease-in-out infinite' } }),
                        React.createElement("circle", { cx: 56 + activeIdx * stepW + stepW / 2, cy: oVals[activeIdx] ? 74 : 90, r: 3.8, fill: isContrast ? '#00ff00' : '#a7f3d0', stroke: '#0f172a', strokeWidth: 1.2 })
                      )
                    )
                  );
                })(),
                // Gate truth table
                (function() {
                  var rows2 = []; var vals = [false,true];
                  if (isUnaryGate) { vals.forEach(function(a){rows2.push({A:a,out:evalGate(gateType,a,false)});}); }
                  else { vals.forEach(function(a){vals.forEach(function(b){rows2.push({A:a,B:b,out:evalGate(gateType,a,b)});});}); }
                  return React.createElement("div", null,
                    React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA " + gateType + " Truth Table"),
                    React.createElement("table", { className: "text-sm", style:{borderCollapse:'separate',borderSpacing:'0 2px',maxWidth:'280px'} },
                      React.createElement("caption", { className: "sr-only" }, "\uD83D\uDCCA "), React.createElement("thead", null, React.createElement("tr", null,
                        React.createElement("th", { scope: "col", className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100 rounded-lg" }, "A"),
                        !isUnaryGate && React.createElement("th", { scope: "col", className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100 rounded-lg" }, "B"),
                        React.createElement("th", { scope: "col", className: "px-4 py-2 text-white font-black text-center rounded-lg", style:{background: isContrast ? '#000000' : 'linear-gradient(135deg,#6d28d9,#7c3aed)', border: isContrast ? '1px solid #ffff00' : 'none'} }, gateType)
                      )),
                      React.createElement("tbody", null,
                        rows2.map(function(r2,ri2) {
                          var isActive2 = r2.A===gateInputs.A && (isUnaryGate||r2.B===gateInputs.B);
                          return React.createElement("tr", { key:ri2, style:{background:isActive2?(isContrast?'#000000':(isDark?'#312e81':'#ede9fe')):'transparent'} },
                            React.createElement("td",{className:"px-4 py-2 text-center font-bold bg-white "+(r2.A?"text-emerald-600":"text-slate-600")},r2.A?"T":"F"),
                            !isUnaryGate&&React.createElement("td",{className:"px-4 py-2 text-center font-bold bg-white "+(r2.B?"text-emerald-600":"text-slate-600")},r2.B?"T":"F"),
                            React.createElement("td",{className:"px-4 py-2 text-center font-black "+(r2.out?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700")},r2.out?"\u2705 T":"\u274C F")
                          );
                        })
                      )
                    ),
                    // Open in truth tables
                    React.createElement("div", { className: "mt-3 p-3 bg-violet-50 rounded-xl border border-violet-200 flex items-center gap-2 flex-wrap" },
                      React.createElement("code", { className: "text-xs font-mono font-black text-violet-700" },
                        gateType==='AND'?'P \u2227 Q':gateType==='OR'?'P \u2228 Q':gateType==='NOT'?'\u00AC P':gateType==='NAND'?'\u00AC (P \u2227 Q)':gateType==='NOR'?'\u00AC (P \u2228 Q)':gateType==='XOR'?'P \u2295 Q':'\u00AC (P \u2295 Q)'
                      ),
                      React.createElement("button", { type: "button", "aria-label": t('stem.logiclab.open_in_truth_tables', "Open in Truth Tables"),
                        onClick: function() {
                          var fml = gateType==='AND'?'P \u2227 Q':gateType==='OR'?'P \u2228 Q':gateType==='NOT'?'\u00AC P':gateType==='NAND'?'\u00AC (P \u2227 Q)':gateType==='NOR'?'\u00AC (P \u2228 Q)':gateType==='XOR'?'P \u2295 Q':'\u00AC (P \u2295 Q)';
                          upd({ mode:'truth', expression: fml });
                          if (addToast) addToast('Opened in Truth Table builder!','info');
                        },
                        className: "ml-auto px-3 py-1 bg-violet-200 hover:bg-violet-300 text-violet-800 font-bold rounded-full text-[0.6875rem] cursor-pointer"
                      }, t('stem.logiclab.open_in_truth_tables_2', "\uD83D\uDCCA Open in Truth Tables \u2192"))
                    )
                  );
                })()
              )
            ),

            // === H7b'' inquiry widget: probability logic ===
            mode === 'simLogic' && (function() {
              var iq = d._simLogic || { pTrue: 70, qTrue: 70, threshold: 80, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd({ _simLogic: Object.assign({}, iq, patch) }); }
              var pAnd = (iq.pTrue * iq.qTrue) / 100;
              var pOr = iq.pTrue + iq.qTrue - pAnd;
              var state;
              if (pAnd > iq.threshold) state = 'bothCertain';
              else if (iq.pTrue > iq.threshold) state = 'pLikely';
              else if (pAnd < 5 && pOr < 5) state = 'contradiction';
              else state = 'inconclusive';
              var sm = {
                bothCertain:   { label: t('stem.logiclab.both_certain_p_q_likely', '✅ Both certain (P∧Q likely)'), color: isContrast ? '#00ff00' : (isDark ? '#6ee7b7' : '#047857'), bg: isContrast ? '#000000' : (isDark ? '#064e3b' : '#ecfdf5'), border: isContrast ? '#00ff00' : '#34d399' },
                pLikely:       { label: t('stem.logiclab.p_likely_q_uncertain', '🟡 P likely; Q uncertain'), color: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#92400e'), bg: isContrast ? '#000000' : (isDark ? '#451a03' : '#fffbeb'), border: isContrast ? '#ffff00' : '#f59e0b' },
                contradiction: { label: t('stem.logiclab.apparent_contradiction', '⚠️ Apparent contradiction'), color: isContrast ? '#ffff00' : (isDark ? '#fecaca' : '#991b1b'), bg: isContrast ? '#000000' : (isDark ? '#450a0a' : '#fef2f2'), border: isContrast ? '#ffff00' : '#f87171' },
                inconclusive:  { label: t('stem.logiclab.inconclusive', '🤔 Inconclusive'), color: isContrast ? '#00ff00' : (isDark ? '#67e8f9' : '#0e7490'), bg: isContrast ? '#000000' : (isDark ? '#083344' : '#ecfeff'), border: isContrast ? '#00ff00' : '#22d3ee' }
              }[state];
              var xThresh = 74 + Math.round((iq.threshold / 100) * 230);
              return React.createElement('div', { className: 'p-4 rounded-xl bg-white border border-violet-300 space-y-3' },
                React.createElement('h3', { className: 'text-sm font-black text-violet-700' }, t('stem.logiclab.probability_logic_discovery', '🎲 Probability logic discovery')),
                React.createElement('p', { className: 'text-xs text-slate-700' }, t('stem.logiclab.sliders_for_p_q_truth_probabilities_co', 'Sliders for P, Q truth probabilities, confidence threshold. Discrete 4-state inference outcome. No score, no reveal.')),
                React.createElement('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  React.createElement('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  React.createElement('div', { className: 'text-xs mt-1 font-mono', style: { color: llInk } }, 'P(P)=' + iq.pTrue + '%, P(Q)=' + iq.qTrue + '%, P(P\u2227Q)=' + pAnd.toFixed(0) + '%, P(P\u2228Q)=' + pOr.toFixed(0) + '%')
                ),
                // Proportional Probability Bar & Confidence Threshold SVG
                React.createElement('div', {
                  className: 'rounded-xl border p-2',
                  style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc'), borderColor: llBorder }
                },
                  React.createElement('svg', {
                    viewBox: '0 0 340 106',
                    width: '100%',
                    role: 'img',
                    'aria-label': 'Probability bars comparing P(P), P(Q), P(P and Q), and P(P or Q) against confidence threshold ' + iq.threshold + ' percent'
                  },
                    !isContrast && React.createElement('defs', null,
                      React.createElement('linearGradient', { id: 'll-pbar-gloss', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                        React.createElement('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.34 }),
                        React.createElement('stop', { offset: '55%', stopColor: '#ffffff', stopOpacity: 0.0 }),
                        React.createElement('stop', { offset: '100%', stopColor: '#020617', stopOpacity: 0.22 })
                      )
                    ),
                    !isContrast && [0, 25, 50, 75, 100].map(function(tk) {
                      var gx = 74 + Math.round((tk / 100) * 230);
                      return React.createElement('line', { key: 'ptk-' + tk, x1: gx, y1: 8, x2: gx, y2: 94, stroke: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.28)', strokeWidth: 0.8 });
                    }),
                    [
                      { label: 'P(P)', val: iq.pTrue, y: 12, color: isContrast ? '#ffff00' : '#7c3aed' },
                      { label: 'P(Q)', val: iq.qTrue, y: 34, color: isContrast ? '#ffff00' : '#2563eb' },
                      { label: 'P(P\u2227Q)', val: pAnd, y: 56, color: isContrast ? '#00ff00' : '#059669' },
                      { label: 'P(P\u2228Q)', val: pOr, y: 78, color: isContrast ? '#00ff00' : '#db2777' }
                    ].map(function(row) {
                      var w = Math.max(2, Math.round((row.val / 100) * 230));
                      return React.createElement('g', { key: row.label },
                        React.createElement('text', { x: 68, y: row.y + 11, textAnchor: 'end', fontSize: 10, fontWeight: 800, fill: llInk }, row.label),
                        React.createElement('rect', { x: 74, y: row.y, width: 230, height: 14, rx: 4, fill: isContrast ? '#222222' : (isDark ? '#1e293b' : '#e2e8f0') }),
                        React.createElement('rect', { x: 74, y: row.y, width: w, height: 14, rx: 4, fill: row.color }),
                        !isContrast && React.createElement('rect', { x: 74, y: row.y, width: w, height: 14, rx: 4, fill: 'url(#ll-pbar-gloss)' }),
                        React.createElement('text', { x: 310, y: row.y + 11, fontSize: 9.5, fontWeight: 800, fill: llInk }, Math.round(row.val) + '%')
                      );
                    }),
                    !isContrast && React.createElement('line', { x1: xThresh, y1: 6, x2: xThresh, y2: 96, stroke: '#ef4444', strokeWidth: 5.5, opacity: 0.2 }),
                    React.createElement('line', { x1: xThresh, y1: 6, x2: xThresh, y2: 96, stroke: isContrast ? '#00ff00' : '#dc2626', strokeWidth: 2, strokeDasharray: '4 2' }),
                    React.createElement('polygon', { points: xThresh + ',3 ' + (xThresh + 4) + ',8 ' + xThresh + ',13 ' + (xThresh - 4) + ',8', fill: isContrast ? '#00ff00' : '#ef4444' }),
                    React.createElement('text', { x: Math.min(295, Math.max(82, xThresh)), y: 104, textAnchor: 'middle', fontSize: 8.5, fontWeight: 900, fill: isContrast ? '#00ff00' : (isDark ? '#fca5a5' : '#b91c1c') }, 'Threshold ' + iq.threshold + '%')
                  )
                ),
                React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                  [{ k: 'pTrue', l: 'P truth %' }, { k: 'qTrue', l: 'Q truth %' }, { k: 'threshold', l: 'Confidence %' }].map(function(s) {
                    return React.createElement('div', { key: s.k },
                      React.createElement('label', { htmlFor: 'sl-' + s.k, className: 'block text-xs font-bold text-slate-700' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-violet-700' }, iq[s.k] + '%')),
                      React.createElement('input', { id: 'sl-' + s.k, type: 'range', min: 0, max: 100, step: 5, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                  React.createElement('button', { type: 'button', onClick: function() { setIQ({ log: (iq.log || []).concat([{ p: iq.pTrue, q: iq.qTrue, t: iq.threshold, st: state }]).slice(-8) }); }, className: 'px-2.5 py-1 rounded bg-slate-100 text-xs font-bold text-slate-700 border border-slate-300 cursor-pointer' }, t('stem.logiclab.log', '📋 Log')),
                  React.createElement('button', { type: 'button', onClick: function() { setIQ({ pTrue: 70, qTrue: 70, threshold: 80, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2.5 py-1 rounded bg-white text-xs font-semibold text-slate-600 border border-slate-300 cursor-pointer' }, t('stem.logiclab.reset_3', '↺ Reset'))
                ),
                React.createElement('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.logiclab.hypothesis_when_does_p_p_q_p_p_p_q', 'Hypothesis: When does P(P∧Q) ≈ P(P)·P(Q)?'),
                  'aria-label': t('stem.logiclab.hypothesis_when_does_p_p_q_p_p_p_q', 'Probability logic hypothesis'),
                  className: 'w-full text-xs border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && React.createElement('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2.5 py-1 rounded bg-amber-50 text-xs font-bold text-amber-800 border border-amber-300 cursor-pointer' }, t('stem.logiclab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                iq.stuckRevealed && React.createElement('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-xs text-slate-700' },
                  React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
                    React.createElement('li', null, t('stem.logiclab.independence_vs_correlation_when_does_', 'Independence vs correlation — when does each apply?')),
                    React.createElement('li', null, t('stem.logiclab.how_does_threshold_change_inference_ou', 'How does threshold change inference outcome?')))),
                React.createElement('label', { className: 'flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer' },
                  React.createElement('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  t('stem.logiclab.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                iq.understood && React.createElement('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.logiclab.explain_probability_logic', 'Explain probability logic.'),
                  'aria-label': t('stem.logiclab.explain_probability_logic', 'Explain probability logic'),
                  className: 'w-full text-xs border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
                React.createElement('div', { className: 'text-[0.6875rem] italic text-slate-500' }, t('stem.logiclab.design_note_discrete_4_state_inference', 'Design note: discrete 4-state inference marker; no probability score; no reveal — by design.'))
              );
            })(),

            // ═══ EDUCATIONAL PANEL ═══

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", { "aria-label": t('stem.logiclab.toggle_educational_panel_what_is_propo', "Toggle educational panel: What is Propositional Logic"),

                onClick: function() { upd({ showEdu: !showEdu }); if (!showEdu) payOnce('learn', 5, 'First logic session'); },

                className: "w-full p-4 rounded-2xl border-2 border-violet-200 text-left transition-all hover:shadow-md flex items-center gap-3",

                style: { background: isContrast ? '#000000' : (isDark ? (showEdu ? '#1e1b4b' : '#1e293b') : (showEdu ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : 'white')), borderColor: isContrast ? '#ffff00' : undefined }

              },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDCD6"),

                React.createElement("span", { className: "font-black text-violet-900 text-sm flex-1" }, t('stem.logiclab.learn_what_is_propositional_logic', "Learn: What is Propositional Logic?")),

                React.createElement("span", { className: "text-violet-700 font-bold text-xs" }, showEdu ? "\u25B2 Hide" : "\u25BC Show")

              ),

              showEdu && React.createElement("div", { className: "mt-2 p-5 rounded-2xl border border-violet-200 space-y-4 text-sm text-slate-700 leading-relaxed", style: { background: _gCard } },

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, t('stem.logiclab.what_is_propositional_logic', "What is Propositional Logic?")),

                  React.createElement("p", null, t('stem.logiclab.propositional_logic_studies_how_the_tr', "Propositional logic studies how the truth of complex statements depends on simpler ones. A "), React.createElement("strong", null, "proposition"), t('stem.logiclab.is_any_statement_that_is_either_true_o', " is any statement that is either true or false \u2014 like \"It is raining\" or \"2 + 2 = 4\"."))

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, t('stem.logiclab.connective_symbols', "Connective Symbols")),

                  React.createElement("table", { className: "w-full text-xs" },

                    React.createElement("caption", { className: "sr-only" }, t('stem.logiclab.connective_symbols_2', "Connective Symbols")), React.createElement("tbody", null,

                      [['∧','AND','Both must be true'],['∨','OR','At least one true'],['¬','NOT','Flips truth value'],['→','IF...THEN','False only when P true, Q false'],['↔','IFF','True when both same'],['⊕','XOR','True when exactly one true']].map(function(r) {

                        return React.createElement("tr", { key: r[0], className: "border-b border-violet-100" },

                          React.createElement("td", { className: "py-1.5 font-mono font-bold text-violet-700 w-10 text-center" }, r[0]),

                          React.createElement("td", { className: "py-1.5 font-bold text-violet-600 w-24" }, r[1]),

                          React.createElement("td", { className: "py-1.5 text-slate-600" }, r[2])

                        );

                      })

                    )

                  )

                ),

                React.createElement("div", null,
                  React.createElement("h4", { className: "font-black text-violet-800 mb-2" }, t('stem.logiclab.key_logical_laws', "Key Logical Laws")),
                  React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2" },
                    [
                      ["De Morgan's 1","\u00AC(P\u2227Q) \u2261 \u00ACP\u2228\u00ACQ"],
                      ["De Morgan's 2","\u00AC(P\u2228Q) \u2261 \u00ACP\u2227\u00ACQ"],
                      ["Double Negation","\u00AC\u00ACP \u2261 P"],
                      ["Contrapositive","P\u2192Q \u2261 \u00ACQ\u2192\u00ACP"],
                      ["Distributive","P\u2227(Q\u2228R) \u2261 (P\u2227Q)\u2228(P\u2227R)"],
                      ["Commutative","P\u2227Q \u2261 Q\u2227P"]
                    ].map(function(law) {
                      return React.createElement("button", {
                        key: law[0], type: 'button',
                        className: "w-full text-left flex items-center gap-2 p-2 bg-white rounded-lg border border-violet-100 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all",
                        onClick: function() { upd({ expression: law[1].split(' \u2261 ')[0].trim(), mode: 'truth' }); if(addToast) addToast('Loaded in Truth Tables!','info'); }
                      },
                        React.createElement("span", { className: "text-[0.6875rem] font-black text-violet-700 w-28 shrink-0" }, law[0]),
                        React.createElement("code", { className: "font-mono text-xs text-violet-800 font-bold" }, law[1]),
                        React.createElement("span", { className: "ml-auto text-violet-300 text-[0.6875rem]" }, "\u2192")
                      );
                    })
                  )
                ),

                React.createElement("div", null,
                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, t('stem.logiclab.valid_vs_invalid_arguments', "Valid vs Invalid Arguments")),

                  React.createElement("p", null, "A ", React.createElement("strong", null, "valid"), t('stem.logiclab.argument_guarantees_the_conclusion_if_', " argument guarantees the conclusion IF the premises are true. An "), React.createElement("strong", null, "invalid"), t('stem.logiclab.argument_fallacy_has_a_logical_gap_eve', " argument (fallacy) has a logical gap \u2014 even if the premises are true, the conclusion doesn't necessarily follow.")),

                  React.createElement("p", { className: "mt-1 text-violet-600 font-bold" }, t('stem.logiclab.common_fallacies_affirming_the_consequ', "Common fallacies: Affirming the Consequent (P\u2192Q, Q \u2234 P\u2717), Denying the Antecedent (P\u2192Q, \u00ACP \u2234 \u00ACQ\u2717)"))

                )

              )

            ),



            // ═══ BACK BUTTON ═══

            React.createElement("div", { className: "mt-6 text-center" },

              React.createElement("button", { "aria-label": t('stem.logiclab.back_to_tools', "Back to Tools"),

                onClick: function() { setStemLabTool(null); },

                className: "px-6 py-2.5 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-all"

              }, t('stem.logiclab.back_to_tools_2', "\u2190 Back to Tools"))

            ),

            // \u2550\u2550\u2550 TRUTH TABLES \u2550\u2550\u2550
            React.createElement('div', { className: 'mt-5 mx-4 rounded-2xl border border-violet-300 bg-white p-3 shadow-sm' },
              React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
                React.createElement('div', null,
                  React.createElement('h4', { className: 'text-sm font-bold text-violet-700' }, t('stem.logiclab.truth_tables_boolean_logic_at_a_glance', '\ud83d\udd0d Truth Tables \u2014 Boolean logic at a glance')),
                  React.createElement('p', { className: 'mt-1 text-xs font-semibold text-slate-600' }, t('stem.logiclab.truth_lab_hint', 'Open the animated gate view when you want an extra visual read on Boolean logic.'))
                ),
                React.createElement('button', {
                  type: 'button',
                  'aria-label': showTruthLab ? t('stem.logiclab.hide_truth_table_visual', 'Hide truth table visual') : t('stem.logiclab.open_truth_table_visual', 'Open truth table visual'),
                  'aria-expanded': showTruthLab,
                  onClick: function() { sfxLogiclClick(); upd({ showTruthLab: !showTruthLab }); },
                  className: 'rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 transition-all hover:bg-violet-100'
                }, showTruthLab ? t('stem.logiclab.hide_visual', 'Hide visual') : t('stem.logiclab.open_visual', 'Open visual'))
              ),
              showTruthLab && React.createElement('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); }, className: 'mt-3 rounded-xl overflow-hidden border border-violet-200', style: { position: 'relative', background: '#1e1b4b', aspectRatio: '16/5' } },
                React.createElement('button', {
                  type: 'button',
                  'data-allo-fs-btn': 'true',
                  'aria-pressed': 'false',
                  'aria-label': t('stem.logiclab.enter_fullscreen', 'View the truth table visual fullscreen'),
                  'data-fs-out': t('stem.logiclab.enter_fullscreen', 'View the truth table visual fullscreen'),
                  'data-fs-in': t('stem.logiclab.exit_fullscreen', 'Exit fullscreen truth table visual (Escape)'),
                  style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(196,181,253,0.6)', color: '#ede9fe', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
                }, React.createElement('span', { 'aria-hidden': 'true' }, '⛶')),
                React.createElement('canvas', {
                  role: 'img',
                  tabIndex: 0,
                  'aria-label': t('stem.logiclab.truth_table_visualization_cycling_thro', 'Truth table visualization cycling through AND, OR, XOR, and NAND logic gates.'),
                  ref: function(cvEl) {
                    if (!cvEl) {
                      var prevCv = _llCanvasRef.current;
                      if (prevCv) {
                        if (prevCv._ttAnim) cancelAnimationFrame(prevCv._ttAnim);
                        if (prevCv._ttRO) prevCv._ttRO.disconnect();
                        prevCv._ttAnim = null;
                        prevCv._ttRO = null;
                        prevCv._ttInit = false;
                      }
                      _llCanvasRef.current = null;
                      return;
                    }
                    _llCanvasRef.current = cvEl;
                    if (cvEl._ttInit) return;
                    cvEl._ttInit = true;
                    var c2 = cvEl.getContext && cvEl.getContext('2d');
                    if (!c2) return;
                    var W = cvEl.offsetWidth || 600;
                    var H = cvEl.offsetHeight || 180;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    c2.scale(2, 2);
                    var start = performance.now();
                    var reducedMotion = false;
                    try {
                      reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                    } catch (e) {}
                    var lastFrameKey = '';
                    var ops = [
                      { name: 'AND', sym: '\u2227', fn: function(a,b){return a&&b;}, color: '#38bdf8' },
                      { name: 'OR', sym: '\u2228', fn: function(a,b){return a||b;}, color: '#22c55e' },
                      { name: 'XOR', sym: '\u2295', fn: function(a,b){return a!==b;}, color: '#fbbf24' },
                      { name: 'NAND', sym: '\u22bc', fn: function(a,b){return !(a&&b);}, color: '#fb7185' }
                    ];
                    // Zero-GC pre-allocated truth-table buffer & pulse-packet phase pools
                    var TT_BUF = new Uint8Array(ops.length * 4 * 3);
                    for (var oi = 0; oi < ops.length; oi++) {
                      for (var ri0 = 0; ri0 < 4; ri0++) {
                        var av = ri0 >= 2 ? 1 : 0;
                        var bv = (ri0 & 1) ? 1 : 0;
                        var ov = ops[oi].fn(av === 1, bv === 1) ? 1 : 0;
                        var baseOff = (oi * 4 + ri0) * 3;
                        TT_BUF[baseOff] = av;
                        TT_BUF[baseOff + 1] = bv;
                        TT_BUF[baseOff + 2] = ov;
                      }
                    }
                    var PACKET_PHASE = new Float32Array([0.0, 0.5]);
                    var prevBlink = -1;
                    var prevOutVal = -1;
                    var gateFlash = 0;
                    var prevFrameMs = start;
                    function isHcActive() {
                      return !!(typeof document !== 'undefined' && document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('theme-contrast'));
                    }
                    function drawWire(x1, y1, x2, y2, high, accent, pulsePos, pinPhase, hc) {
                      c2.save();
                      c2.lineCap = 'round';
                      var wireCol = hc ? (high ? '#00ff00' : '#ffff00') : (high ? accent : '#475569');
                      if (high && !hc) {
                        c2.strokeStyle = accent;
                        c2.globalAlpha = 0.26;
                        c2.lineWidth = 8.5;
                        c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x2, y2); c2.stroke();
                        c2.globalAlpha = 1;
                      }
                      c2.strokeStyle = wireCol;
                      c2.lineWidth = high ? 3.2 : 2;
                      c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x2, y2); c2.stroke();
                      if (high && !hc) {
                        c2.strokeStyle = '#ffffff';
                        c2.globalAlpha = 0.72;
                        c2.lineWidth = 1;
                        c2.beginPath(); c2.moveTo(x1, y1); c2.lineTo(x2, y2); c2.stroke();
                        c2.globalAlpha = 1;
                        // Zero-GC glowing HIGH-signal energy pulse packets with smooth wake
                        var pktCount = reducedMotion ? 1 : PACKET_PHASE.length;
                        var dx = x2 - x1, dy = y2 - y1;
                        for (var pi = 0; pi < pktCount; pi++) {
                          var u = reducedMotion ? 0.55 : ((pulsePos + PACKET_PHASE[pi]) % 1);
                          var px = x1 + dx * u;
                          var py = y1 + dy * u;
                          if (!reducedMotion) {
                            var uTail = u - 0.16;
                            if (uTail < 0) uTail = 0;
                            c2.strokeStyle = accent;
                            c2.globalAlpha = 0.55;
                            c2.lineWidth = 4.2;
                            c2.beginPath();
                            c2.moveTo(x1 + dx * uTail, y1 + dy * uTail);
                            c2.lineTo(px, py);
                            c2.stroke();
                            c2.globalAlpha = 1;
                          }
                          if (typeof c2.createRadialGradient === 'function') {
                            var og = c2.createRadialGradient(px, py, 0.4, px, py, 8.5);
                            og.addColorStop(0, '#ffffff');
                            og.addColorStop(0.42, accent);
                            og.addColorStop(1, 'rgba(0,0,0,0)');
                            c2.fillStyle = og;
                            c2.beginPath(); c2.arc(px, py, 8.5, 0, Math.PI * 2); c2.fill();
                          }
                          c2.fillStyle = '#ffffff';
                          c2.beginPath(); c2.arc(px, py, 2.3, 0, Math.PI * 2); c2.fill();
                        }
                      }
                      // Terminal pin solder pads & subtle active resonance glints
                      var glintR = reducedMotion ? 5.2 : (4.8 + 1.6 * Math.sin(pinPhase));
                      var glintA = reducedMotion ? 0.45 : (0.3 + 0.42 * (0.5 + 0.5 * Math.sin(pinPhase)));
                      if (high && !hc) {
                        c2.strokeStyle = '#dcfce7';
                        c2.globalAlpha = glintA;
                        c2.lineWidth = 1.2;
                        c2.beginPath(); c2.arc(x1, y1, glintR, 0, Math.PI * 2); c2.stroke();
                        c2.beginPath(); c2.arc(x2, y2, glintR, 0, Math.PI * 2); c2.stroke();
                        c2.globalAlpha = 1;
                      }
                      c2.fillStyle = hc ? '#000000' : (high ? '#dcfce7' : '#0f172a');
                      c2.strokeStyle = hc ? (high ? '#00ff00' : '#ffff00') : (high ? accent : '#f59e0b');
                      c2.lineWidth = 1.4;
                      c2.beginPath(); c2.arc(x1, y1, 2.9, 0, Math.PI * 2); c2.fill(); c2.stroke();
                      c2.beginPath(); c2.arc(x2, y2, 2.5, 0, Math.PI * 2); c2.fill(); c2.stroke();
                      c2.restore();
                    }
                    function drawTt() {
                      if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._ttAnim); if (cvEl._ttRO) cvEl._ttRO.disconnect(); return; }
                      var nowMs = performance.now();
                      var dt = Math.min(0.1, Math.max(0, (nowMs - prevFrameMs) / 1000));
                      prevFrameMs = nowMs;
                      var t = (nowMs - start) / 1000;
                      var hc = isHcActive();
                      var blink = reducedMotion ? 0 : Math.floor((t * 0.25) % ops.length);
                      var activeRow = reducedMotion ? 4 : (1 + Math.floor((t * 1.0) % 4));
                      var pulsePos = reducedMotion ? 0.55 : ((t * 1.35) % 1);
                      var frameKey = reducedMotion ? ('static-' + W + 'x' + H + '-' + (hc ? 'hc' : 'std')) : '';
                      if (reducedMotion && frameKey === lastFrameKey) { return; }
                      lastFrameKey = frameKey;

                      // Crisp PCB blueprint backdrop (pure black in High-Contrast)
                      if (hc) {
                        c2.fillStyle = '#000000';
                      } else if (typeof c2.createRadialGradient === 'function') {
                        var bgGrad = c2.createRadialGradient(W * 0.52, H * 0.45, 16, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
                        bgGrad.addColorStop(0, '#172554');
                        bgGrad.addColorStop(0.6, '#0f172a');
                        bgGrad.addColorStop(1, '#020617');
                        c2.fillStyle = bgGrad;
                      } else {
                        c2.fillStyle = '#0f172a';
                      }
                      c2.fillRect(0, 0, W, H);

                      // Subtle PCB pad grid (bypassed in High-Contrast)
                      if (!hc) {
                        c2.fillStyle = 'rgba(56,189,248,0.16)';
                        for (var gx0 = 16; gx0 < W; gx0 += 24) {
                          for (var gy0 = 14; gy0 < H - 16; gy0 += 24) {
                            c2.fillRect(gx0, gy0, 1.5, 1.5);
                          }
                        }
                      }

                      var op = ops[blink];
                      var opAccent = hc ? '#ffff00' : op.color;
                      // Title
                      c2.fillStyle = opAccent;
                      c2.font = 'bold 14px serif';
                      c2.textAlign = 'left';
                      c2.fillText('A ' + op.sym + ' B  (' + op.name + ')', W * 0.06, 22);
                      // Zero-GC Truth Table rendering from pre-allocated TT_BUF
                      var tx = W * 0.06, ty = 32;
                      var rowH = 23;
                      var colW = Math.max(38, W * 0.095);
                      var activeOff = (blink * 4 + (activeRow - 1)) * 3;
                      var curA = TT_BUF[activeOff] === 1;
                      var curB = TT_BUF[activeOff + 1] === 1;
                      var curOut = TT_BUF[activeOff + 2] === 1;
                      var outNum = curOut ? 1 : 0;
                      if (prevBlink !== blink || prevOutVal !== outNum) {
                        if (prevBlink !== -1 && !reducedMotion && !hc) gateFlash = 1.0;
                        prevBlink = blink;
                        prevOutVal = outNum;
                      } else if (gateFlash > 0) {
                        gateFlash = Math.max(0, gateFlash - dt * 2.4);
                      }

                      for (var ri = 0; ri < 5; ri++) {
                        if (ri === activeRow) {
                          c2.fillStyle = hc ? '#003300' : 'rgba(139,92,246,0.28)';
                          c2.fillRect(tx, ty + ri * rowH, colW * 3, rowH);
                        }
                        var rowBase = ri > 0 ? (blink * 4 + (ri - 1)) * 3 : -1;
                        for (var ci = 0; ci < 3; ci++) {
                          c2.strokeStyle = ri === activeRow ? (hc ? '#00ff00' : op.color) : (hc ? '#ffff00' : '#334155');
                          c2.lineWidth = ri === activeRow ? 1.6 : 1;
                          c2.strokeRect(tx + ci * colW, ty + ri * rowH, colW, rowH);
                          var cellVal = ri === 0 ? (ci === 0 ? 'A' : (ci === 1 ? 'B' : op.name)) : TT_BUF[rowBase + ci];
                          c2.fillStyle = ri === 0 ? opAccent : (cellVal === 1 ? (hc ? '#00ff00' : '#86efac') : (hc ? '#ffff00' : '#cbd5e1'));
                          c2.font = ri === 0 ? 'bold 11px sans-serif' : 'bold 13px monospace';
                          c2.textAlign = 'center';
                          c2.fillText(cellVal, tx + ci * colW + colW / 2, ty + ri * rowH + 15.5);
                        }
                      }

                      // Gate symbol with zero-GC pulse-packet wires, transition flash halo & ambient LED bloom
                      var gx = W * 0.60, gy = H * 0.48;
                      var pinPhase = t * 4.2;
                      drawWire(gx - 72, gy - 13, gx - 22, gy - 13, curA, '#4ade80', pulsePos, pinPhase, hc);
                      drawWire(gx - 72, gy + 13, gx - 22, gy + 13, curB, '#4ade80', (pulsePos + 0.35) % 1, pinPhase + 1.1, hc);
                      drawWire(gx + (op.name === 'NAND' ? 28 : 22), gy, gx + 76, gy, curOut, op.color, (pulsePos + 0.15) % 1, pinPhase + 2.2, hc);

                      // Gate-output state-transition flash halo
                      if (!hc && !reducedMotion && gateFlash > 0.01) {
                        var flashR = 24 + (1 - gateFlash) * 26;
                        c2.save();
                        c2.strokeStyle = curOut ? '#4ade80' : op.color;
                        c2.globalAlpha = gateFlash * 0.72;
                        c2.lineWidth = 2.6 * gateFlash + 0.6;
                        c2.beginPath(); c2.arc(gx, gy, flashR, 0, Math.PI * 2); c2.stroke();
                        if (typeof c2.createRadialGradient === 'function') {
                          var fg = c2.createRadialGradient(gx, gy, 4, gx, gy, flashR);
                          fg.addColorStop(0, curOut ? 'rgba(74,222,128,0.34)' : 'rgba(167,139,250,0.28)');
                          fg.addColorStop(1, 'rgba(0,0,0,0)');
                          c2.globalAlpha = gateFlash;
                          c2.fillStyle = fg;
                          c2.beginPath(); c2.arc(gx, gy, flashR, 0, Math.PI * 2); c2.fill();
                        }
                        c2.restore();
                      }

                      // Bevel-shaded gate body
                      c2.save();
                      if (!hc) {
                        c2.shadowColor = curOut ? '#4ade80' : op.color;
                        c2.shadowBlur = curOut ? 18 : 12;
                      }
                      if (hc) {
                        c2.fillStyle = '#000000';
                      } else if (typeof c2.createLinearGradient === 'function') {
                        var gg = c2.createLinearGradient(gx - 22, gy - 20, gx - 22, gy + 20);
                        gg.addColorStop(0, '#6d28d9');
                        gg.addColorStop(1, '#2e1065');
                        c2.fillStyle = gg;
                      } else {
                        c2.fillStyle = 'rgba(109,40,217,0.75)';
                      }
                      c2.strokeStyle = hc ? (curOut ? '#00ff00' : '#ffff00') : (curOut ? '#86efac' : op.color);
                      c2.lineWidth = 2.2;
                      c2.beginPath();
                      if (op.name === 'AND' || op.name === 'NAND') {
                        c2.moveTo(gx - 22, gy - 20);
                        c2.lineTo(gx, gy - 20);
                        c2.arc(gx, gy, 20, -Math.PI / 2, Math.PI / 2);
                        c2.lineTo(gx - 22, gy + 20);
                        c2.closePath();
                      } else {
                        c2.moveTo(gx - 22, gy - 20);
                        c2.quadraticCurveTo(gx - 4, gy - 20, gx + 20, gy);
                        c2.quadraticCurveTo(gx - 4, gy + 20, gx - 22, gy + 20);
                        c2.quadraticCurveTo(gx - 11, gy, gx - 22, gy - 20);
                        c2.closePath();
                      }
                      c2.fill();
                      c2.stroke();
                      if (op.name === 'XOR') {
                        c2.beginPath();
                        c2.moveTo(gx - 27, gy - 20);
                        c2.quadraticCurveTo(gx - 16, gy, gx - 27, gy + 20);
                        c2.stroke();
                      }
                      if (op.name === 'NAND') {
                        c2.fillStyle = hc ? '#000000' : '#0f172a';
                        c2.beginPath();
                        c2.arc(gx + 24, gy, 4, 0, Math.PI * 2);
                        c2.fill();
                        c2.stroke();
                      }
                      c2.restore();

                      // Glowing Output LED dome with crisp ambient halo bloom
                      var ledX = gx + 82, ledY = gy;
                      var breath = reducedMotion ? 1.0 : (0.86 + 0.14 * Math.sin(t * 3.4));
                      if (curOut && !hc && typeof c2.createRadialGradient === 'function') {
                        var outerBloomR = 23 * breath;
                        var lho = c2.createRadialGradient(ledX, ledY, 2, ledX, ledY, outerBloomR);
                        lho.addColorStop(0, 'rgba(74,222,128,0.42)');
                        lho.addColorStop(0.55, 'rgba(34,197,94,0.16)');
                        lho.addColorStop(1, 'rgba(34,197,94,0)');
                        c2.fillStyle = lho;
                        c2.beginPath(); c2.arc(ledX, ledY, outerBloomR, 0, Math.PI * 2); c2.fill();
                        var lh = c2.createRadialGradient(ledX, ledY, 1.5, ledX, ledY, 14);
                        lh.addColorStop(0, 'rgba(187,247,208,0.75)');
                        lh.addColorStop(1, 'rgba(74,222,128,0)');
                        c2.fillStyle = lh;
                        c2.beginPath(); c2.arc(ledX, ledY, 14, 0, Math.PI * 2); c2.fill();
                      }
                      if (hc) {
                        c2.fillStyle = curOut ? '#00ff00' : '#000000';
                      } else if (typeof c2.createRadialGradient === 'function') {
                        var lg = c2.createRadialGradient(ledX - 2, ledY - 2, 1, ledX, ledY, 8);
                        lg.addColorStop(0, curOut ? '#dcfce7' : '#fca5a5');
                        lg.addColorStop(0.5, curOut ? '#22c55e' : '#ef4444');
                        lg.addColorStop(1, curOut ? '#14532d' : '#7f1d1d');
                        c2.fillStyle = lg;
                      } else {
                        c2.fillStyle = curOut ? '#22c55e' : '#ef4444';
                      }
                      c2.beginPath(); c2.arc(ledX, ledY, 7.5, 0, Math.PI * 2); c2.fill();
                      c2.strokeStyle = hc ? '#ffff00' : (curOut ? '#bbf7d0' : '#fca5a5');
                      c2.lineWidth = hc ? 2 : 1.4;
                      c2.stroke();
                      if (!hc) {
                        c2.fillStyle = 'rgba(255,255,255,' + (curOut ? '0.82' : '0.36') + ')';
                        c2.beginPath(); c2.arc(ledX - 2.4, ledY - 2.4, 1.9, 0, Math.PI * 2); c2.fill();
                      }

                      // Labels
                      c2.fillStyle = curA ? (hc ? '#00ff00' : '#86efac') : (hc ? '#ffff00' : '#cbd5e1');
                      c2.font = 'bold 11px monospace';
                      c2.textAlign = 'right';
                      c2.fillText('A=' + (curA ? '1' : '0'), gx - 78, gy - 9);
                      c2.fillStyle = curB ? (hc ? '#00ff00' : '#86efac') : (hc ? '#ffff00' : '#cbd5e1');
                      c2.fillText('B=' + (curB ? '1' : '0'), gx - 78, gy + 17);
                      c2.textAlign = 'left';
                      c2.fillStyle = curOut ? (hc ? '#00ff00' : '#86efac') : (hc ? '#ffff00' : '#fca5a5');
                      c2.fillText('OUT=' + (curOut ? '1' : '0'), ledX + 12, gy + 4);

                      c2.fillStyle = hc ? '#000000' : 'rgba(2,6,23,0.86)';
                      c2.fillRect(8, H - 15, W - 16, 13);
                      c2.font = 'bold 8px sans-serif'; c2.fillStyle = hc ? '#ffff00' : '#c4b5fd'; c2.textAlign = 'center';
                      c2.fillText('Boole 1854. Every CPU uses these gates. NAND is universal \u2014 you can build anything from just NAND.', W / 2, H - 5.5);
                      if (!reducedMotion) cvEl._ttAnim = requestAnimationFrame(drawTt);
                    }
                    drawTt();
                    var ro = new ResizeObserver(function() {
                      W = cvEl.offsetWidth || 600; H = cvEl.offsetHeight || 180;
                      cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2);
                      lastFrameKey = '';
                      if (reducedMotion) drawTt();
                    });
                    cvEl._ttRO = ro;
                    ro.observe(cvEl);
                  },
                  style: { width: '100%', height: '100%', display: 'block' }
                })
              )
            )

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_logiclab.js loaded');
})();
