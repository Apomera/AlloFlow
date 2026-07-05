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

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _logiclAC = null;
  function getLogiclAC() { if (!_logiclAC) { try { _logiclAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_logiclAC && _logiclAC.state === "suspended") { try { _logiclAC.resume(); } catch(e) {} } return _logiclAC; }
  function logiclTone(f,d,tp,v) { var ac = getLogiclAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
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

  window.StemLab.registerTool('logicLab', {
    icon: '\uD83E\uDDE0',
    label: 'Logic Lab',
    desc: 'Propositional Logic, Proofs & Reasoning',
    color: 'violet',
    category: 'math',
    questHooks: [
      { id: 'build_truth_table', label: 'Build a truth table for a logical expression', icon: '\uD83D\uDCCB', check: function(d) { return d.expression && d.expression !== 'P \u2192 Q'; }, progress: function(d) { return d.expression && d.expression !== 'P \u2192 Q' ? 'Built!' : 'Modify the expression'; } },
      { id: 'complete_challenge', label: 'Complete a logic challenge', icon: '\uD83C\uDFAF', check: function(d) { return (d.currentChallenge || 0) >= 1; }, progress: function(d) { return (d.currentChallenge || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'write_3_proof_steps', label: 'Write 3 proof steps', icon: '\u270D\uFE0F', check: function(d) { return (d.proofSteps || []).length >= 3; }, progress: function(d) { return (d.proofSteps || []).length + '/3 steps'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 logic challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.currentChallenge || 0) >= 3; }, progress: function(d) { return (d.currentChallenge || 0) + '/3'; } }
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
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (logicLab) ──
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

          var expr = d.expression || 'P → Q';

          var proofSteps = d.proofSteps || [];

          var currentChallenge = d.currentChallenge || 0;

          var challengeMode = d.challengeMode || 'fallacy';

          var challengeIdx = d.challengeIdx || 0;

          var challengeAnswer = d.challengeAnswer || null;

          var showEnglish = d.showEnglish || false;

          var proofComplete = d.proofComplete || false;

          var showEdu = d.showEdu || false;
          var showTruthLab = !!d.showTruthLab;

          var userTopic = d.userTopic || '';

          var aiLoading = d.aiLoading || false;

          var aiFallacy = d.aiFallacy || null;

          var aiProof = d.aiProof || null;

          var aiDetective = d.aiDetective || null;

          var aiExplain = d.aiExplain || '';
          var score = d.score || 0;
          var streak = d.streak || 0;
          var bestStreak = d.bestStreak || 0;
          var animTick = d.animTick || 0;
          var gateType = d.gateType || 'AND';
          var gateInputs = d.gateInputs || { A: false, B: false };



          var upd = function(patch) {

            setLabToolData(function(prev) {

              return Object.assign({}, prev, { logicLab: Object.assign({}, prev.logicLab || {}, patch) });

            });

          };



          // ── AI generation helper ──

          var aiGenerate = function(prompt, field) {

            upd({ aiLoading: true });

            callGemini(prompt, true).then(function(result) {

              try {

                var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                var gs = cleaned.indexOf('{');

                if (gs > 0) cleaned = cleaned.substring(gs);

                var ge = cleaned.lastIndexOf('}');

                if (ge > 0) cleaned = cleaned.substring(0, ge + 1);

                var parsed = JSON.parse(cleaned);

                var patch = { aiLoading: false };

                patch[field] = parsed;

                upd(patch);

              } catch(e) {

                if (addToast) addToast('AI response parsing failed. Try again!', 'warning');

                upd({ aiLoading: false });

              }

            }).catch(function() {

              if (addToast) addToast('AI unavailable. Using static challenges.', 'info');

              upd({ aiLoading: false });

            });

          };



          var aiExplainCall = function(prompt) {

            upd({ aiLoading: true });

            callGemini(prompt, true).then(function(result) {

              upd({ aiExplain: result, aiLoading: false });

            }).catch(function() {

              upd({ aiLoading: false });

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

            var tokens = []; var i = 0;

            while (i < s.length) {

              var ch = s[i];

              if (ch === ' ') { i++; continue; }

              if (ch === '(' || ch === ')') { tokens.push(ch); i++; continue; }

              if ('∧∨¬→↔⊕'.indexOf(ch) !== -1) { tokens.push(ch); i++; continue; }

              if (/[A-Z]/.test(ch)) { tokens.push(ch); i++; continue; }

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

              var right = parseExpr(tokens, left.pos + 1, prec + 1);

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

              return { node: inner2.node, pos: closePos + 1 };

            }

            return { node: { type: 'var', name: tokens[pos] || 'P' }, pos: pos + 1 };

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

              var vars = uniqueVars(getVars(parsed.node));

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
              var fm = selTexts[fi].match(/^(.+)\s*→\s*(.+)$/);
              if (!fm) continue;
              var fp = fm[1].trim(), fq = fm[2].trim();
              for (var fj = 0; fj < selTexts.length; fj++) {
                if (fi === fj) continue;
                var fOther = selTexts[fj].trim();
                if (fOther === fq) return 'That move is AFFIRMING THE CONSEQUENT — a classic fallacy. From "' + fp + ' → ' + fq + '" and "' + fq + '" you cannot conclude "' + fp + '": something ELSE could have caused ' + fq + '. (If it rains, the ground is wet. The ground IS wet — but maybe a sprinkler did it.)';
                if (fOther === '¬' + fp || fOther === '¬(' + fp + ')') return 'That move is DENYING THE ANTECEDENT — a classic fallacy. From "' + fp + ' → ' + fq + '" and "¬' + fp + '" you cannot conclude "¬' + fq + '": the rule only says what happens IF ' + fp + ' is true. It is silent when ' + fp + ' is false.';
              }
            }
            return null;
          };

          var RULES = [

            { id: 'mp', name: t('stem.logiclab.modus_ponens', 'Modus Ponens'), form: 'P→Q, P ∴ Q', eng: 'If you study, you pass. You studied. ∴ You pass.', needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  if (m && m[1].trim() === sel[j].trim()) return m[2].trim();

                }

                return null;

              }

            },

            { id: 'mt', name: t('stem.logiclab.modus_tollens', 'Modus Tollens'), form: 'P→Q, ¬Q ∴ ¬P', eng: "If it rains, ground is wet. Ground isn't wet. ∴ It didn't rain.", needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  if (m && sel[j].trim() === '¬' + m[2].trim()) return '¬' + m[1].trim();

                  if (m && sel[j].trim() === '¬(' + m[2].trim() + ')') return '¬' + m[1].trim();

                }

                return null;

              }

            },

            { id: 'hs', name: t('stem.logiclab.hypothetical_syllogism', 'Hypothetical Syllogism'), form: 'P→Q, Q→R ∴ P→R', eng: 'If A then B, if B then C. ∴ If A then C.', needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m1 = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  var m2 = sel[j].match(/^(.+)\s*→\s*(.+)$/);

                  if (m1 && m2 && m1[2].trim() === m2[1].trim()) return m1[1].trim() + ' → ' + m2[2].trim();

                }

                return null;

              }

            },

            { id: 'ds', name: t('stem.logiclab.disjunctive_syllogism', 'Disjunctive Syllogism'), form: 'P∨Q, ¬P ∴ Q', eng: "It's red or blue. It's not red. ∴ It's blue.", needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*∨\s*(.+)$/);

                  if (m && sel[j].trim() === '¬' + m[1].trim()) return m[2].trim();

                  if (m && sel[j].trim() === '¬' + m[2].trim()) return m[1].trim();

                }

                return null;

              }

            },

            { id: 'conj', name: t('stem.logiclab.conjunction', 'Conjunction'), form: 'P, Q ∴ P∧Q', eng: 'Combine two truths into one.', needs: 2,

              check: function(premises, sel) {

                if (sel.length === 2) return sel[0].trim() + ' ∧ ' + sel[1].trim();

                return null;

              }

            },

            { id: 'simp', name: t('stem.logiclab.simplification', 'Simplification'), form: 'P∧Q ∴ P', eng: 'Extract one truth from a pair.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*∧\s*(.+)$/);

                if (m) return m[1].trim();

                return null;

              }

            },

            { id: 'add', name: t('stem.logiclab.addition', 'Addition'), form: 'P ∴ P∨Q', eng: 'Add any alternative to a truth.', needs: 1,

              check: function(premises, sel) {

                return sel[0].trim() + ' ∨ Q';

              }

            },

            { id: 'dn', name: t('stem.logiclab.double_negation', 'Double Negation'), form: '¬¬P ≡ P', eng: '"Not not raining" = "Raining."', needs: 1,

              check: function(premises, sel) {

                var s = sel[0].trim();

                if (s.indexOf('¬¬') === 0) return s.substring(2);

                return '¬¬' + s;

              }

            },

            { id: 'contra', name: t('stem.logiclab.contrapositive_2', 'Contrapositive'), form: 'P→Q ≡ ¬Q→¬P', eng: 'Reverse and negate.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*→\s*(.+)$/);

                if (m) return '¬' + m[2].trim() + ' → ¬' + m[1].trim();

                return null;

              }

            },

            { id: 'demorgan', name: t('stem.logiclab.de_morgan_s', "De Morgan's"), form: '¬(P∧Q) ≡ ¬P∨¬Q', eng: '"Not both" = "at least one isn\'t."', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^¬\((.+)\s*∧\s*(.+)\)$/);

                if (m) return '¬' + m[1].trim() + ' ∨ ¬' + m[2].trim();

                var m2 = sel[0].match(/^¬\((.+)\s*∨\s*(.+)\)$/);

                if (m2) return '¬' + m2[1].trim() + ' ∧ ¬' + m2[2].trim();

                return null;

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

          var _gViolet = 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)';

          var _gCard = 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)';



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

          // ── Symbol colors for drag palette ──
          var _symColor = {
            '∧': '#7c3aed', '∨': '#2563eb', '¬': '#dc2626',
            '→': '#059669', '↔': '#d97706', '⊕': '#db2777',
            'P': '#6366f1', 'Q': '#8b5cf6', 'R': '#a78bfa', 'S': '#c4b5fd',
            '(': '#94a3b8', ')': '#94a3b8'
          };

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
              { id: 'truth', icon: '\uD83D\uDCCA', title: 'Truth Tables', detail: rowCount ? rowCount + ' rows ready' : 'Build every case', accent: '#7c3aed', soft: '#f5f3ff' },
              { id: 'proof', icon: '\uD83E\uDDE9', title: 'Proof Builder', detail: proofSteps.length + ' steps toward ' + proofTarget, accent: '#0891b2', soft: '#ecfeff' },
              { id: 'challenges', icon: '\u26A1', title: 'Challenge Run', detail: score + ' pts, streak ' + streak, accent: '#d97706', soft: '#fffbeb' },
              { id: 'gates', icon: '\u26A1', title: 'Logic Gates', detail: gateType + ' output ' + (gateOutput ? 'true' : 'false'), accent: '#16a34a', soft: '#f0fdf4' },
              { id: 'simLogic', icon: '\uD83C\uDFB2', title: 'Probability', detail: 'Reason with uncertainty', accent: '#db2777', soft: '#fdf2f8' }
            ];

            return React.createElement("section", {
              "data-logiclab-focus": "true",
              role: "region",
              "aria-label": t('stem.logiclab.reasoning_studio', 'Logic Lab reasoning studio'),
              className: "mb-5 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm"
            },
              React.createElement("div", {
                className: "grid grid-cols-1 lg:grid-cols-5 gap-0",
                style: { background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 54%, #eef2ff 100%)' }
              },
                React.createElement("div", { className: "lg:col-span-3 p-5 sm:p-6" },
                  React.createElement("div", { className: "flex flex-wrap items-start gap-3 justify-between" },
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-xs font-black uppercase tracking-wide text-violet-500" }, t('stem.logiclab.current_workspace', 'Current workspace')),
                      React.createElement("h3", { className: "mt-1 text-xl sm:text-2xl font-black text-slate-950" }, t('stem.logiclab.reasoning_studio_title', 'Reasoning Studio')),
                      React.createElement("p", { className: "mt-2 max-w-xl text-sm leading-relaxed text-slate-700" }, t('stem.logiclab.reasoning_studio_hint', 'Move between truth tables, proof steps, logic gates, and probability without losing the thread of the argument.'))
                    ),
                    React.createElement("span", {
                      className: "rounded-full px-3 py-1 text-xs font-black text-white",
                      style: { background: _gViolet }
                    }, activeModeLabel)
                  ),
                  React.createElement("div", { className: "mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" },
                    [
                      ['Expression', expr || 'P \u2192 Q', rowCount ? table.type : 'ready'],
                      ['Rows', rowCount || 'Build', trueCount + ' true'],
                      ['Proof', proofSteps.length + ' steps', 'target ' + proofTarget],
                      ['Best', bestStreak + ' streak', score + ' pts']
                    ].map(function(stat) {
                      return React.createElement("div", {
                        key: stat[0],
                        className: "rounded-xl border border-white/80 bg-white/85 p-3 shadow-sm",
                        style: { minHeight: 86 }
                      },
                        React.createElement("div", { className: "text-[11px] font-black uppercase tracking-wide text-slate-500" }, stat[0]),
                        React.createElement("div", { className: "mt-1 truncate text-sm font-black text-slate-950", title: String(stat[1]) }, stat[1]),
                        React.createElement("div", { className: "mt-1 text-xs font-bold text-violet-700" }, stat[2])
                      );
                    })
                  ),
                  React.createElement("div", { className: "mt-4 rounded-xl border border-violet-100 bg-white/75 p-3" },
                    React.createElement("div", { className: "flex items-center justify-between text-xs font-black text-slate-600" },
                      React.createElement("span", null, t('stem.logiclab.truth_mix', 'Truth mix')),
                      React.createElement("span", null, trueCount + ' true / ' + falseCount + ' false')
                    ),
                    React.createElement("div", { className: "mt-2 h-3 overflow-hidden rounded-full bg-red-100" },
                      React.createElement("div", {
                        className: "h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400",
                        style: { width: truePct + '%', minWidth: rowCount && truePct === 0 ? 0 : 10 }
                      })
                    )
                  )
                ),
                React.createElement("div", { className: "lg:col-span-2 border-t border-violet-100 bg-slate-950 p-4 lg:border-l lg:border-t-0" },
                  React.createElement("svg", {
                    viewBox: "0 0 520 220",
                    role: "img",
                    "aria-label": t('stem.logiclab.logic_flow_visual', 'Logic flow visual showing inputs, gate, truth rows, and output.'),
                    className: "w-full",
                    style: { display: 'block', minHeight: 190 }
                  },
                    React.createElement("defs", null,
                      React.createElement("linearGradient", { id: "logicStudioLine", x1: "0", x2: "1", y1: "0", y2: "0" },
                        React.createElement("stop", { offset: "0%", stopColor: "#a78bfa" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#22d3ee" })
                      )
                    ),
                    React.createElement("rect", { x: "0", y: "0", width: "520", height: "220", rx: "28", fill: "#0f172a" }),
                    React.createElement("path", { d: "M66 72 H170 M66 148 H170 M318 110 H450", stroke: "url(#logicStudioLine)", strokeWidth: "10", strokeLinecap: "round", opacity: "0.75" }),
                    React.createElement("circle", { cx: "66", cy: "72", r: "30", fill: gateInputs.A ? "#22c55e" : "#334155", stroke: "#a78bfa", strokeWidth: "4" }),
                    React.createElement("circle", { cx: "66", cy: "148", r: "30", fill: (!isUnaryGate && gateInputs.B) ? "#22c55e" : "#334155", stroke: "#a78bfa", strokeWidth: "4", opacity: isUnaryGate ? "0.38" : "1" }),
                    React.createElement("text", { x: "66", y: "78", textAnchor: "middle", fontSize: "22", fontWeight: "900", fill: "#f8fafc" }, "P"),
                    React.createElement("text", { x: "66", y: "154", textAnchor: "middle", fontSize: "22", fontWeight: "900", fill: "#f8fafc" }, "Q"),
                    React.createElement("rect", { x: "174", y: "48", width: "144", height: "124", rx: "26", fill: "#4c1d95", stroke: "#c4b5fd", strokeWidth: "4" }),
                    React.createElement("text", { x: "246", y: "98", textAnchor: "middle", fontSize: "28", fontWeight: "900", fill: "#ffffff" }, gateType),
                    React.createElement("text", { x: "246", y: "130", textAnchor: "middle", fontSize: "15", fontWeight: "800", fill: "#ddd6fe" }, rowCount + " rows"),
                    React.createElement("circle", { cx: "450", cy: "110", r: "36", fill: gateOutput ? "#16a34a" : "#dc2626", stroke: "#f8fafc", strokeWidth: "5" }),
                    React.createElement("text", { x: "450", y: "118", textAnchor: "middle", fontSize: "24", fontWeight: "900", fill: "#ffffff" }, gateOutput ? "TRUE" : "FALSE"),
                    React.createElement("text", { x: "40", y: "205", fontSize: "14", fontWeight: "800", fill: "#c4b5fd" }, "Current: " + (expr || "P \u2192 Q")),
                    React.createElement("text", { x: "480", y: "205", textAnchor: "end", fontSize: "14", fontWeight: "800", fill: "#67e8f9" }, truePct + "% true")
                  )
                )
              ),
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 border-t border-violet-100 bg-white p-3" },
                routeCards.map(function(card) {
                  var active = mode === card.id;
                  return React.createElement("button", {
                    key: card.id,
                    type: "button",
                    "aria-label": "Open " + card.title,
                    onClick: function() { sfxLogiclClick(); upd({ mode: card.id }); },
                    className: "text-left rounded-xl border p-3 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500",
                    style: {
                      minHeight: 96,
                      background: active ? card.soft : '#ffffff',
                      borderColor: active ? card.accent : '#e2e8f0',
                      boxShadow: active ? '0 10px 22px rgba(124,58,237,0.14)' : 'none'
                    }
                  },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { "aria-hidden": "true", className: "text-lg" }, card.icon),
                      React.createElement("span", { className: "text-sm font-black text-slate-950" }, card.title)
                    ),
                    React.createElement("div", { className: "mt-2 text-xs font-bold leading-snug text-slate-600" }, card.detail)
                  );
                })
              )
            );
          };

          return React.createElement("div", { className: "max-w-4xl mx-auto" },

            // CSS animations
            React.createElement("style", null,
              '@keyframes logicPop{0%{transform:scale(0.7);opacity:0.4}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:1}}' +
              '@keyframes wrongShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}'
            ),

            // Header
            React.createElement("div", { className: "mb-6 text-center" },

              React.createElement("div", { className: "inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-3", style: { background: _gViolet, boxShadow: '0 8px 32px rgba(124,58,237,0.3)' } },

                React.createElement("span", { style: { fontSize: '32px' } }, "\uD83E\uDDE0"),

                React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, t('stem.logiclab.logic_lab', "Logic Lab")),

                React.createElement("span", { className: "text-violet-200 text-sm font-bold ml-2" }, t('stem.logiclab.propositional_logic_reasoning', "Propositional Logic & Reasoning"))

              ),

              // Mode tabs

              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4" },

                [['truth', '\uD83D\uDCCA', 'Truth Tables'], ['proof', '\uD83E\uDDE9', 'Proof Builder'], ['challenges', '\u26A1', 'Challenges'], ['gates', '\u26A1\uFE0F', 'Logic Gates'], ['simLogic', '\uD83C\uDFB2', 'Probability']].map(function(m) {

                  var active = mode === m[0];

                  return React.createElement("button", { "aria-label": "Switch to " + m[2] + " mode",

                    key: m[0],

                    onClick: function() { upd({ mode: m[0] }); },

                    className: "px-3 py-2.5 rounded-xl text-sm font-bold transition-all " + (active ? "text-white shadow-lg scale-105" : "text-violet-600 bg-violet-50 hover:bg-violet-100"),

                    style: active ? { background: _gViolet, boxShadow: '0 4px 14px rgba(124,58,237,0.3)', minHeight: 44 } : { minHeight: 44 }

                  }, m[1] + " " + m[2]);

                })

              )

            ),

            renderLogicStudioFocus(),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                truth:      { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDCCA', title: t('stem.logiclab.truth_tables_every_input_combination_e', 'Truth Tables \u2014 every input combination, every output'), hint: t('stem.logiclab.for_n_variables_the_table_has_2_rows_a', 'For n variables, the table has 2\u207F rows. AND, OR, NOT, XOR, IFF \u2014 each gate is just a column. Boolean algebra (Boole 1854) underlies every digital circuit, every search query, every conditional in code.') },
                proof:      { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83E\uDDE9', title: t('stem.logiclab.proof_builder_derive_conclusions_step_', 'Proof Builder \u2014 derive conclusions step by step'),     hint: t('stem.logiclab.modus_ponens_modus_tollens_hypothetica', 'Modus ponens, modus tollens, hypothetical syllogism, disjunctive syllogism \u2014 the eight inference rules cover most introductory propositional logic. Each step justifies itself by NAME, not vibe.') },
                challenges: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\u26A1',         title: t('stem.logiclab.challenges_graded_tautology_contradict', 'Challenges \u2014 graded tautology + contradiction puzzles'), hint: t('stem.logiclab.tautology_always_true_contradiction_al', 'Tautology = always true; contradiction = always false; contingency = sometimes both. Aristotle\u2019s law of non-contradiction (350 BCE) is the oldest published rule. AP CS Principles practice + intro discrete math.') },
                gates:      { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\u26A1\uFE0F', title: t('stem.logiclab.logic_gates_transistors_all_the_way_do', 'Logic Gates \u2014 transistors all the way down'),         hint: t('stem.logiclab.nand_is_functionally_complete_you_can_', 'NAND is functionally complete \u2014 you can build every other gate from NAND alone. A modern CPU contains ~10 billion transistors implementing the same boolean math you\u2019re building here.') },
                simLogic:   { accent: '#db2777', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDFB2', title: t('stem.logiclab.probability_logic_inference_under_unce', 'Probability Logic \u2014 inference under uncertainty'), hint: t('stem.logiclab.p_and_q_each_carry_a_probability_inste', 'P and Q each carry a probability instead of a hard true/false. For independent events, P(P\u2227Q) = P(P) \u00D7 P(Q). Watch how a confidence threshold turns soft probabilities into discrete inferences.') }
              };
              var meta = MODE_META[mode] || MODE_META.truth;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // ═══ MODE 1: TRUTH TABLES ═══

            mode === 'truth' && React.createElement("div", { className: "space-y-4" },

              // Expression builder — drag-and-drop
              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83E\uDDE9"),
                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, t('stem.logiclab.drag_and_drop_expression_builder', "Drag-and-Drop Expression Builder")),
                  React.createElement("span", { className: "text-xs text-violet-400 font-bold ml-auto" }, t('stem.logiclab.drag_tiles_or_click_to_add', "Drag tiles or click to add"))
                ),

                // Symbol palette
                React.createElement("div", { className: "mb-3 space-y-2" },
                  React.createElement("div", { className: "text-xs font-black text-violet-400 uppercase tracking-wider" }, t('stem.logiclab.variables', "Variables")),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['P','Q','R','S'].map(function(v) {
                      return React.createElement("div", { 
                        key: v, draggable: true,
                        onDragStart: function(e) { _drag.sym = v; e.dataTransfer.effectAllowed='copy'; },
                        onClick: function() { upd({ expression: expr + v }); },
                        className: "w-10 h-10 flex items-center justify-center font-black text-white text-base rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        style: { background: _symColor[v] }
                      }, v);
                    })
                  ),
                  React.createElement("div", { className: "text-xs font-black text-violet-400 uppercase tracking-wider" }, t('stem.logiclab.connectives', "Connectives")),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['\u2227','\u2228','\u00AC','\u2192','\u2194','\u2295'].map(function(sym) {
                      return React.createElement("div", { 
                        key: sym, draggable: true,
                        onDragStart: function(e) { _drag.sym = ' '+sym+' '; e.dataTransfer.effectAllowed='copy'; },
                        onClick: function() { upd({ expression: expr+' '+sym+' ' }); },
                        className: "px-3 h-10 flex items-center justify-center font-black text-white text-sm rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        title: CONN[sym] ? CONN[sym].eng : sym,
                        style: { background: _symColor[sym], minWidth: '44px' }
                      }, sym + ' ' + (CONN[sym] ? CONN[sym].eng : ''));
                    }),
                    ['(',')'].map(function(v) {
                      return React.createElement("div", { 
                        key: v, draggable: true,
                        onDragStart: function(e) { _drag.sym = v; e.dataTransfer.effectAllowed='copy'; },
                        onClick: function() { upd({ expression: expr+v }); },
                        className: "w-10 h-10 flex items-center justify-center font-black text-slate-600 text-base rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform bg-slate-100 hover:bg-slate-200"
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
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("input", {
                    type: "text", value: expr,
                    onChange: function(e) { upd({ expression: e.target.value }); },
                    placeholder: t('stem.logiclab.or_type_p_q', "Or type: P \u2192 Q"),
                    'aria-label': t('stem.logiclab.logic_expression_input', 'Logic expression input'),
                    className: "flex-1 px-3 py-2 rounded-lg border border-violet-200 text-sm font-mono text-violet-800 bg-white focus:ring-2 focus:ring-violet-400 outline-none"
                  }),
                  React.createElement("button", { "aria-label": t('stem.logiclab.backspace_last_symbol', "Backspace last symbol"),
                    onClick: function() { upd({ expression: expr.slice(0,-1).trimEnd() }); },
                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg text-sm"
                  }, "\u232B"),
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

                    className: "text-xs font-bold px-3 py-1.5 rounded-full transition-all " + (showEnglish ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-600 hover:bg-violet-200")

                  }, showEnglish ? "\uD83D\uDCDD English" : "\u2234 Formal")

                ),

                showEnglish && (function() {

                  try {

                    var toks = tokenize(expr);

                    if (toks.length > 0) {

                      var parsed = parseExpr(toks, 0);

                      return React.createElement("div", { className: "mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 italic" },

                        "\"\u200A" + nodeToEng(parsed.node) + "\u200A\""

                      );

                    }

                  } catch(e) {}

                  return null;

                })(),

                // Connective buttons

                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

                  Object.keys(CONN).map(function(sym) {

                    return React.createElement("button", { "aria-label": "Insert connective: " + CONN[sym].eng,

                      key: sym,

                      onClick: function() { upd({ expression: expr + ' ' + sym + ' ' }); },

                      className: "px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold rounded-lg transition-all text-sm",

                      title: CONN[sym].eng

                    }, sym + " " + CONN[sym].eng);

                  })

                ),

                // Variable buttons

                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

                  ['P','Q','R','S','(',')'].map(function(v) {

                    return React.createElement("button", { "aria-label": "Insert symbol: " + v,

                      key: v,

                      onClick: function() { upd({ expression: expr + v }); },

                      className: "px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-lg transition-all text-sm"

                    }, v);

                  }),

                  React.createElement("button", { "aria-label": t('stem.logiclab.backspace_last_symbol_2', "Backspace last symbol"),

                    onClick: function() { upd({ expression: expr.length > 0 ? expr.slice(0, -1) : '' }); },

                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg transition-all text-sm"

                  }, "\u232B"),

                  React.createElement("button", { "aria-label": t('stem.logiclab.clear_3', "Clear"),

                    onClick: function() { upd({ expression: '' }); },

                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all text-sm"

                  }, t('stem.logiclab.clear_4', "Clear"))

                ),

                // Presets

                React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-500 mr-1 self-center" }, "Presets:"),

                  PRESETS.map(function(p) {

                    return React.createElement("button", { "aria-label": "Load preset: " + p.label,

                      key: p.label,

                      onClick: function() { upd({ expression: p.expr }); if (typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Truth table explored'); },

                      className: "px-2.5 py-1 bg-white border border-violet-200 hover:border-violet-400 text-violet-600 text-xs font-bold rounded-full transition-all hover:shadow-sm"

                    }, p.label);

                  })

                )

              ),



              // Tautology/Contradiction XP
              (function() {
                var _t2 = genTable(expr);
                if (!_t2 || _t2.type === 'contingency') return null;
                return React.createElement("div", { className: "flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200" },
                  React.createElement("span", { className: "text-xl" }, _t2.type === 'tautology' ? '\uD83C\uDF89' : '\uD83D\uDCA5'),
                  React.createElement("span", { className: "font-black text-amber-800 text-sm flex-1" },
                    _t2.type === 'tautology' ? 'Always TRUE! You found a tautology!' : 'Always FALSE! You found a contradiction!'
                  ),
                  React.createElement("button", { "aria-label": t('stem.logiclab.claim_xp', "Claim XP"),
                    onClick: function() {
                      var xp = _t2.type === 'tautology' ? 10 : 5;
                      if (typeof awardStemXP === 'function') awardStemXP('logicLab', xp, 'Found '+_t2.type);
                      if (stemCelebrate) stemCelebrate();
                      if (addToast) addToast('\uD83C\uDF1F +'+xp+' XP for the '+_t2.type+'!', 'success');
                    },
                    className: "px-4 py-2 text-xs font-black text-white rounded-xl",
                    style: { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }
                  }, t('stem.logiclab.claim_xp_2', '\uD83C\uDF1F Claim XP'))
                );
              })(),

              // Truth table output

              (function() {

                var table = genTable(expr);

                if (!table) return React.createElement("div", { className: "p-8 text-center text-slate-600 text-sm" }, t('stem.logiclab.enter_an_expression_above_to_generate_', "Enter an expression above to generate a truth table"));

                var typeBadge = table.type === 'tautology' ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: t('stem.logiclab.tautology_always_true', '\u2705 Tautology (always true)'), glow: '0 0 20px rgba(16,185,129,0.3)' }

                  : table.type === 'contradiction' ? { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('stem.logiclab.contradiction_always_false', '\u274C Contradiction (always false)'), glow: '0 0 20px rgba(239,68,68,0.3)' }

                  : { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: t('stem.logiclab.contingency_sometimes_true', '\u26A0\uFE0F Contingency (sometimes true)'), glow: 'none' };



                return React.createElement("div", { className: "rounded-2xl border-2 border-violet-200 overflow-hidden", style: { background: _gCard } },

                  // Badge

                  React.createElement("div", { className: "px-5 py-3 flex items-center justify-between" },

                    React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, t('stem.logiclab.truth_table', "\uD83D\uDCCA Truth Table")),

                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black border " + typeBadge.bg + " " + typeBadge.text + " " + typeBadge.border, style: { boxShadow: typeBadge.glow } }, typeBadge.label),

                    React.createElement("button", { "aria-label": t('stem.logiclab.ai_explain_truth_table_expression', "AI explain truth table expression"),

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

                            React.createElement("td", { key: "result", className: "px-4 py-2 text-center font-black transition-colors " + (row.result ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" : "bg-red-50 text-red-600 group-hover:bg-red-100") },

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
                        React.createElement("div", { className: "flex items-center justify-between text-[11px] font-bold mb-1.5" },
                          React.createElement("span", { className: "text-emerald-700" }, "\u2713 True: " + trueCount + " / " + table.rows.length + " rows"),
                          React.createElement("span", { className: "text-slate-500 font-mono" }, truePct.toFixed(0) + "% satisfied"),
                          React.createElement("span", { className: "text-red-600" }, "\u2717 False: " + falseCount + " / " + table.rows.length + " rows")
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

                    var isCompleted = ci < currentChallenge || (ci === currentChallenge && proofComplete);

                    return React.createElement("button", { "aria-label": "Select proof challenge: Level " + (ci + 1),

                      key: ci,

                      onClick: function() { upd({ currentChallenge: ci, proofSteps: [], proofComplete: false, aiProof: null }); },

                      className: "p-3 rounded-xl text-center transition-all " + (isActive ? "ring-2 ring-violet-500 shadow-lg" : "hover:shadow-md"),

                      style: { background: isCompleted ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : isActive ? 'white' : '#f5f3ff', border: isCompleted ? '2px solid #6ee7b7' : '2px solid #e9d5ff' }

                    },

                      React.createElement("div", { className: "text-lg font-black " + (isCompleted ? "text-emerald-600" : "text-violet-700") }, isCompleted ? "\u2714" : "L" + ch.level),

                      React.createElement("div", { className: "text-[11px] font-bold text-slate-600 mt-0.5" }, ch.title)

                    );

                  })

                ),

                // AI Proof Generator

                React.createElement("div", { className: "mt-3 flex items-center gap-2" },

                  React.createElement("button", { "aria-label": t('stem.logiclab.ai_generate_proof_challenge', "AI-Generate Proof Challenge"),

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

                  aiLoading && React.createElement("span", { className: "text-xs text-violet-500 font-bold" }, "Generating..."),

                  aiProof && React.createElement("button", { "aria-label": t('stem.logiclab.clear_ai', "Clear AI"),

                    onClick: function() { upd({ aiProof: null, proofSteps: [], proofComplete: false }); },

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

                      var isSelected = (d.selectedSteps || []).indexOf('P' + pi) !== -1;

                      return React.createElement("button", { "aria-label": t('stem.logiclab.drag_or_click_to_select', "Drag or click to select"),
                        key: pi, draggable: true,
                        onDragStart: function(e) { _drag.proofKey = 'P'+pi; e.dataTransfer.effectAllowed='move'; },
                        onClick: function() {
                          var sel = (d.selectedSteps || []).slice();
                          var idx = sel.indexOf('P'+pi);
                          if (idx !== -1) sel.splice(idx, 1); else sel.push('P'+pi);
                          upd({ selectedSteps: sel });
                        },
                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-indigo-200 ring-2 ring-indigo-500 shadow-md" : "bg-white hover:bg-indigo-100 border border-indigo-200"),
                        title: t('stem.logiclab.drag_or_click_to_select_2', "Drag or click to select")
                      },

                        React.createElement("span", { className: "text-xs font-black text-indigo-400 w-6" }, "P" + (pi + 1)),

                        React.createElement("code", { className: "font-mono font-bold text-indigo-800 flex-1" }, p),

                        isSelected && React.createElement("span", { className: "text-indigo-600 text-xs font-black" }, "\u2714")

                      );

                    }),

                    React.createElement("div", { className: "mt-2 pt-2 border-t border-indigo-200 flex items-center gap-2" },

                      React.createElement("span", { className: "text-xs font-bold text-indigo-400" }, "Goal:"),

                      React.createElement("code", { className: "font-mono font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-lg" }, activeCh.conclusion)

                    ),

                    activeCh.context && React.createElement("div", { className: "mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200 text-[11px] text-purple-700 italic flex items-center gap-1" },

                      React.createElement("span", null, "\uD83E\uDD16"),

                      activeCh.context

                    )

                  ),



                  // Proof Steps

                  proofSteps.length > 0 && React.createElement("div", { className: "p-4 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                    React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-2" }, t('stem.logiclab.derivation', "\uD83D\uDD17 Derivation")),

                    proofSteps.map(function(step, si) {

                      var isSelected = (d.selectedSteps || []).indexOf('S' + si) !== -1;

                      return React.createElement("button", { "aria-label": "Select derivation step " + (si + 1) + ": " + step.result,
                        key: si,
                        style: { animation: si === proofSteps.length-1 ? 'logicPop 0.3s ease-out' : 'none' },
                        onClick: function() {

                          var sel = (d.selectedSteps || []).slice();

                          var idx = sel.indexOf('S' + si);

                          if (idx !== -1) sel.splice(idx, 1); else sel.push('S' + si);

                          upd({ selectedSteps: sel });

                        },

                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-violet-200 ring-2 ring-violet-500 shadow-md" : "bg-white hover:bg-violet-50 border border-violet-200")

                      },

                        React.createElement("span", { className: "text-xs font-black text-violet-400 w-6" }, (si + 1) + "."),

                        React.createElement("code", { className: "font-mono font-bold text-violet-800 flex-1" }, step.result),

                        React.createElement("span", { className: "text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded" }, step.rule),

                        step.result === activeCh.conclusion && React.createElement("span", { className: "text-emerald-500 font-black text-sm" }, "\uD83C\uDF89")

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-2" },

                      React.createElement("button", { "aria-label": t('stem.logiclab.undo', "Undo"),

                        onClick: function() {

                          var newSteps = proofSteps.slice(0, -1);

                          upd({ proofSteps: newSteps, proofComplete: false });

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

                    className: "text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"

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

                        var sel = d.selectedSteps || [];

                        if (sel.length < rule.needs) {

                          if (addToast) addToast('Select ' + rule.needs + ' statement(s) first, then click the rule.', 'info');

                          return;

                        }

                        // Gather selected statement texts

                        var selTexts = sel.map(function(s) {

                          if (s[0] === 'P') return activeCh.premises[parseInt(s.substring(1))];

                          if (s[0] === 'S') return proofSteps[parseInt(s.substring(1))].result;

                          return '';

                        });

                        var result = rule.check([], selTexts);

                        if (result) {

                          var newSteps = proofSteps.concat([{ result: result, rule: rule.name, from: sel.slice() }]);

                          var done = result === activeCh.conclusion;

                          upd({ proofSteps: newSteps, selectedSteps: [], proofComplete: done, fallacyNote: null });

                          if (done) {
                            var _xp = 5 + (activeCh.level || 1) * 3;
                            if (stemCelebrate) stemCelebrate();
                            if (stemBeep) stemBeep(880, 200);
                            if (typeof awardStemXP === 'function') awardStemXP('logicLab', _xp, 'Proof completed');
                            if (addToast) addToast('\uD83C\uDF89 Proof complete! +' + _xp + ' XP', 'success');
                            upd({ score: score + _xp });
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

                      React.createElement("div", { className: "text-[11px] font-mono text-slate-600 mt-0.5" }, rule.form),

                      React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5 italic" }, rule.eng)

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
                        className: "w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 border border-violet-300 hover:bg-violet-100 transition-all"
                      }, "🎯 Focus mode: show fewer rules");
                    }
                    if (hiddenCount > 0) {
                      return React.createElement("button", {
                        "aria-label": t('stem.logiclab.show_all_rules', "Show all inference rules"),
                        onClick: function() { upd({ showAllRules: true }); },
                        className: "w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-300 hover:bg-violet-50 transition-all"
                      }, "🔓 Show " + hiddenCount + " advanced rule" + (hiddenCount > 1 ? "s" : ""));
                    }
                    return null;
                  })(),

                  // Fallacy note — appears when a failed rule application matches a
                  // classic invalid move; cleared on the next valid step or reset.
                  d.fallacyNote && React.createElement("div", { className: "p-2.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-[11px] leading-relaxed text-amber-900", role: "status" },
                    React.createElement("span", { className: "font-black" }, "🚫 "),
                    d.fallacyNote
                  )

                )

              )

            ),





            // ═══ MODE 3: CHALLENGES ═══

            mode === 'challenges' && React.createElement("div", { className: "space-y-4" },

              // Score banner
              React.createElement("div", { className: "flex items-center gap-3 p-3 rounded-xl mb-2", style: { background: 'linear-gradient(to right, #f5f3ff, #ede9fe)' } },
                React.createElement("span", { className: "text-lg" }, "\uD83C\uDF1F"),
                React.createElement("span", { className: "font-black text-violet-800 text-sm" }, "Score: " + score),
                React.createElement("span", { className: "text-violet-300 font-bold" }, "|"),
                React.createElement("span", { className: "font-black text-amber-600 text-sm" }, "\uD83D\uDD25 Streak: " + streak + " (Best: " + bestStreak + ")"),
                React.createElement("button", { "aria-label": t('stem.logiclab.reset_challenge_score', "Reset challenge score"), onClick: function(){upd({score:0,streak:0,bestStreak:0});}, className: "ml-auto text-[11px] text-slate-600 hover:text-red-400 font-bold" }, t('stem.logiclab.reset_2', "Reset"))
              ),

              // Challenge type tabs
              React.createElement("div", { className: "flex gap-2 justify-center" },

                [['fallacy', '\uD83D\uDD0D', 'Fallacy Spotter'], ['quickfire', '\u23F1\uFE0F', 'Quick-Fire Tables'], ['detective', '\uD83D\uDD75\uFE0F', 'Reasoning']].map(function(ct) {

                  var active = challengeMode === ct[0];

                  return React.createElement("button", { "aria-label": "Switch to " + ct[2] + " challenge mode",

                    key: ct[0],

                    onClick: function() { upd({ challengeMode: ct[0], challengeIdx: 0, challengeAnswer: null }); },

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

                  className: "flex-1 px-3 py-1.5 rounded-lg border border-violet-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"

                }),

                userTopic && React.createElement("span", { className: "text-[11px] font-bold text-violet-500" }, t('stem.logiclab.ai_will_personalize', "AI will personalize \u2728"))

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

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, (challengeIdx + 1) + " / " + FALLACIES.length)

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
                        if (correct) { if (stemBeep) stemBeep(660, 100); if (typeof awardStemXP==='function') awardStemXP('logicLab', 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 120); }
                      },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-600 transition-all hover:shadow-md text-sm"

                    }, t('stem.logiclab.valid_2', "\u2705 Valid")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.invalid_fallacy', "Invalid (Fallacy)"),
                      onClick: function() {
                        var correct = f.valid === false;
                        var ns = correct ? streak + 1 : 0; var nb = Math.max(bestStreak, ns);
                        upd({ challengeAnswer: correct ? 'correct' : 'wrong', streak: ns, bestStreak: nb, score: correct ? score + 10 + (ns > 2 ? ns : 0) : score, animTick: animTick + 1 });
                        if (correct) { if (stemBeep) stemBeep(660, 100); if (typeof awardStemXP==='function') awardStemXP('logicLab', 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 120); }
                      },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-600 transition-all hover:shadow-md text-sm"

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

                      React.createElement("button", { "aria-label": t('stem.logiclab.ai_generate', "AI Generate"),

                        onClick: function() {

                          aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                          upd({ challengeAnswer: null });

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

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)' } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83E\uDD16"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, t('stem.logiclab.ai_generated_is_this_argument_valid', "AI-Generated: Is this argument valid?")),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full border border-purple-200" }, t('stem.logiclab.ai', "\u2728 AI"))

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + af.arg + '"'

                  ),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": t('stem.logiclab.valid_3', "Valid"),

                      onClick: function() { var c = af.valid === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm"

                    }, t('stem.logiclab.valid_4', "\u2705 Valid")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.invalid_fallacy_3', "Invalid (Fallacy)"),

                      onClick: function() { var c = af.valid === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-600 transition-all text-sm"

                    }, t('stem.logiclab.invalid_fallacy_4', "\u274C Invalid (Fallacy)"))

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, af.name + " \u2014 " + af.formal),

                    React.createElement("div", { className: "text-xs text-slate-600" }, af.explain),

                    React.createElement("button", { "aria-label": t('stem.logiclab.generate_another', "Generate Another"),

                      onClick: function() {

                        aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                        upd({ challengeAnswer: null });

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



                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\u23F1\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.fill_the_result_column', "Fill the Result Column")),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, ch.desc)

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

                                    onClick: function() { var a = Object.assign({}, userAnswers); a[ri] = true; upd({ qfAnswers: a }); },

                                    className: "px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded text-xs"

                                  }, "T"),

                                  React.createElement("button", { "aria-label": "F",

                                    onClick: function() { var a = Object.assign({}, userAnswers); a[ri] = false; upd({ qfAnswers: a }); },

                                    className: "px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded text-xs"

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

                    allCorrect && (function() { if (typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Quick-fire completed'); return null; })(),

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

                  { scenario: 'Detective Jones has three clues:\n1. If the butler did it, the window is broken.\n2. If the maid did it, there are footprints in the garden.\n3. The window is NOT broken.', question: t('stem.logiclab.can_we_conclude_the_butler_is_innocent', 'Can we conclude the butler is innocent?'), answer: true, rule: 'Modus Tollens', explain: 'Clue 1: Butler \u2192 Broken window. Clue 3: \u00ACBroken window. By Modus Tollens: \u00ACButler.' },

                  { scenario: 'At the science fair:\n1. If the volcano project wins, it gets a trophy.\n2. If it gets a trophy, it goes in the display case.\n3. The volcano project wins!', question: t('stem.logiclab.will_it_go_in_the_display_case', 'Will it go in the display case?'), answer: true, rule: 'Hypothetical Syllogism + MP', explain: 'Chain: Wins \u2192 Trophy \u2192 Display case. Wins is true. By HS: Wins \u2192 Display case. By MP: Display case.' },

                  { scenario: 'Lunch options:\n1. We are having pizza OR pasta.\n2. The pizza oven is broken (no pizza).', question: t('stem.logiclab.are_we_having_pasta', 'Are we having pasta?'), answer: true, rule: 'Disjunctive Syllogism', explain: 'Pizza\u2228Pasta, \u00ACPizza. By DS: Pasta. \u2714' },
                  { scenario: 'Animal mystery:\n1. If the creature has wings, it can fly.\n2. If it can fly, we would see it in the sky.\n3. We did NOT see anything in the sky.', question: t('stem.logiclab.can_we_conclude_the_creature_has_no_wi', 'Can we conclude the creature has no wings?'), answer: true, rule: 'HS + Modus Tollens', explain: 'Wings\u2192Fly\u2192Sky. HS: Wings\u2192Sky. MT with \u00ACSky: \u00ACWings. \u2714' },
                  { scenario: 'Treasure hunt:\n1. Gold is in Cave A or Cave B.\n2. Explorers searched Cave A \u2014 no gold there.', question: t('stem.logiclab.is_the_gold_in_cave_b', 'Is the gold in Cave B?'), answer: true, rule: 'Disjunctive Syllogism', explain: 'A\u2228B, \u00ACA. By DS: B. \u2714' },
                  { scenario: 'Weather:\n1. If dark clouds, it will rain.\n2. If it rains, the picnic is cancelled.\n3. The picnic was NOT cancelled.', question: t('stem.logiclab.can_we_conclude_no_dark_clouds', 'Can we conclude no dark clouds?'), answer: true, rule: 'HS + Modus Tollens', explain: 'Clouds\u2192Rain\u2192Cancel. HS: Clouds\u2192Cancel. MT with \u00ACCancel: \u00ACClouds. \u2714' }
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

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = det.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm" }, t('stem.logiclab.yes', "\u2705 Yes")),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = det.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-600 transition-all text-sm" }, t('stem.logiclab.no', "\u274C No")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.can_t_tell', "Can't tell"), onClick: function() { var c = 'wrong'; upd({ challengeAnswer: c }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, t('stem.logiclab.can_t_tell_2', "\u2753 Can't tell"))

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + det.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, det.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiDetective: null }); }, className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all" }, t('stem.logiclab.next_3', "Next \u2192")),

                      React.createElement("button", { "aria-label": t('stem.logiclab.ai_mystery', "AI Mystery"),

                        onClick: function() {

                          aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                          upd({ challengeAnswer: null });

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

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)' } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, t('stem.logiclab.ai_mystery_3', "AI Mystery")),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full border border-purple-200" }, t('stem.logiclab.ai_2', "\u2728 AI"))

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, ad.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + ad.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = ad.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-600 transition-all text-sm" }, t('stem.logiclab.yes_2', "\u2705 Yes")),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = ad.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-600 transition-all text-sm" }, t('stem.logiclab.no_2', "\u274C No")),

                    React.createElement("button", { "aria-label": t('stem.logiclab.can_t_tell_3', "Can't tell"), onClick: function() { upd({ challengeAnswer: 'wrong' }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, t('stem.logiclab.can_t_tell_4', "\u2753 Can't tell"))

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + ad.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, ad.explain),

                    React.createElement("button", { "aria-label": t('stem.logiclab.generate_another_3', "Generate Another"),

                      onClick: function() {

                        aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                        upd({ challengeAnswer: null });

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
              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)' } },
                React.createElement("div", { className: "flex items-center gap-2 mb-4" },
                  React.createElement("span", { style: { fontSize: '20px' } }, "\u26A1\uFE0F"),
                  React.createElement("h3", { className: "font-black text-violet-900" }, t('stem.logiclab.logic_gate_simulator', "Logic Gate Simulator")),
                  React.createElement("span", { className: "text-xs text-violet-400 font-bold" }, t('stem.logiclab.toggle_inputs_to_see_the_output_live', "Toggle inputs to see the output live"))
                ),
                // Binary-state legend — clarifies what the 1s and 0s on the wires mean
                React.createElement("div", { className: "flex items-center gap-3 mb-4 text-[11px] font-bold" },
                  React.createElement("span", { className: "inline-flex items-center gap-1" }, React.createElement("span", { className: "inline-block w-4 h-4 rounded bg-emerald-500 text-white text-center leading-4" }, "1"), React.createElement("span", { className: "text-emerald-700" }, t('stem.logiclab.high_true_on', "HIGH · true · on"))),
                  React.createElement("span", { className: "inline-flex items-center gap-1" }, React.createElement("span", { className: "inline-block w-4 h-4 rounded bg-slate-300 text-slate-700 text-center leading-4" }, "0"), React.createElement("span", { className: "text-slate-500" }, t('stem.logiclab.low_false_off', "LOW · false · off")))
                ),
                // Gate selector
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                  GATE_TYPES.map(function(gt) {
                    return React.createElement("button", { "aria-label": "Select logic gate: " + gt, key: gt, onClick: function(){upd({gateType:gt});if(stemBeep)stemBeep(440,0.05);},
                      className: "px-4 py-2 rounded-xl text-sm font-black transition-all",
                      style: { background: gateType===gt?'linear-gradient(135deg,#7c3aed,#a78bfa)':'#f5f3ff', color: gateType===gt?'white':'#7c3aed', boxShadow: gateType===gt?'0 4px 12px rgba(124,58,237,0.3)':'none' }
                    }, gt);
                  })
                ),
                // Inputs + SVG gate + output
                React.createElement("div", { className: "flex items-center justify-center gap-8 mb-4 flex-wrap" },
                  // Input toggles
                  React.createElement("div", { className: "flex flex-col gap-3" },
                    ['A', isUnaryGate ? null : 'B'].filter(Boolean).map(function(inp) {
                      var val = gateInputs[inp];
                      return React.createElement("div", { key: inp, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-xs font-black text-slate-600 w-4" }, inp),
                        React.createElement("button", { "aria-label": "Toggle gate input " + inp + ": " + (val ? 'True to False' : 'False to True'),
                          onClick: function() {
                            var ni = Object.assign({}, gateInputs); ni[inp] = !ni[inp];
                            upd({ gateInputs: ni });
                            if (stemBeep) stemBeep(val?330:523, 0.06);
                          },
                          className: "w-20 h-10 rounded-xl font-black text-sm text-white shadow-md transition-all hover:scale-105",
                          style: { background: val?'linear-gradient(135deg,#059669,#10b981)':'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: val?'0 4px 12px rgba(16,185,129,0.4)':'0 4px 12px rgba(239,68,68,0.3)' }
                        }, val ? "1 (T)" : "0 (F)")
                      );
                    })
                  ),
                  // Gate SVG
                  React.createElement("svg", { width: "120", height: "80", viewBox: "0 0 120 80" },
                    React.createElement("line", { x1:"0",y1:isUnaryGate?"40":"25",x2:"35",y2:isUnaryGate?"40":"25",stroke:gateInputs.A?"#059669":"#dc2626",strokeWidth:"3" }),
                    !isUnaryGate && React.createElement("line", { x1:"0",y1:"55",x2:"35",y2:"55",stroke:gateInputs.B?"#059669":"#dc2626",strokeWidth:"3" }),
                    (function() {
                      // Distinct IEEE gate shapes (was a generic rounded rect with the name typed inside).
                      var inverting = gateType === 'NOT' || gateType === 'NAND' || gateType === 'NOR' || gateType === 'XNOR';
                      var base = (gateType === 'AND' || gateType === 'NAND') ? 'and'
                               : (gateType === 'OR' || gateType === 'NOR') ? 'or'
                               : (gateType === 'XOR' || gateType === 'XNOR') ? 'xor' : 'not';
                      var fill = '#7c3aed', stroke = '#5b21b6';
                      var bx = inverting ? 82 : 88; // right edge of the body (bubble sits just past it)
                      var shapes = [];
                      if (base === 'and') {
                        var midx = bx - 25;
                        shapes.push(React.createElement('path', { key: 'b', d: 'M35,15 L' + midx + ',15 A25,25 0 0 1 ' + midx + ',65 L35,65 Z', fill: fill, stroke: stroke, strokeWidth: 2 }));
                      } else if (base === 'or') {
                        shapes.push(React.createElement('path', { key: 'b', d: 'M35,15 Q52,40 35,65 Q60,63 ' + bx + ',40 Q60,17 35,15 Z', fill: fill, stroke: stroke, strokeWidth: 2 }));
                      } else if (base === 'xor') {
                        shapes.push(React.createElement('path', { key: 'b', d: 'M39,15 Q56,40 39,65 Q64,63 ' + bx + ',40 Q64,17 39,15 Z', fill: fill, stroke: stroke, strokeWidth: 2 }));
                        shapes.push(React.createElement('path', { key: 'x', d: 'M32,15 Q49,40 32,65', fill: 'none', stroke: stroke, strokeWidth: 2 }));
                      } else {
                        shapes.push(React.createElement('path', { key: 'b', d: 'M38,16 L' + bx + ',40 L38,64 Z', fill: fill, stroke: stroke, strokeWidth: 2 }));
                      }
                      if (inverting) shapes.push(React.createElement('circle', { key: 'bub', cx: bx + 5, cy: 40, r: 4, fill: 'white', stroke: stroke, strokeWidth: 2 }));
                      shapes.push(React.createElement('text', { key: 't', x: base === 'not' ? 52 : 58, y: 44, textAnchor: 'middle', fill: 'white', fontWeight: '900', fontSize: '9' }, gateType));
                      return shapes;
                    })(),
                    React.createElement("line", { x1:"90",y1:"40",x2:"120",y2:"40",stroke:gateOutput?"#059669":"#dc2626",strokeWidth:"3", style:{ filter: gateOutput ? 'drop-shadow(0 0 3px rgba(16,185,129,0.8))' : 'none', transition: 'filter 0.2s' } }),
                    React.createElement("circle", { cx:"115",cy:"40",r:"5",fill:gateOutput?"#059669":"#dc2626", style:{ filter: gateOutput ? 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' : 'none', transition: 'filter 0.2s' } })
                  ),
                  // Output
                  React.createElement("div", { className: "flex flex-col items-center gap-1" },
                    React.createElement("div", {
                      key: 'gate-'+animTick,
                      className: "w-20 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg",
                      style: { background:gateOutput?'linear-gradient(135deg,#059669,#10b981)':'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow:gateOutput?'0 8px 24px rgba(16,185,129,0.4)':'0 8px 24px rgba(239,68,68,0.3)', animation:'logicPop 0.2s ease-out' }
                    }, gateOutput?"1":"0"),
                    React.createElement("span", { className: "text-xs font-bold text-slate-600" }, t('stem.logiclab.output', "Output")),
                    React.createElement("span", { className: "text-sm font-black "+(gateOutput?"text-emerald-600":"text-red-500") }, gateOutput?"TRUE":"FALSE")
                  )
                ),
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
                        React.createElement("th", { scope: "col", className: "px-4 py-2 text-white font-black text-center rounded-lg", style:{background:'linear-gradient(135deg,#7c3aed,#a78bfa)'} }, gateType)
                      )),
                      React.createElement("tbody", null,
                        rows2.map(function(r2,ri2) {
                          var isActive2 = r2.A===gateInputs.A && (isUnaryGate||r2.B===gateInputs.B);
                          return React.createElement("tr", { key:ri2, style:{background:isActive2?'#ede9fe':'transparent'} },
                            React.createElement("td",{className:"px-4 py-2 text-center font-bold bg-white "+(r2.A?"text-emerald-600":"text-slate-600")},r2.A?"T":"F"),
                            !isUnaryGate&&React.createElement("td",{className:"px-4 py-2 text-center font-bold bg-white "+(r2.B?"text-emerald-600":"text-slate-600")},r2.B?"T":"F"),
                            React.createElement("td",{className:"px-4 py-2 text-center font-black "+(r2.out?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600")},r2.out?"\u2705 T":"\u274C F")
                          );
                        })
                      )
                    ),
                    // Open in truth tables
                    React.createElement("div", { className: "mt-3 p-3 bg-violet-50 rounded-xl border border-violet-200 flex items-center gap-2" },
                      React.createElement("code", { className: "text-xs font-mono font-black text-violet-700" },
                        gateType==='AND'?'P \u2227 Q':gateType==='OR'?'P \u2228 Q':gateType==='NOT'?'\u00AC P':gateType==='NAND'?'\u00AC (P \u2227 Q)':gateType==='NOR'?'\u00AC (P \u2228 Q)':gateType==='XOR'?'P \u2295 Q':'\u00AC (P \u2295 Q)'
                      ),
                      React.createElement("button", { "aria-label": t('stem.logiclab.open_in_truth_tables', "Open in Truth Tables"),
                        onClick: function() {
                          var fml = gateType==='AND'?'P \u2227 Q':gateType==='OR'?'P \u2228 Q':gateType==='NOT'?'\u00AC P':gateType==='NAND'?'\u00AC (P \u2227 Q)':gateType==='NOR'?'\u00AC (P \u2228 Q)':gateType==='XOR'?'P \u2295 Q':'\u00AC (P \u2295 Q)';
                          upd({ mode:'truth', expression: fml });
                          if (addToast) addToast('Opened in Truth Table builder!','info');
                        },
                        className: "ml-auto px-3 py-1 bg-violet-200 hover:bg-violet-300 text-violet-700 font-bold rounded-full text-[11px]"
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
                bothCertain:   { label: t('stem.logiclab.both_certain_p_q_likely', '✅ Both certain (P∧Q likely)'), color: '#059669', bg: '#ecfdf5', border: '#86efac' },
                pLikely:       { label: t('stem.logiclab.p_likely_q_uncertain', '🟡 P likely; Q uncertain'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
                contradiction: { label: t('stem.logiclab.apparent_contradiction', '⚠️ Apparent contradiction'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                inconclusive:  { label: t('stem.logiclab.inconclusive', '🤔 Inconclusive'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' }
              }[state];
              return React.createElement('div', { className: 'p-4 rounded-xl bg-white border border-violet-300 space-y-3' },
                React.createElement('h3', { className: 'text-sm font-black text-violet-700' }, t('stem.logiclab.probability_logic_discovery', '🎲 Probability logic discovery')),
                React.createElement('p', { className: 'text-[12px] text-slate-700' }, t('stem.logiclab.sliders_for_p_q_truth_probabilities_co', 'Sliders for P, Q truth probabilities, confidence threshold. Discrete 4-state inference outcome. No score, no reveal.')),
                React.createElement('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  React.createElement('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  React.createElement('div', { className: 'text-[10px] text-slate-700 mt-1 font-mono' }, 'P(P)=' + iq.pTrue + '%, P(Q)=' + iq.qTrue + '%, P(P∧Q)=' + pAnd.toFixed(0) + '%, P(P∨Q)=' + pOr.toFixed(0) + '%')
                ),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3' },
                  [{ k: 'pTrue', l: 'P truth %' }, { k: 'qTrue', l: 'Q truth %' }, { k: 'threshold', l: 'Confidence %' }].map(function(s) {
                    return React.createElement('div', { key: s.k },
                      React.createElement('label', { htmlFor: 'sl-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-violet-700' }, iq[s.k])),
                      React.createElement('input', { id: 'sl-' + s.k, type: 'range', min: 0, max: 100, step: 5, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                  React.createElement('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ p: iq.pTrue, q: iq.qTrue, t: iq.threshold, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, t('stem.logiclab.log', '📋 Log')),
                  React.createElement('button', { onClick: function() { setIQ({ pTrue: 70, qTrue: 70, threshold: 80, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, t('stem.logiclab.reset_3', '↺ Reset'))
                ),
                React.createElement('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.logiclab.hypothesis_when_does_p_p_q_p_p_p_q', 'Hypothesis: When does P(P∧Q) ≈ P(P)·P(Q)?'),
                  className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, t('stem.logiclab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                iq.stuckRevealed && React.createElement('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700' },
                  React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
                    React.createElement('li', null, t('stem.logiclab.independence_vs_correlation_when_does_', 'Independence vs correlation — when does each apply?')),
                    React.createElement('li', null, t('stem.logiclab.how_does_threshold_change_inference_ou', 'How does threshold change inference outcome?')))),
                React.createElement('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                  React.createElement('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  t('stem.logiclab.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                iq.understood && React.createElement('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.logiclab.explain_probability_logic', 'Explain probability logic.'),
                  className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
                React.createElement('div', { className: 'text-[10px] italic text-slate-500' }, t('stem.logiclab.design_note_discrete_4_state_inference', 'Design note: discrete 4-state inference marker; no probability score; no reveal — by design.'))
              );
            })(),

            // ═══ EDUCATIONAL PANEL ═══

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", { "aria-label": t('stem.logiclab.toggle_educational_panel_what_is_propo', "Toggle educational panel: What is Propositional Logic"),

                onClick: function() { upd({ showEdu: !showEdu }); if (!showEdu && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'First logic session'); },

                className: "w-full p-4 rounded-2xl border-2 border-violet-200 text-left transition-all hover:shadow-md flex items-center gap-3",

                style: { background: showEdu ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : 'white' }

              },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDCD6"),

                React.createElement("span", { className: "font-black text-violet-900 text-sm flex-1" }, t('stem.logiclab.learn_what_is_propositional_logic', "Learn: What is Propositional Logic?")),

                React.createElement("span", { className: "text-violet-400 font-bold text-xs" }, showEdu ? "\u25B2 Hide" : "\u25BC Show")

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
                      return React.createElement("div", { 
                        key: law[0],
                        className: "flex items-center gap-2 p-2 bg-white rounded-lg border border-violet-100 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all",
                        onClick: function() { upd({ expression: law[1].split(' \u2261 ')[0].trim(), mode: 'truth' }); if(addToast) addToast('Loaded in Truth Tables!','info'); }
                      },
                        React.createElement("span", { className: "text-[11px] font-black text-violet-500 w-28 shrink-0" }, law[0]),
                        React.createElement("code", { className: "font-mono text-xs text-violet-800 font-bold" }, law[1]),
                        React.createElement("span", { className: "ml-auto text-violet-300 text-[11px]" }, "\u2192")
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
              showTruthLab && React.createElement('div', { className: 'mt-3 rounded-xl overflow-hidden border border-violet-200', style: { background: '#1e1b4b', aspectRatio: '16/5' } },
                React.createElement('canvas', {
                  role: 'img',
                  tabIndex: 0,
                  'aria-label': t('stem.logiclab.truth_table_visualization_cycling_thro', 'Truth table visualization cycling through AND, OR, XOR, and NAND logic gates.'),
                  ref: function(cvEl) {
                    if (!cvEl) return;
                    if (cvEl._ttAnim) return;
                    var c2 = cvEl.getContext('2d');
                    var W = cvEl.offsetWidth || 600;
                    var H = cvEl.offsetHeight || 180;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    c2.scale(2, 2);
                    var start = performance.now();
                    var lastBlink = -1;
                    var ops = [
                      { name: 'AND', sym: '\u2227', fn: function(a,b){return a&&b;}, color: '#3b82f6' },
                      { name: 'OR', sym: '\u2228', fn: function(a,b){return a||b;}, color: '#22c55e' },
                      { name: 'XOR', sym: '\u2295', fn: function(a,b){return a!==b;}, color: '#fbbf24' },
                      { name: 'NAND', sym: '\u22bc', fn: function(a,b){return !(a&&b);}, color: '#fb7185' }
                    ];
                    function drawTt() {
                      if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._ttAnim); if (cvEl._ttRO) cvEl._ttRO.disconnect(); return; }
                      var t = (performance.now() - start) / 1000;
                      var blink = Math.floor((t * 0.5) % ops.length);
                      // Content only changes when `blink` flips (~every 2s); skip the
                      // full redraw on the ~119/120 frames where it's unchanged.
                      if (blink === lastBlink) { cvEl._ttAnim = requestAnimationFrame(drawTt); return; }
                      lastBlink = blink;
                      c2.fillStyle = '#1e1b4b';
                      c2.fillRect(0, 0, W, H);
                      var op = ops[blink];
                      // Title
                      c2.fillStyle = op.color;
                      c2.font = 'bold 14px serif';
                      c2.textAlign = 'left';
                      c2.fillText('A ' + op.sym + ' B  (' + op.name + ')', W * 0.06, 24);
                      // Table
                      var tx = W * 0.06, ty = 36;
                      var rowH = 24;
                      var colW = W * 0.1;
                      var rows = [
                        ['A', 'B', op.name],
                        [0, 0, op.fn(false, false) ? 1 : 0],
                        [0, 1, op.fn(false, true) ? 1 : 0],
                        [1, 0, op.fn(true, false) ? 1 : 0],
                        [1, 1, op.fn(true, true) ? 1 : 0]
                      ];
                      rows.forEach(function(r, ri) {
                        r.forEach(function(cell, ci) {
                          c2.strokeStyle = '#475569';
                          c2.strokeRect(tx + ci * colW, ty + ri * rowH, colW, rowH);
                          c2.fillStyle = ri === 0 ? op.color : (cell === 1 ? '#86efac' : (cell === 0 ? '#cbd5e1' : '#fff'));
                          c2.font = ri === 0 ? 'bold 11px sans-serif' : 'bold 13px monospace';
                          c2.textAlign = 'center';
                          c2.fillText(cell, tx + ci * colW + colW / 2, ty + ri * rowH + 16);
                        });
                      });
                      // Gate symbol
                      var gx = W * 0.55, gy = H * 0.5;
                      c2.strokeStyle = op.color;
                      c2.lineWidth = 2;
                      // Gate + signal paths glow in the op colour
                      c2.save();
                      c2.shadowColor = op.color; c2.shadowBlur = 12;
                      // Input lines
                      c2.beginPath();
                      c2.moveTo(gx - 60, gy - 12);
                      c2.lineTo(gx - 20, gy - 12);
                      c2.moveTo(gx - 60, gy + 12);
                      c2.lineTo(gx - 20, gy + 12);
                      c2.stroke();
                      // Gate body (AND/OR shape)
                      c2.fillStyle = 'rgba(167,139,250,0.28)';
                      c2.beginPath();
                      if (op.name === 'AND' || op.name === 'NAND') {
                        c2.moveTo(gx - 20, gy - 18);
                        c2.lineTo(gx, gy - 18);
                        c2.arc(gx, gy, 18, -Math.PI / 2, Math.PI / 2);
                        c2.lineTo(gx - 20, gy + 18);
                        c2.closePath();
                      } else {
                        c2.moveTo(gx - 20, gy - 18);
                        c2.quadraticCurveTo(gx - 5, gy - 18, gx + 18, gy);
                        c2.quadraticCurveTo(gx - 5, gy + 18, gx - 20, gy + 18);
                        c2.quadraticCurveTo(gx - 10, gy, gx - 20, gy - 18);
                        c2.closePath();
                      }
                      c2.fill();
                      c2.stroke();
                      // NAND bubble
                      if (op.name === 'NAND') {
                        c2.beginPath();
                        c2.arc(gx + 22, gy, 3, 0, Math.PI * 2);
                        c2.stroke();
                      }
                      // Output line
                      c2.beginPath();
                      c2.moveTo(gx + (op.name === 'NAND' ? 25 : 20), gy);
                      c2.lineTo(gx + 60, gy);
                      c2.stroke();
                      c2.restore();
                      // Labels
                      c2.fillStyle = '#fef3c7';
                      c2.font = 'bold 11px monospace';
                      c2.textAlign = 'right';
                      c2.fillText('A', gx - 64, gy - 8);
                      c2.fillText('B', gx - 64, gy + 16);
                      c2.textAlign = 'left';
                      c2.fillText('Out', gx + 64, gy + 4);
                      c2.fillStyle = 'rgba(0,0,0,0.85)';
                      c2.fillRect(8, H - 14, W - 16, 12);
                      c2.font = 'bold 8px sans-serif'; c2.fillStyle = '#c4b5fd'; c2.textAlign = 'center';
                      c2.fillText('Boole 1854. Every CPU uses these gates. NAND is universal \u2014 you can build anything from just NAND.', W / 2, H - 5);
                      cvEl._ttAnim = requestAnimationFrame(drawTt);
                    }
                    drawTt();
                    var ro = new ResizeObserver(function() {
                      W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                      cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2);
                      lastBlink = -1; // force a repaint at the new size
                    });
                    cvEl._ttRO = ro; // stored so the rAF teardown can disconnect it (was leaking on unmount)
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
