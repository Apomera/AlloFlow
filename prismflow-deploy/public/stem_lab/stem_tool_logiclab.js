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
      var t = ctx.t;
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



          var parseExpr = function(tokens, pos) {

            var left = parseUnary(tokens, pos);

            while (left.pos < tokens.length) {

              var tok = tokens[left.pos];

              if (!tok || !CONN[tok] || CONN[tok].unary) break;

              var op = tok;

              var right = parseUnary(tokens, left.pos + 1);

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

            { label: 'Implication', expr: 'P → Q' },

            { label: "De Morgan's 1", expr: '¬ (P ∧ Q)' },

            { label: "De Morgan's 2", expr: '(¬ P) ∨ (¬ Q)' },

            { label: 'Contrapositive', expr: '(¬ Q) → (¬ P)' },

            { label: 'XOR', expr: 'P ⊕ Q' },

            { label: 'Tautology', expr: 'P ∨ (¬ P)' },

            { label: 'Contradiction', expr: 'P ∧ (¬ P)' },

            { label: 'Biconditional', expr: 'P ↔ Q' },

            { label: 'Distributive', expr: 'P ∧ (Q ∨ R)' },

            { label: 'Modus Ponens form', expr: '(P ∧ (P → Q)) → Q' }

          ];





          // ── Inference Rules ──

          var RULES = [

            { id: 'mp', name: 'Modus Ponens', form: 'P→Q, P ∴ Q', eng: 'If you study, you pass. You studied. ∴ You pass.', needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  if (m && m[1].trim() === sel[j].trim()) return m[2].trim();

                }

                return null;

              }

            },

            { id: 'mt', name: 'Modus Tollens', form: 'P→Q, ¬Q ∴ ¬P', eng: "If it rains, ground is wet. Ground isn't wet. ∴ It didn't rain.", needs: 2,

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

            { id: 'hs', name: 'Hypothetical Syllogism', form: 'P→Q, Q→R ∴ P→R', eng: 'If A then B, if B then C. ∴ If A then C.', needs: 2,

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

            { id: 'ds', name: 'Disjunctive Syllogism', form: 'P∨Q, ¬P ∴ Q', eng: "It's red or blue. It's not red. ∴ It's blue.", needs: 2,

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

            { id: 'conj', name: 'Conjunction', form: 'P, Q ∴ P∧Q', eng: 'Combine two truths into one.', needs: 2,

              check: function(premises, sel) {

                if (sel.length === 2) return sel[0].trim() + ' ∧ ' + sel[1].trim();

                return null;

              }

            },

            { id: 'simp', name: 'Simplification', form: 'P∧Q ∴ P', eng: 'Extract one truth from a pair.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*∧\s*(.+)$/);

                if (m) return m[1].trim();

                return null;

              }

            },

            { id: 'add', name: 'Addition', form: 'P ∴ P∨Q', eng: 'Add any alternative to a truth.', needs: 1,

              check: function(premises, sel) {

                return sel[0].trim() + ' ∨ Q';

              }

            },

            { id: 'dn', name: 'Double Negation', form: '¬¬P ≡ P', eng: '"Not not raining" = "Raining."', needs: 1,

              check: function(premises, sel) {

                var s = sel[0].trim();

                if (s.indexOf('¬¬') === 0) return s.substring(2);

                return '¬¬' + s;

              }

            },

            { id: 'contra', name: 'Contrapositive', form: 'P→Q ≡ ¬Q→¬P', eng: 'Reverse and negate.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*→\s*(.+)$/);

                if (m) return '¬' + m[2].trim() + ' → ¬' + m[1].trim();

                return null;

              }

            },

            { id: 'demorgan', name: "De Morgan's", form: '¬(P∧Q) ≡ ¬P∨¬Q', eng: '"Not both" = "at least one isn\'t."', needs: 1,

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
            { level: 1, title: 'Simple Deduction', premises: ['P \u2192 Q', 'P'], conclusion: 'Q', hint: 'Use Modus Ponens: P\u2192Q and P gives Q' },
            { level: 2, title: 'Denial', premises: ['P \u2192 Q', '\u00ACQ'], conclusion: '\u00ACP', hint: 'Use Modus Tollens: P\u2192Q and \u00ACQ gives \u00ACP' },
            { level: 3, title: 'Chain Reaction', premises: ['P \u2192 Q', 'Q \u2192 R', 'P'], conclusion: 'R', hint: 'HS chains P\u2192Q and Q\u2192R, then MP with P' },
            { level: 4, title: 'Elimination', premises: ['P \u2228 Q', '\u00ACP'], conclusion: 'Q', hint: 'Disjunctive Syllogism: P\u2228Q and \u00ACP gives Q' },
            { level: 5, title: 'Combine & Conclude', premises: ['(P \u2227 Q) \u2192 R', 'P', 'Q'], conclusion: 'R', hint: 'Conjunction gives P\u2227Q, then Modus Ponens gives R' },
            { level: 6, title: 'Long Chain', premises: ['P \u2192 Q', 'Q \u2192 R', 'R \u2192 S', 'P'], conclusion: 'S', hint: 'Chain P\u2192Q and Q\u2192R with HS, then again with R\u2192S, then MP' },
            { level: 7, title: 'Double Deny', premises: ['P \u2192 Q', '\u00ACQ', 'P \u2228 R'], conclusion: 'R', hint: 'MT on P\u2192Q gives \u00ACP, then DS on P\u2228R gives R' },
            { level: 8, title: 'Master Proof', premises: ['P \u2192 Q', 'Q \u2192 R', '\u00ACR'], conclusion: '\u00ACP', hint: 'HS gives P\u2192R, then MT with \u00ACR gives \u00ACP' }
          ];



          // ── Fallacy challenges ──

          var FALLACIES = [

            { arg: 'If it rains, the ground is wet. The ground is wet. Therefore, it rained.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'The ground could be wet for other reasons (sprinkler, spill).' },

            { arg: 'If you study, you\'ll pass. You didn\'t study. Therefore, you won\'t pass.', valid: false, name: 'Denying the Antecedent', formal: 'P→Q, ¬P ∴ ¬Q ✗', explain: 'You might pass anyway (natural talent, lucky guesses).' },

            { arg: 'All dogs are mammals. Fido is a dog. Therefore, Fido is a mammal.', valid: true, name: 'Valid Syllogism', formal: '∀x(Dog(x)→Mammal(x)), Dog(Fido) ∴ Mammal(Fido) ✓', explain: 'Classic valid deductive reasoning.' },

            { arg: 'If you\'re a cat, you have four legs. Spot has four legs. Therefore, Spot is a cat.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Spot could be a dog, a horse, or any four-legged animal!' },

            { arg: 'Either we go to the park or we go to the movies. We\'re not going to the park. Therefore, we go to the movies.', valid: true, name: 'Disjunctive Syllogism', formal: 'P∨Q, ¬P ∴ Q ✓', explain: 'With only two options, eliminating one leaves the other.' },

            { arg: 'If it snows, school is cancelled. School is not cancelled. Therefore, it did not snow.', valid: true, name: 'Modus Tollens', formal: 'P→Q, ¬Q ∴ ¬P ✓', explain: 'Denying the consequent validly denies the antecedent.' },

            { arg: 'Everyone who exercises is healthy. Maria is healthy. Therefore, Maria exercises.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Maria might be healthy for other reasons (genetics, diet).' },

            { arg: 'If a shape is a square, it has four sides. This shape has four sides. Therefore, it\'s a square.', valid: false, name: 'Affirming the Consequent', formal: 'P\u2192Q, Q \u2234 P \u2717', explain: 'Rectangles and rhombuses also have four sides!' },
            { arg: 'If you eat vegetables, you grow tall. Sam doesn\'t eat vegetables. Therefore, Sam won\'t grow tall.', valid: false, name: 'Denying the Antecedent', formal: 'P\u2192Q, \u00ACP \u2234 \u00ACQ \u2717', explain: 'Height depends on many factors — genetics, sleep, and more.' },
            { arg: 'If the alarm goes off, there is a fire. The alarm went off. Therefore, there is a fire.', valid: true, name: 'Modus Ponens', formal: 'P\u2192Q, P \u2234 Q \u2713', explain: 'Classic valid MP — the alarm confirms the fire consequence.' },
            { arg: 'It is raining OR it is sunny. It is raining. Therefore, it is not sunny.', valid: false, name: 'False Exclusive Disjunction', formal: 'P\u2228Q, P \u2234 \u00ACQ \u2717', explain: 'OR is inclusive — both could be true (a light rain in sunshine).' },
            { arg: 'If we win the game, we celebrate. We did not win. Therefore, we do not celebrate.', valid: false, name: 'Denying the Antecedent', formal: 'P\u2192Q, \u00ACP \u2234 \u00ACQ \u2717', explain: 'You could celebrate the season ending, effort, or other achievements.' }
          ];



          // ── Quick-fire truth table challenges ──

          var TT_CHALLENGES = [

            { expr: 'P ∧ Q', desc: 'AND gate' },

            { expr: 'P ∨ Q', desc: 'OR gate' },

            { expr: 'P → Q', desc: 'Implication' },

            { expr: '¬ P', desc: 'Negation' },

            { expr: 'P ⊕ Q', desc: 'Exclusive OR' },

            { expr: '(P \u2192 Q) \u2227 (Q \u2192 P)', desc: 'Biconditional equivalence' },
            { expr: '\u00AC (P \u2227 Q)', desc: 'NAND gate' },
            { expr: '\u00AC (P \u2228 Q)', desc: 'NOR gate' },
            { expr: 'P \u2227 (\u00AC P)', desc: 'Contradiction' },
            { expr: 'P \u2228 (\u00AC P)', desc: 'Tautology' }
          ];



          var activeCh = aiProof || PROOF_CHALLENGES[currentChallenge] || PROOF_CHALLENGES[0];





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

                React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, "Logic Lab"),

                React.createElement("span", { className: "text-violet-200 text-sm font-bold ml-2" }, "Propositional Logic & Reasoning")

              ),

              // Mode tabs

              React.createElement("div", { className: "flex justify-center gap-2 mt-4" },

                [['truth', '\uD83D\uDCCA', 'Truth Tables'], ['proof', '\uD83E\uDDE9', 'Proof Builder'], ['challenges', '\u26A1', 'Challenges'], ['gates', '\u26A1\uFE0F', 'Logic Gates']].map(function(m) {

                  var active = mode === m[0];

                  return React.createElement("button", { "aria-label": "Switch to " + m[2] + " mode",

                    key: m[0],

                    onClick: function() { upd({ mode: m[0] }); },

                    className: "px-5 py-2.5 rounded-xl text-sm font-bold transition-all " + (active ? "text-white shadow-lg scale-105" : "text-violet-600 bg-violet-50 hover:bg-violet-100"),

                    style: active ? { background: _gViolet, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' } : {}

                  }, m[1] + " " + m[2]);

                })

              )

            ),



            // ═══ MODE 1: TRUTH TABLES ═══

            mode === 'truth' && React.createElement("div", { className: "space-y-4" },

              // Expression builder — drag-and-drop
              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83E\uDDE9"),
                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "Drag-and-Drop Expression Builder"),
                  React.createElement("span", { className: "text-xs text-violet-400 font-bold ml-auto" }, "Drag tiles or click to add")
                ),

                // Symbol palette
                React.createElement("div", { className: "mb-3 space-y-2" },
                  React.createElement("div", { className: "text-xs font-black text-violet-400 uppercase tracking-wider" }, "Variables"),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['P','Q','R','S'].map(function(v) {
                      return React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                        key: v, draggable: true,
                        onDragStart: function(e) { _drag.sym = v; e.dataTransfer.effectAllowed='copy'; },
                        onClick: function() { upd({ expression: expr + v }); },
                        className: "w-10 h-10 flex items-center justify-center font-black text-white text-base rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        style: { background: _symColor[v] }
                      }, v);
                    })
                  ),
                  React.createElement("div", { className: "text-xs font-black text-violet-400 uppercase tracking-wider" }, "Connectives"),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    ['\u2227','\u2228','\u00AC','\u2192','\u2194','\u2295'].map(function(sym) {
                      return React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                        key: sym, draggable: true,
                        onDragStart: function(e) { _drag.sym = ' '+sym+' '; e.dataTransfer.effectAllowed='copy'; },
                        onClick: function() { upd({ expression: expr+' '+sym+' ' }); },
                        className: "px-3 h-10 flex items-center justify-center font-black text-white text-sm rounded-xl cursor-grab hover:scale-110 shadow-md select-none transition-transform",
                        title: CONN[sym] ? CONN[sym].eng : sym,
                        style: { background: _symColor[sym], minWidth: '44px' }
                      }, sym + ' ' + (CONN[sym] ? CONN[sym].eng : ''));
                    }),
                    ['(',')'].map(function(v) {
                      return React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
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
                    ? React.createElement("span", { className: "text-slate-600 text-sm font-bold" }, "Drop symbols here or click above…")
                    : (function() {
                        var toks = tokenize(expr);
                        return toks.length === 0
                          ? React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800" }, expr)
                          : toks.map(function(tok, ti) {
                              return React.createElement("span", {
                                key: ti,
                                className: "inline-flex items-center justify-center px-2 py-1 rounded-lg font-black text-white text-sm shadow-sm",
                                style: { background: _symColor[tok] || '#64748b', animation: ti===toks.length-1?'logicPop 0.25s ease-out':'none' }
                              }, tok);
                            });
                      })()
                ),

                // Inline controls row
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("input", {
                    type: "text", value: expr,
                    onChange: function(e) { upd({ expression: e.target.value }); },
                    placeholder: "Or type: P \u2192 Q",
                    'aria-label': 'Logic expression input',
                    className: "flex-1 px-3 py-2 rounded-lg border border-violet-200 text-sm font-mono text-violet-800 bg-white focus:ring-2 focus:ring-violet-400 outline-none"
                  }),
                  React.createElement("button", { "aria-label": "Backspace last symbol",
                    onClick: function() { upd({ expression: expr.slice(0,-1).trimEnd() }); },
                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg text-sm"
                  }, "\u232B"),
                  React.createElement("button", { "aria-label": "Clear",
                    onClick: function() { upd({ expression: '' }); },
                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-sm"
                  }, "Clear")
                ),

                // Current expression display (kept for English toggle)
                React.createElement("div", { className: "flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-violet-200" },
                  React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800 flex-1" }, expr),

                  React.createElement("button", { "aria-label": "Toggle English and Formal notation",

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

                  React.createElement("button", { "aria-label": "Backspace last symbol",

                    onClick: function() { upd({ expression: expr.length > 0 ? expr.slice(0, -1) : '' }); },

                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg transition-all text-sm"

                  }, "\u232B"),

                  React.createElement("button", { "aria-label": "Clear",

                    onClick: function() { upd({ expression: '' }); },

                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all text-sm"

                  }, "Clear")

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
                  React.createElement("button", { "aria-label": "Claim XP",
                    onClick: function() {
                      var xp = _t2.type === 'tautology' ? 10 : 5;
                      if (typeof awardStemXP === 'function') awardStemXP('logicLab', xp, 'Found '+_t2.type);
                      if (stemCelebrate) stemCelebrate();
                      if (addToast) addToast('\uD83C\uDF1F +'+xp+' XP for the '+_t2.type+'!', 'success');
                    },
                    className: "px-4 py-2 text-xs font-black text-white rounded-xl",
                    style: { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }
                  }, '\uD83C\uDF1F Claim XP')
                );
              })(),

              // Truth table output

              (function() {

                var table = genTable(expr);

                if (!table) return React.createElement("div", { className: "p-8 text-center text-slate-600 text-sm" }, "Enter an expression above to generate a truth table");

                var typeBadge = table.type === 'tautology' ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: '\u2705 Tautology (always true)', glow: '0 0 20px rgba(16,185,129,0.3)' }

                  : table.type === 'contradiction' ? { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '\u274C Contradiction (always false)', glow: '0 0 20px rgba(239,68,68,0.3)' }

                  : { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: '\u26A0\uFE0F Contingency (sometimes true)', glow: 'none' };



                return React.createElement("div", { className: "rounded-2xl border-2 border-violet-200 overflow-hidden", style: { background: _gCard } },

                  // Badge

                  React.createElement("div", { className: "px-5 py-3 flex items-center justify-between" },

                    React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "\uD83D\uDCCA Truth Table"),

                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black border " + typeBadge.bg + " " + typeBadge.text + " " + typeBadge.border, style: { boxShadow: typeBadge.glow } }, typeBadge.label),

                    React.createElement("button", { "aria-label": "AI explain truth table expression",

                      onClick: function() {

                        if (aiExplain) { upd({ aiExplain: '' }); return; }

                        aiExplainCall('Explain the propositional logic expression: ' + expr + '. It is a ' + table.type + '. Include: (1) what it means in plain English, (2) why it is a ' + table.type + ', (3) a real-world analogy' + (userTopic ? ' using ' + userTopic : '') + '. Keep it under 4 sentences. Use simple language suitable for a student.');

                      },

                      className: "px-3 py-1 rounded-full text-xs font-bold border transition-all " + (aiExplain ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100"),

                      disabled: aiLoading

                    }, aiExplain ? "\u25B2 Hide" : "\uD83E\uDDE0 Explain")

                  ),

                  aiExplain && React.createElement("div", { className: "mx-4 mb-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-sm text-purple-800 leading-relaxed" },

                    React.createElement("span", { className: "font-bold" }, "\uD83E\uDD16 AI Explanation: "),

                    aiExplain

                  ),

                  // Table

                  React.createElement("div", { className: "overflow-x-auto px-4 pb-4" },

                    React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                      React.createElement("caption", { className: "sr-only" }, "logiclab data table"), React.createElement("thead", null,

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

                    )

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

                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "Proof Challenges"),

                  proofComplete && React.createElement("span", { className: "ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full border border-emerald-300" }, "\uD83C\uDF89 Complete!")

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

                      React.createElement("div", { className: "text-[10px] font-bold text-slate-600 mt-0.5" }, ch.title)

                    );

                  })

                ),

                // AI Proof Generator

                React.createElement("div", { className: "mt-3 flex items-center gap-2" },

                  React.createElement("button", { "aria-label": "AI-Generate Proof Challenge",

                    onClick: function() {

                      var diff = (currentChallenge || 0) + 1;

                      aiGenerate('Generate a propositional logic proof challenge' + topicClause() + '. Use ONLY variables P, Q, R, S. Use ONLY connectives: \u2192 (implies), \u2227 (and), \u2228 (or), \u00AC (not). Difficulty level: ' + diff + ' out of 5. The premises should be solvable using standard inference rules (Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism, Conjunction, Simplification). Return ONLY valid JSON: {"level":' + diff + ',"title":"<creative title>","premises":["<prop1>","<prop2>"],"conclusion":"<target>","hint":"<which rules to use>","context":"<1 sentence real-world framing>"}', 'aiProof');

                      upd({ proofSteps: [], proofComplete: false, selectedSteps: [] });

                    },

                    className: "px-4 py-2 text-xs font-bold rounded-xl transition-all",

                    style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                    disabled: aiLoading

                  }, "\uD83E\uDD16 AI-Generate Proof Challenge"),

                  aiLoading && React.createElement("span", { className: "text-xs text-violet-500 font-bold" }, "Generating..."),

                  aiProof && React.createElement("button", { "aria-label": "Clear AI",

                    onClick: function() { upd({ aiProof: null, proofSteps: [], proofComplete: false }); },

                    className: "text-xs text-red-400 hover:text-red-600 font-bold"

                  }, "\u2715 Clear AI")

                )

              ),



              // Active proof workspace

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },

                // Left: Premises + Proof

                React.createElement("div", { className: "lg:col-span-2 space-y-3" },

                  // Premises

                  React.createElement("div", { className: "p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50" },

                    React.createElement("h4", { className: "text-xs font-black text-indigo-600 uppercase tracking-wider mb-2" }, "\uD83D\uDCCB Premises (Given)"),

                    activeCh.premises.map(function(p, pi) {

                      var isSelected = (d.selectedSteps || []).indexOf('P' + pi) !== -1;

                      return React.createElement("button", { "aria-label": "Drag or click to select",
                        key: pi, draggable: true,
                        onDragStart: function(e) { _drag.proofKey = 'P'+pi; e.dataTransfer.effectAllowed='move'; },
                        onClick: function() {
                          var sel = (d.selectedSteps || []).slice();
                          var idx = sel.indexOf('P'+pi);
                          if (idx !== -1) sel.splice(idx, 1); else sel.push('P'+pi);
                          upd({ selectedSteps: sel });
                        },
                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-indigo-200 ring-2 ring-indigo-500 shadow-md" : "bg-white hover:bg-indigo-100 border border-indigo-200"),
                        title: "Drag or click to select"
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

                    activeCh.context && React.createElement("div", { className: "mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200 text-[10px] text-purple-700 italic flex items-center gap-1" },

                      React.createElement("span", null, "\uD83E\uDD16"),

                      activeCh.context

                    )

                  ),



                  // Proof Steps

                  proofSteps.length > 0 && React.createElement("div", { className: "p-4 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                    React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-2" }, "\uD83D\uDD17 Derivation"),

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

                      React.createElement("button", { "aria-label": "Undo",

                        onClick: function() {

                          var newSteps = proofSteps.slice(0, -1);

                          upd({ proofSteps: newSteps, proofComplete: false });

                        },

                        className: "px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all",

                        disabled: proofSteps.length === 0

                      }, "\u21A9 Undo"),

                      React.createElement("button", { "aria-label": "Reset proof steps",

                        onClick: function() { upd({ proofSteps: [], proofComplete: false, selectedSteps: [] }); },

                        className: "px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"

                      }, "\uD83D\uDD04 Reset")

                    )

                  ),



                  // Hint

                  React.createElement("button", { "aria-label": "Toggle proof hint",

                    onClick: function() { upd({ showHint: !d.showHint }); },

                    className: "text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"

                  }, d.showHint ? "\uD83D\uDCA1 " + activeCh.hint : "\uD83D\uDCA1 Show Hint")

                ),



                // Right: Rules panel

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-1" }, "\uD83D\uDCDA Inference Rules"),

                  RULES.map(function(rule) {

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

                          upd({ proofSteps: newSteps, selectedSteps: [], proofComplete: done });

                          if (done) {
                            var _xp = 5 + (activeCh.level || 1) * 3;
                            if (stemCelebrate) stemCelebrate();
                            if (stemBeep) stemBeep(880, 200);
                            if (typeof awardStemXP === 'function') awardStemXP('logicLab', _xp, 'Proof completed');
                            if (addToast) addToast('\uD83C\uDF89 Proof complete! +' + _xp + ' XP', 'success');
                            upd({ score: score + _xp });
                          }

                        } else {

                          if (addToast) addToast('\u274C That rule doesn\'t apply to the selected statements.', 'warning');

                        }

                      },

                      className: "w-full p-3 rounded-xl text-left transition-all bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400 hover:shadow-sm"

                    },

                      React.createElement("div", { className: "font-bold text-violet-800 text-xs" }, rule.name),

                      React.createElement("div", { className: "text-[10px] font-mono text-slate-600 mt-0.5" }, rule.form),

                      React.createElement("div", { className: "text-[10px] text-slate-600 mt-0.5 italic" }, rule.eng)

                    );

                  })

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
                React.createElement("button", { "aria-label": "Reset challenge score", onClick: function(){upd({score:0,streak:0,bestStreak:0});}, className: "ml-auto text-[10px] text-slate-600 hover:text-red-400 font-bold" }, "Reset")
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

                  placeholder: "Your interests (basketball, cooking, video games...)",

                  'aria-label': 'Your interests for AI personalization',

                  className: "flex-1 px-3 py-1.5 rounded-lg border border-violet-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"

                }),

                userTopic && React.createElement("span", { className: "text-[10px] font-bold text-violet-500" }, "AI will personalize \u2728")

              ),

              // AI loading indicator

              aiLoading && React.createElement("div", { className: "flex items-center justify-center gap-2 p-3 bg-violet-100 rounded-xl border border-violet-200" },

                React.createElement("div", { className: "animate-spin w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full" }),

                React.createElement("span", { className: "text-xs font-bold text-violet-600" }, "Generating with AI...")

              ),



              // Fallacy Spotter

              challengeMode === 'fallacy' && (function() {

                var f = FALLACIES[challengeIdx % FALLACIES.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD0D"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Is this argument valid?"),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, (challengeIdx + 1) + " / " + FALLACIES.length)

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + f.arg + '"'

                  ),

                  // Answer buttons

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Valid",
                      onClick: function() {
                        var correct = f.valid === true;
                        var ns = correct ? streak + 1 : 0; var nb = Math.max(bestStreak, ns);
                        upd({ challengeAnswer: correct ? 'correct' : 'wrong', streak: ns, bestStreak: nb, score: correct ? score + 10 + (ns > 2 ? ns : 0) : score, animTick: animTick + 1 });
                        if (correct) { if (stemBeep) stemBeep(660, 100); if (typeof awardStemXP==='function') awardStemXP('logicLab', 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 120); }
                      },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all hover:shadow-md text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", { "aria-label": "Invalid (Fallacy)",
                      onClick: function() {
                        var correct = f.valid === false;
                        var ns = correct ? streak + 1 : 0; var nb = Math.max(bestStreak, ns);
                        upd({ challengeAnswer: correct ? 'correct' : 'wrong', streak: ns, bestStreak: nb, score: correct ? score + 10 + (ns > 2 ? ns : 0) : score, animTick: animTick + 1 });
                        if (correct) { if (stemBeep) stemBeep(660, 100); if (typeof awardStemXP==='function') awardStemXP('logicLab', 3, 'Fallacy spotted'); if (stemCelebrate && ns >= 5) stemCelebrate(); }
                        else { if (stemBeep) stemBeep(220, 120); }
                      },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all hover:shadow-md text-sm"

                    }, "\u274C Invalid (Fallacy)")

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

                      React.createElement("button", { "aria-label": "Next",

                        onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiFallacy: null }); },

                        className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                      }, "Next \u2192"),

                      React.createElement("button", { "aria-label": "AI Generate",

                        onClick: function() {

                          aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                          upd({ challengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading

                      }, "\uD83E\uDD16 AI Generate")

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

                    React.createElement("h3", { className: "font-black text-purple-900" }, "AI-Generated: Is this argument valid?"),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded-full border border-purple-200" }, "\u2728 AI")

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + af.arg + '"'

                  ),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Valid",

                      onClick: function() { var c = af.valid === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", { "aria-label": "Invalid (Fallacy)",

                      onClick: function() { var c = af.valid === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm"

                    }, "\u274C Invalid (Fallacy)")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, af.name + " \u2014 " + af.formal),

                    React.createElement("div", { className: "text-xs text-slate-600" }, af.explain),

                    React.createElement("button", { "aria-label": "Generate Another",

                      onClick: function() {

                        aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                        upd({ challengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading

                    }, "\uD83E\uDD16 Generate Another")

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

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Fill the Result Column"),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, ch.desc)

                  ),

                  React.createElement("code", { className: "block text-center text-lg font-mono font-bold text-violet-800 mb-4 p-2 bg-white rounded-lg" }, ch.expr),

                  React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                    React.createElement("caption", { className: "sr-only" }, "Fill the Result Column"), React.createElement("thead", null,

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

                    React.createElement("button", { "aria-label": "Next Challenge",

                      onClick: function() { upd({ challengeIdx: challengeIdx + 1, qfAnswers: {} }); },

                      className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                    }, "Next Challenge \u2192")

                  )

                );

              })(),



              // Detective / Real-world reasoning

              challengeMode === 'detective' && (function() {

                var DETECTIVE = [

                  { scenario: 'Detective Jones has three clues:\n1. If the butler did it, the window is broken.\n2. If the maid did it, there are footprints in the garden.\n3. The window is NOT broken.', question: 'Can we conclude the butler is innocent?', answer: true, rule: 'Modus Tollens', explain: 'Clue 1: Butler \u2192 Broken window. Clue 3: \u00ACBroken window. By Modus Tollens: \u00ACButler.' },

                  { scenario: 'At the science fair:\n1. If the volcano project wins, it gets a trophy.\n2. If it gets a trophy, it goes in the display case.\n3. The volcano project wins!', question: 'Will it go in the display case?', answer: true, rule: 'Hypothetical Syllogism + MP', explain: 'Chain: Wins \u2192 Trophy \u2192 Display case. Wins is true. By HS: Wins \u2192 Display case. By MP: Display case.' },

                  { scenario: 'Lunch options:\n1. We are having pizza OR pasta.\n2. The pizza oven is broken (no pizza).', question: 'Are we having pasta?', answer: true, rule: 'Disjunctive Syllogism', explain: 'Pizza\u2228Pasta, \u00ACPizza. By DS: Pasta. \u2714' },
                  { scenario: 'Animal mystery:\n1. If the creature has wings, it can fly.\n2. If it can fly, we would see it in the sky.\n3. We did NOT see anything in the sky.', question: 'Can we conclude the creature has no wings?', answer: true, rule: 'HS + Modus Tollens', explain: 'Wings\u2192Fly\u2192Sky. HS: Wings\u2192Sky. MT with \u00ACSky: \u00ACWings. \u2714' },
                  { scenario: 'Treasure hunt:\n1. Gold is in Cave A or Cave B.\n2. Explorers searched Cave A \u2014 no gold there.', question: 'Is the gold in Cave B?', answer: true, rule: 'Disjunctive Syllogism', explain: 'A\u2228B, \u00ACA. By DS: B. \u2714' },
                  { scenario: 'Weather:\n1. If dark clouds, it will rain.\n2. If it rains, the picnic is cancelled.\n3. The picnic was NOT cancelled.', question: 'Can we conclude no dark clouds?', answer: true, rule: 'HS + Modus Tollens', explain: 'Clouds\u2192Rain\u2192Cancel. HS: Clouds\u2192Cancel. MT with \u00ACCancel: \u00ACClouds. \u2714' }
                ];

                var det = DETECTIVE[challengeIdx % DETECTIVE.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Real-World Reasoning")

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, det.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + det.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = det.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = det.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { "aria-label": "Can't tell", onClick: function() { var c = 'wrong'; upd({ challengeAnswer: c }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + det.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, det.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": "Next", onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiDetective: null }); }, className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all" }, "Next \u2192"),

                      React.createElement("button", { "aria-label": "AI Mystery",

                        onClick: function() {

                          aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                          upd({ challengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading

                      }, "\uD83D\uDD75\uFE0F AI Mystery")

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

                    React.createElement("h3", { className: "font-black text-purple-900" }, "AI Mystery"),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded-full border border-purple-200" }, "\u2728 AI")

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, ad.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + ad.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { "aria-label": "Yes", onClick: function() { var c = ad.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { "aria-label": "No", onClick: function() { var c = ad.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { "aria-label": "Can't tell", onClick: function() { upd({ challengeAnswer: 'wrong' }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + ad.rule),

                    React.createElement("div", { className: "text-xs text-slate-600" }, ad.explain),

                    React.createElement("button", { "aria-label": "Generate Another",

                      onClick: function() {

                        aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                        upd({ challengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading

                    }, "\uD83D\uDD75\uFE0F Generate Another")

                  )

                );

              })()

            ),



            // ═══ MODE 4: LOGIC GATES ═══
            mode === 'gates' && React.createElement("div", { className: "space-y-4" },
              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)' } },
                React.createElement("div", { className: "flex items-center gap-2 mb-4" },
                  React.createElement("span", { style: { fontSize: '20px' } }, "\u26A1\uFE0F"),
                  React.createElement("h3", { className: "font-black text-violet-900" }, "Logic Gate Simulator"),
                  React.createElement("span", { className: "text-xs text-violet-400 font-bold" }, "Toggle inputs to see the output live")
                ),
                // Gate selector
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                  GATE_TYPES.map(function(gt) {
                    return React.createElement("button", { "aria-label": "Select logic gate: " + gt, key: gt, onClick: function(){upd({gateType:gt});if(stemBeep)stemBeep(440,50);},
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
                            if (stemBeep) stemBeep(val?330:523, 60);
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
                    React.createElement("rect", { x:"35",y:"15",width:"55",height:"50",rx:"8",fill:"#7c3aed",stroke:"#5b21b6",strokeWidth:"2" }),
                    React.createElement("text", { x:"62",y:"46",textAnchor:"middle",fill:"white",fontWeight:"900",fontSize:"12" }, gateType),
                    React.createElement("line", { x1:"90",y1:"40",x2:"120",y2:"40",stroke:gateOutput?"#059669":"#dc2626",strokeWidth:"3" }),
                    React.createElement("circle", { cx:"115",cy:"40",r:"5",fill:gateOutput?"#059669":"#dc2626" })
                  ),
                  // Output
                  React.createElement("div", { className: "flex flex-col items-center gap-1" },
                    React.createElement("div", {
                      key: 'gate-'+animTick,
                      className: "w-20 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg",
                      style: { background:gateOutput?'linear-gradient(135deg,#059669,#10b981)':'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow:gateOutput?'0 8px 24px rgba(16,185,129,0.4)':'0 8px 24px rgba(239,68,68,0.3)', animation:'logicPop 0.2s ease-out' }
                    }, gateOutput?"1":"0"),
                    React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "Output"),
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
                      React.createElement("button", { "aria-label": "Open in Truth Tables",
                        onClick: function() {
                          var fml = gateType==='AND'?'P \u2227 Q':gateType==='OR'?'P \u2228 Q':gateType==='NOT'?'\u00AC P':gateType==='NAND'?'\u00AC (P \u2227 Q)':gateType==='NOR'?'\u00AC (P \u2228 Q)':gateType==='XOR'?'P \u2295 Q':'\u00AC (P \u2295 Q)';
                          upd({ mode:'truth', expression: fml });
                          if (addToast) addToast('Opened in Truth Table builder!','info');
                        },
                        className: "ml-auto px-3 py-1 bg-violet-200 hover:bg-violet-300 text-violet-700 font-bold rounded-full text-[10px]"
                      }, "\uD83D\uDCCA Open in Truth Tables \u2192")
                    )
                  );
                })()
              )
            ),

            // ═══ EDUCATIONAL PANEL ═══

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", { "aria-label": "Toggle educational panel: What is Propositional Logic",

                onClick: function() { upd({ showEdu: !showEdu }); if (!showEdu && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'First logic session'); },

                className: "w-full p-4 rounded-2xl border-2 border-violet-200 text-left transition-all hover:shadow-md flex items-center gap-3",

                style: { background: showEdu ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : 'white' }

              },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDCD6"),

                React.createElement("span", { className: "font-black text-violet-900 text-sm flex-1" }, "Learn: What is Propositional Logic?"),

                React.createElement("span", { className: "text-violet-400 font-bold text-xs" }, showEdu ? "\u25B2 Hide" : "\u25BC Show")

              ),

              showEdu && React.createElement("div", { className: "mt-2 p-5 rounded-2xl border border-violet-200 space-y-4 text-sm text-slate-700 leading-relaxed", style: { background: _gCard } },

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "What is Propositional Logic?"),

                  React.createElement("p", null, "Propositional logic studies how the truth of complex statements depends on simpler ones. A ", React.createElement("strong", null, "proposition"), " is any statement that is either true or false \u2014 like \"It is raining\" or \"2 + 2 = 4\".")

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "Connective Symbols"),

                  React.createElement("table", { className: "w-full text-xs" },

                    React.createElement("caption", { className: "sr-only" }, "Connective Symbols"), React.createElement("tbody", null,

                      [['∧','AND','Both must be true'],['∨','OR','At least one true'],['¬','NOT','Flips truth value'],['→','IF...THEN','False only when P true, Q false'],['↔','IFF','True when both same'],['⊕','XOR','True when exactly one true']].map(function(r) {

                        return React.createElement("tr", { key: r[0], className: "border-b border-violet-100" },

                          React.createElement("td", { className: "py-1.5 font-mono font-bold text-violet-700 w-10 text-center" }, r[0]),

                          React.createElement("td", { className: "py-1.5 font-bold text-violet-600 w-24" }, r[1]),

                          React.createElement("td", { className: "py-1.5 text-slate-500" }, r[2])

                        );

                      })

                    )

                  )

                ),

                React.createElement("div", null,
                  React.createElement("h4", { className: "font-black text-violet-800 mb-2" }, "Key Logical Laws"),
                  React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2" },
                    [
                      ["De Morgan's 1","\u00AC(P\u2227Q) \u2261 \u00ACP\u2228\u00ACQ"],
                      ["De Morgan's 2","\u00AC(P\u2228Q) \u2261 \u00ACP\u2227\u00ACQ"],
                      ["Double Negation","\u00AC\u00ACP \u2261 P"],
                      ["Contrapositive","P\u2192Q \u2261 \u00ACQ\u2192\u00ACP"],
                      ["Distributive","P\u2227(Q\u2228R) \u2261 (P\u2227Q)\u2228(P\u2227R)"],
                      ["Commutative","P\u2227Q \u2261 Q\u2227P"]
                    ].map(function(law) {
                      return React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                        key: law[0],
                        className: "flex items-center gap-2 p-2 bg-white rounded-lg border border-violet-100 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all",
                        onClick: function() { upd({ expression: law[1].split(' \u2261 ')[0].trim(), mode: 'truth' }); if(addToast) addToast('Loaded in Truth Tables!','info'); }
                      },
                        React.createElement("span", { className: "text-[10px] font-black text-violet-500 w-28 shrink-0" }, law[0]),
                        React.createElement("code", { className: "font-mono text-xs text-violet-800 font-bold" }, law[1]),
                        React.createElement("span", { className: "ml-auto text-violet-300 text-[10px]" }, "\u2192")
                      );
                    })
                  )
                ),

                React.createElement("div", null,
                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "Valid vs Invalid Arguments"),

                  React.createElement("p", null, "A ", React.createElement("strong", null, "valid"), " argument guarantees the conclusion IF the premises are true. An ", React.createElement("strong", null, "invalid"), " argument (fallacy) has a logical gap \u2014 even if the premises are true, the conclusion doesn't necessarily follow."),

                  React.createElement("p", { className: "mt-1 text-violet-600 font-bold" }, "Common fallacies: Affirming the Consequent (P\u2192Q, Q \u2234 P\u2717), Denying the Antecedent (P\u2192Q, \u00ACP \u2234 \u00ACQ\u2717)")

                )

              )

            ),



            // ═══ BACK BUTTON ═══

            React.createElement("div", { className: "mt-6 text-center" },

              React.createElement("button", { "aria-label": "Back to Tools",

                onClick: function() { setStemLabTool(null); },

                className: "px-6 py-2.5 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-all"

              }, "\u2190 Back to Tools")

            )

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_logiclab.js loaded');
})();