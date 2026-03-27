// ═══════════════════════════════════════════
// stem_tool_math.js — STEM Lab Math Tools
// 13 registered tools
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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

(function() {
  'use strict';

  // ═══ 🔬 geometryProver (geometryProver) ═══
  window.StemLab.registerTool('geometryProver', {
    icon: '🔬',
    label: 'geometryProver',
    desc: '',
    color: 'slate',
    category: 'math',
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
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore || function() {};

      // ── Tool body (geometryProver) ──
      return (function() {
// ── Geometry Prover state via labToolData ──

            const gp = (labToolData && labToolData.geometryProver) || {};

            const gpUpd = (key, val) => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver || {}), [key]: val } }));

            const gpMode = gp.mode || 'freeform'; // freeform | triangle | parallel | bisector

            const gpPoints = gp.points || [];

            const gpSegments = gp.segments || [];

            const gpDragging = gp.dragging; // index of point being dragged

            const gpConnecting = gp.connecting; // index of first point in segment draw

            const gpChallenge = gp.challenge || null;

            const gpFeedback = gp.feedback || null;

            const gpShowLabels = gp.showLabels !== false;

            const gpHoverIdx = gp.hoverIdx != null ? gp.hoverIdx : -1;



            // ── Math helpers ──

            const dist = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

            const angleBetween = (p1, vertex, p2) => {

              const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);

              const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

              let deg = (a1 - a2) * 180 / Math.PI;

              if (deg < 0) deg += 360;

              if (deg > 180) deg = 360 - deg;

              return Math.round(deg * 10) / 10;

            };

            const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

            const labelFor = i => String.fromCharCode(65 + (i % 26));



            // ── SVG constants ──

            const W = 500, H = 420;

            const gridStep = 25;



            // ── Find all angles at each vertex ──

            const findAnglesAtVertex = (vIdx) => {

              const v = gpPoints[vIdx];

              if (!v) return [];

              const connected = gpSegments

                .filter(s => s.from === vIdx || s.to === vIdx)

                .map(s => s.from === vIdx ? s.to : s.from)

                .filter((idx, i, arr) => arr.indexOf(idx) === i);

              if (connected.length < 2) return [];

              const angles = [];

              for (let i = 0; i < connected.length; i++) {

                for (let j = i + 1; j < connected.length; j++) {

                  const a = angleBetween(gpPoints[connected[i]], v, gpPoints[connected[j]]);

                  angles.push({ p1: connected[i], vertex: vIdx, p2: connected[j], angle: a });

                }

              }

              return angles;

            };



            // ── Collect all angles ──

            const allAngles = [];

            for (let vi = 0; vi < gpPoints.length; vi++) {

              findAnglesAtVertex(vi).forEach(a => allAngles.push(a));

            }



            // ── Detect theorems ──

            const theorems = [];

            // Triangle angle sum

            if (gpPoints.length >= 3 && gpSegments.length >= 3) {

              // Find 3-cycles (triangles)

              for (let i = 0; i < gpPoints.length; i++) {

                for (let j = i + 1; j < gpPoints.length; j++) {

                  for (let k = j + 1; k < gpPoints.length; k++) {

                    const hasIJ = gpSegments.some(s => (s.from === i && s.to === j) || (s.from === j && s.to === i));

                    const hasJK = gpSegments.some(s => (s.from === j && s.to === k) || (s.from === k && s.to === j));

                    const hasIK = gpSegments.some(s => (s.from === i && s.to === k) || (s.from === k && s.to === i));

                    if (hasIJ && hasJK && hasIK) {

                      const a1 = angleBetween(gpPoints[j], gpPoints[i], gpPoints[k]);

                      const a2 = angleBetween(gpPoints[i], gpPoints[j], gpPoints[k]);

                      const a3 = angleBetween(gpPoints[i], gpPoints[k], gpPoints[j]);

                      const sum = a1 + a2 + a3;

                      theorems.push({

                        type: 'triangle_sum',

                        label: '\u25B3 Triangle Angle Sum',

                        desc: '\u2220' + labelFor(i) + ' + \u2220' + labelFor(j) + ' + \u2220' + labelFor(k) + ' = ' + sum.toFixed(1) + '\u00B0',

                        valid: Math.abs(sum - 180) < 2,

                        icon: '\u25B3',

                        detail: a1.toFixed(1) + '\u00B0 + ' + a2.toFixed(1) + '\u00B0 + ' + a3.toFixed(1) + '\u00B0 = ' + sum.toFixed(1) + '\u00B0'

                      });

                      // Isosceles check

                      const d1 = dist(gpPoints[i], gpPoints[j]);

                      const d2 = dist(gpPoints[j], gpPoints[k]);

                      const d3 = dist(gpPoints[i], gpPoints[k]);

                      const tol = 5;

                      if (Math.abs(d1 - d2) < tol || Math.abs(d2 - d3) < tol || Math.abs(d1 - d3) < tol) {

                        let eqSides = '', eqAngles = '';

                        if (Math.abs(d1 - d2) < tol) { eqSides = labelFor(i)+labelFor(j) + ' \u2248 ' + labelFor(j)+labelFor(k); eqAngles = '\u2220' + labelFor(k) + ' \u2248 \u2220' + labelFor(i); }

                        else if (Math.abs(d2 - d3) < tol) { eqSides = labelFor(j)+labelFor(k) + ' \u2248 ' + labelFor(i)+labelFor(k); eqAngles = '\u2220' + labelFor(i) + ' \u2248 \u2220' + labelFor(j); }

                        else { eqSides = labelFor(i)+labelFor(j) + ' \u2248 ' + labelFor(i)+labelFor(k); eqAngles = '\u2220' + labelFor(j) + ' \u2248 \u2220' + labelFor(k); }

                        theorems.push({

                          type: 'isosceles',

                          label: '\u25B3 Isosceles Triangle',

                          desc: eqSides + ' \u2192 ' + eqAngles,

                          valid: true,

                          icon: '\u25B2',

                          detail: 'If two sides are equal, their opposite angles are equal.'

                        });

                      }

                    }

                  }

                }

              }

            }

            // Supplementary angles (two angles sharing vertex on a line summing to ~180)

            allAngles.forEach(a => {

              if (Math.abs(a.angle - 180) < 3) {

                theorems.push({

                  type: 'straight',

                  label: '\u2500 Straight Angle',

                  desc: '\u2220' + labelFor(a.p1) + labelFor(a.vertex) + labelFor(a.p2) + ' = ' + a.angle.toFixed(1) + '\u00B0',

                  valid: true,

                  icon: '\u2500',

                  detail: 'Points are collinear \u2014 angle = 180\u00B0'

                });

              }

            });

            // Vertical angles

            if (gpSegments.length >= 2) {

              for (let si = 0; si < gpSegments.length; si++) {

                for (let sj = si + 1; sj < gpSegments.length; sj++) {

                  const s1 = gpSegments[si], s2 = gpSegments[sj];

                  // Check if they share a vertex

                  let shared = -1;

                  if (s1.from === s2.from || s1.from === s2.to) shared = s1.from;

                  else if (s1.to === s2.from || s1.to === s2.to) shared = s1.to;

                  if (shared >= 0) {

                    const ends1 = s1.from === shared ? s1.to : s1.from;

                    const ends2 = s2.from === shared ? s2.to : s2.from;

                    const ang = angleBetween(gpPoints[ends1], gpPoints[shared], gpPoints[ends2]);

                    const suppAng = 180 - ang;

                    if (ang > 5 && ang < 175) {

                      theorems.push({

                        type: 'vertical',

                        label: '\u2716 Vertical Angles',

                        desc: '\u2220' + labelFor(ends1) + labelFor(shared) + labelFor(ends2) + ' = ' + ang.toFixed(1) + '\u00B0, supplement = ' + suppAng.toFixed(1) + '\u00B0',

                        valid: true,

                        icon: '\u2716',

                        detail: 'Vertical angles are congruent; adjacent angles are supplementary.'

                      });

                    }

                  }

                }

              }

            }



            // ── Mode presets ──

            const loadTriangle = () => {

              const pts = [

                { x: 150, y: 340 },

                { x: 350, y: 340 },

                { x: 250, y: 120 }

              ];

              const segs = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'triangle');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            const loadParallel = () => {

              // Two horizontal parallel lines with a transversal

              const pts = [

                { x: 80, y: 140 },   // A - top-left

                { x: 420, y: 140 },   // B - top-right

                { x: 80, y: 320 },    // C - bottom-left

                { x: 420, y: 320 },   // D - bottom-right

                { x: 190, y: 50 },    // E - transversal top

                { x: 310, y: 410 }    // F - transversal bottom

              ];

              const segs = [

                { from: 0, to: 1 }, // top parallel

                { from: 2, to: 3 }, // bottom parallel

                { from: 4, to: 5 }  // transversal

              ];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'parallel');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            const loadBisector = () => {

              const pts = [

                { x: 250, y: 350 },  // vertex

                { x: 400, y: 200 },  // ray 1

                { x: 100, y: 200 },  // ray 2

                { x: 250, y: 120 }   // bisector point

              ];

              const segs = [

                { from: 0, to: 1 },

                { from: 0, to: 2 },

                { from: 0, to: 3 }

              ];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'bisector');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            // ── Challenge system ──

            const generateChallenge = () => {

              const types = ['triangle_sum', 'vertical', 'missing_angle'];

              const type = types[Math.floor(Math.random() * types.length)];

              if (type === 'triangle_sum') {

                loadTriangle();

                gpUpd('challenge', { type: 'triangle_sum', question: 'What do the three angles of this triangle sum to?', answer: '180' });

              } else if (type === 'vertical') {

                const a1 = 30 + Math.floor(Math.random() * 120);

                gpUpd('points', [

                  { x: 250, y: 210 },

                  { x: 250 + 150 * Math.cos(a1 * Math.PI / 180), y: 210 - 150 * Math.sin(a1 * Math.PI / 180) },

                  { x: 250 - 150 * Math.cos(a1 * Math.PI / 180), y: 210 + 150 * Math.sin(a1 * Math.PI / 180) },

                  { x: 400, y: 210 },

                  { x: 100, y: 210 }

                ]);

                gpUpd('segments', [{ from: 1, to: 2 }, { from: 3, to: 4 }]);

                gpUpd('mode', 'freeform');

                gpUpd('challenge', { type: 'vertical', question: 'If one angle is ' + a1 + '\u00B0, what is the vertical angle?', answer: String(a1) });

              } else {

                const a1 = 30 + Math.floor(Math.random() * 50);

                const a2 = 40 + Math.floor(Math.random() * 60);

                const a3 = 180 - a1 - a2;

                loadTriangle();

                gpUpd('challenge', { type: 'missing_angle', question: 'If two angles are ' + a1 + '\u00B0 and ' + a2 + '\u00B0, what is the third?', answer: String(a3), a1: a1, a2: a2 });

              }

              gpUpd('feedback', null);

            };



            const checkChallenge = () => {

              if (!gpChallenge) return;

              const userAns = (gp.challengeAnswer || '').trim();

              const ok = userAns === gpChallenge.answer || Math.abs(parseFloat(userAns) - parseFloat(gpChallenge.answer)) < 1;

              gpUpd('feedback', {

                correct: ok,

                msg: ok ? '\u2705 Correct! ' + gpChallenge.answer + '\u00B0' : '\u274C The answer is ' + gpChallenge.answer + '\u00B0'

              });

              setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));

              if (ok && typeof awardStemXP === 'function') awardStemXP('geometryProver', 5, gpChallenge.type + ' proof');

            };



            // ── Guided Proof Templates ──

            const GUIDED_PROOFS = [

              {

                id: 'tri_angle_sum', title: '△ Triangle Angle Sum Theorem',

                setup: 'triangle',

                theorem: 'The sum of the interior angles of any triangle equals 180°.',

                steps: [

                  { statement: 'Let △ABC be any triangle.', reason: 'Given', options: ['Given', 'Definition', 'Postulate'] },

                  { statement: 'Draw line ℓ through A parallel to BC.', reason: 'Parallel Postulate', options: ['Parallel Postulate', 'Given', 'Angle Addition'] },

                  { statement: '∠DAB ≅ ∠ABC (alternate interior angles).', reason: 'Alternate Interior Angles', options: ['Alternate Interior Angles', 'Corresponding Angles', 'Vertical Angles'] },

                  { statement: '∠EAC ≅ ∠ACB (alternate interior angles).', reason: 'Alternate Interior Angles', options: ['Alternate Interior Angles', 'Supplementary Angles', 'Vertical Angles'] },

                  { statement: '∠DAB + ∠BAC + ∠EAC = 180° (straight line).', reason: 'Linear Pair / Straight Angle', options: ['Linear Pair / Straight Angle', 'Triangle Inequality', 'Angle Addition'] },

                  { statement: '∴ ∠ABC + ∠BAC + ∠ACB = 180°.', reason: 'Substitution', options: ['Substitution', 'Reflexive Property', 'Transitive Property'] }

                ]

              },

              {

                id: 'vertical_angles', title: '✖ Vertical Angles Theorem',

                setup: 'vertical',

                theorem: 'Vertical angles formed by two intersecting lines are congruent.',

                steps: [

                  { statement: 'Lines AB and CD intersect at point O.', reason: 'Given', options: ['Given', 'Construction', 'Postulate'] },

                  { statement: '∠AOC + ∠COB = 180° (linear pair).', reason: 'Linear Pair / Straight Angle', options: ['Linear Pair / Straight Angle', 'Vertical Angles', 'Angle Addition'] },

                  { statement: '∠COB + ∠BOD = 180° (linear pair).', reason: 'Linear Pair / Straight Angle', options: ['Linear Pair / Straight Angle', 'Corresponding Angles', 'Supplementary Angles'] },

                  { statement: '∠AOC + ∠COB = ∠COB + ∠BOD.', reason: 'Transitive Property', options: ['Transitive Property', 'Reflexive Property', 'Substitution'] },

                  { statement: '∴ ∠AOC ≅ ∠BOD.', reason: 'Subtraction Property', options: ['Subtraction Property', 'Addition Property', 'Substitution'] }

                ]

              },

              {

                id: 'isosceles', title: '△ Isosceles Triangle Theorem',

                setup: 'triangle',

                theorem: 'If two sides of a triangle are equal, their opposite angles are equal.',

                steps: [

                  { statement: 'In △ABC, let AB = AC.', reason: 'Given', options: ['Given', 'Definition', 'Construction'] },

                  { statement: 'Draw AD, the bisector of ∠BAC.', reason: 'Angle Bisector Construction', options: ['Angle Bisector Construction', 'Perpendicular Bisector', 'Given'] },

                  { statement: '∠BAD ≅ ∠CAD.', reason: 'Definition of Bisector', options: ['Definition of Bisector', 'Alternate Interior Angles', 'Given'] },

                  { statement: 'AD ≅ AD.', reason: 'Reflexive Property', options: ['Reflexive Property', 'Symmetric Property', 'Transitive Property'] },

                  { statement: '△ABD ≅ △ACD (by SAS).', reason: 'SAS Congruence', options: ['SAS Congruence', 'SSS Congruence', 'ASA Congruence'] },

                  { statement: '∴ ∠ABC ≅ ∠ACB (CPCTC).', reason: 'CPCTC', options: ['CPCTC', 'Substitution', 'Definition'] }

                ]

              }

            ];



            const gpGuided = gp.guided || null; // { proofId, answers: {}, completed: false }

            const loadGuidedProof = (proofId) => {

              const proof = GUIDED_PROOFS.find(p => p.id === proofId);

              if (!proof) return;

              // Load the geometric construction

              if (proof.setup === 'triangle') loadTriangle();

              else if (proof.setup === 'vertical') {

                gpUpd('points', [{ x: 250, y: 210 }, { x: 370, y: 130 }, { x: 130, y: 290 }, { x: 400, y: 210 }, { x: 100, y: 210 }]);

                gpUpd('segments', [{ from: 1, to: 2 }, { from: 3, to: 4 }]);

              }

              gpUpd('mode', 'guided');

              gpUpd('guided', { proofId: proofId, answers: {}, completed: false });

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            const checkGuidedStep = (stepIdx, selectedReason) => {

              if (!gpGuided) return;

              const proof = GUIDED_PROOFS.find(p => p.id === gpGuided.proofId);

              if (!proof) return;

              const step = proof.steps[stepIdx];

              const correct = selectedReason === step.reason;

              const newAnswers = { ...gpGuided.answers, [stepIdx]: { selected: selectedReason, correct: correct } };

              const allDone = Object.keys(newAnswers).length === proof.steps.length;

              const allCorrect = allDone && Object.values(newAnswers).every(a => a.correct);

              gpUpd('guided', { ...gpGuided, answers: newAnswers, completed: allDone });

              if (correct && typeof awardStemXP === 'function') awardStemXP('geometryProver', 3, proof.id + ' step');

              if (allCorrect) {

                addToast('🎉 Proof complete! +15 XP', 'success');

                if (typeof awardStemXP === 'function') awardStemXP('geometryProver', 15, proof.id + ' proof complete');

                setExploreScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));

              }

            };



            // ── Mouse handlers ──

            const handleCanvasMouseDown = (e) => {

              const rect = e.currentTarget.getBoundingClientRect();

              const mx = e.clientX - rect.left;

              const my = e.clientY - rect.top;



              // Check if clicking on an existing point

              for (let i = 0; i < gpPoints.length; i++) {

                if (dist({ x: mx, y: my }, gpPoints[i]) < 12) {

                  if (gpConnecting !== null && gpConnecting !== undefined && gpConnecting !== i) {

                    // Complete segment

                    const newSegs = [...gpSegments, { from: gpConnecting, to: i }];

                    gpUpd('segments', newSegs);

                    gpUpd('connecting', null);

                    return;

                  }

                  // Start drag

                  gpUpd('dragging', i);

                  return;

                }

              }

              // Place new point

              const newPt = { x: Math.round(mx / gridStep) * gridStep, y: Math.round(my / gridStep) * gridStep };

              const newPts = [...gpPoints, newPt];

              gpUpd('points', newPts);

              // If connecting, complete segment to new point

              if (gpConnecting !== null && gpConnecting !== undefined) {

                const newSegs = [...gpSegments, { from: gpConnecting, to: newPts.length - 1 }];

                gpUpd('segments', newSegs);

                gpUpd('connecting', null);

              }

            };



            const handleCanvasMouseMove = (e) => {

              if (gpDragging === null || gpDragging === undefined) return;

              const rect = e.currentTarget.getBoundingClientRect();

              const mx = Math.max(10, Math.min(W - 10, e.clientX - rect.left));

              const my = Math.max(10, Math.min(H - 10, e.clientY - rect.top));

              const updated = gpPoints.map((p, i) => i === gpDragging ? { x: mx, y: my } : p);

              gpUpd('points', updated);

            };



            const handleCanvasMouseUp = () => {

              if (gpDragging !== null && gpDragging !== undefined) {

                gpUpd('dragging', null);

              }

            };



            // ── Contextual helper text ──

            const helperText = gpPoints.length === 0

              ? '\uD83D\uDC46 Click on the canvas to place your first point'

              : gpConnecting !== null && gpConnecting !== undefined

                ? '\u2197\uFE0F Click a point or the canvas to complete the segment from ' + labelFor(gpConnecting)

                : gpDragging !== null && gpDragging !== undefined

                  ? '\u270B Dragging point ' + labelFor(gpDragging) + ' — release to drop'

                  : gpPoints.length === 1

                    ? 'Place another point, then use \"Draw Segment\" to connect them'

                    : gpSegments.length === 0

                      ? 'Click \"Draw Segment\" or \"Connect Last Two\" to link points'

                      : theorems.length > 0

                        ? '\uD83D\uDD0D ' + theorems.length + ' theorem' + (theorems.length > 1 ? 's' : '') + ' detected — drag points to explore!'

                        : 'Drag points to explore angles \u2022 Add more points and segments to discover theorems';



            // ── Render ──

            return React.createElement("div", { className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200" },

              // ── Header ──

              React.createElement("div", { className: "flex items-center gap-3 mb-2" },

                React.createElement("button", {

                  onClick: () => setStemLabTool(null),

                  className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",

                  'aria-label': 'Back to tools'

                }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

                React.createElement("h3", { className: "text-lg font-bold text-violet-800" }, "\uD83D\uDCD0 Geometry Prover"),

                React.createElement("div", { className: "flex items-center gap-2 ml-2" },

                  React.createElement("div", { className: "text-xs font-bold text-emerald-600" }, exploreScore.correct, "/", exploreScore.total),

                  React.createElement("button", {

                    onClick: () => {

                      const snap = { id: 'snap-' + Date.now(), tool: 'geometryProver', label: 'Proof: ' + gpPoints.length + ' pts', data: { points: [...gpPoints], segments: [...gpSegments], theorems: theorems.map(t => t.label) }, timestamp: Date.now() };

                      setToolSnapshots(prev => [...prev, snap]);

                      addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                    },

                    className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"

                  }, "\uD83D\uDCF8 Snapshot")

                )

              ),



              // ── Contextual Helper Bar ──

              React.createElement("div", {

                className: "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",

                style: { background: 'linear-gradient(90deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#c4b5fd' }

              },

                React.createElement("span", { className: "text-xs" }, '\uD83E\uDDED'),

                React.createElement("span", { className: "text-xs font-semibold text-violet-700 flex-1" }, helperText),

                React.createElement("span", {

                  className: "text-[10px] font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full"

                }, gpMode.charAt(0).toUpperCase() + gpMode.slice(1) + ' mode')

              ),



              // ── Construction mode selector ──

              React.createElement("div", { className: "flex gap-1.5 flex-wrap" },

                [

                  { id: 'freeform', label: '\u270F\uFE0F Freeform', color: 'violet' },

                  { id: 'triangle', label: '\u25B3 Triangle', color: 'blue' },

                  { id: 'parallel', label: '\u2225 Parallel Lines', color: 'teal' },

                  { id: 'bisector', label: '\u2221 Bisector', color: 'amber' },

                  { id: 'guided', label: '\uD83D\uDCDD Guided Proof', color: 'emerald' }

                ].map(m => React.createElement("button", {

                  key: m.id,

                  onClick: () => {

                    if (m.id === 'triangle') loadTriangle();

                    else if (m.id === 'parallel') loadParallel();

                    else if (m.id === 'bisector') loadBisector();

                    else if (m.id === 'guided') { loadGuidedProof('tri_angle_sum'); }

                    else { gpUpd('mode', 'freeform'); gpUpd('points', []); gpUpd('segments', []); gpUpd('connecting', null); gpUpd('feedback', null); gpUpd('challenge', null); gpUpd('guided', null); }

                  },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpMode === m.id ? 'bg-' + m.color + '-600 text-white shadow-md' : 'bg-' + m.color + '-50 text-' + m.color + '-700 hover:bg-' + m.color + '-100 border border-' + m.color + '-200')

                }, m.label))

              ),



              // ── SVG Canvas ──

              React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-200 p-2 flex justify-center" },

                React.createElement("svg", {

                  width: W, height: H,

                  className: "cursor-crosshair select-none",

                  style: { background: '#faf5ff' },

                  role: 'img',

                  'aria-label': 'Geometry construction canvas — click to place points and draw segments',

                  onMouseDown: handleCanvasMouseDown,

                  onMouseMove: handleCanvasMouseMove,

                  onMouseUp: handleCanvasMouseUp,

                  onMouseLeave: function () { handleCanvasMouseUp(); gpUpd('hoverIdx', -1); }

                },

                  React.createElement('title', null, 'Geometry Prover Canvas'),

                  // Grid

                  Array.from({ length: Math.floor(W / gridStep) + 1 }).map((_, i) =>

                    React.createElement('line', { key: 'gv' + i, x1: i * gridStep, y1: 0, x2: i * gridStep, y2: H, stroke: '#ede9fe', strokeWidth: 0.5 })

                  ),

                  Array.from({ length: Math.floor(H / gridStep) + 1 }).map((_, i) =>

                    React.createElement('line', { key: 'gh' + i, x1: 0, y1: i * gridStep, x2: W, y2: i * gridStep, stroke: '#ede9fe', strokeWidth: 0.5 })

                  ),



                  // Segments

                  gpSegments.map((seg, si) => {

                    const p1 = gpPoints[seg.from], p2 = gpPoints[seg.to];

                    if (!p1 || !p2) return null;

                    const d = dist(p1, p2);

                    const mid = midpoint(p1, p2);

                    return React.createElement(React.Fragment, { key: 'seg' + si },

                      React.createElement('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#6d28d9', strokeWidth: 2.5, strokeLinecap: 'round' }),

                      gpShowLabels && React.createElement('rect', { x: mid.x - 18, y: mid.y - 9, width: 36, height: 16, rx: 4, fill: '#f5f3ff', stroke: '#c4b5fd', strokeWidth: 0.5 }),

                      gpShowLabels && React.createElement('text', { x: mid.x, y: mid.y + 4, textAnchor: 'middle', style: { fontSize: '9px', fontWeight: 'bold', fill: '#6d28d9' } }, d.toFixed(0) + 'px')

                    );

                  }),



                  // Angle arcs

                  allAngles.filter(a => a.angle > 2 && a.angle < 178).map((a, ai) => {

                    const v = gpPoints[a.vertex];

                    const p1 = gpPoints[a.p1];

                    const p2 = gpPoints[a.p2];

                    if (!v || !p1 || !p2) return null;

                    const arcR = 28;

                    const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);

                    const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);

                    // Determine sweep direction

                    let startAngle = a1, endAngle = a2;

                    let diff = endAngle - startAngle;

                    if (diff < 0) diff += 2 * Math.PI;

                    if (diff > Math.PI) { startAngle = a2; endAngle = a1; diff = 2 * Math.PI - diff; }

                    const sx = v.x + arcR * Math.cos(startAngle);

                    const sy = v.y + arcR * Math.sin(startAngle);

                    const ex = v.x + arcR * Math.cos(endAngle);

                    const ey = v.y + arcR * Math.sin(endAngle);

                    const largeArc = diff > Math.PI ? 1 : 0;

                    const midAngle = startAngle + diff / 2;

                    const labelR = arcR + 14;

                    const lx = v.x + labelR * Math.cos(midAngle);

                    const ly = v.y + labelR * Math.sin(midAngle);

                    const isRight = Math.abs(a.angle - 90) < 2;

                    return React.createElement(React.Fragment, { key: 'arc' + ai },

                      isRight ? React.createElement('rect', {

                        x: v.x + 6 * Math.cos(midAngle) - 6, y: v.y + 6 * Math.sin(midAngle) - 6,

                        width: 12, height: 12, fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5,

                        transform: 'rotate(' + (midAngle * 180 / Math.PI) + ' ' + (v.x + 6 * Math.cos(midAngle)) + ' ' + (v.y + 6 * Math.sin(midAngle)) + ')'

                      }) : React.createElement('path', {

                        d: 'M ' + sx + ' ' + sy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 1 ' + ex + ' ' + ey,

                        fill: 'hsla(270,80%,60%,0.12)', stroke: '#8b5cf6', strokeWidth: 1.5

                      }),

                      gpShowLabels && React.createElement('text', {

                        x: lx, y: ly + 3, textAnchor: 'middle',

                        style: { fontSize: '10px', fontWeight: 'bold', fill: isRight ? '#059669' : '#7c3aed' }

                      }, a.angle.toFixed(1) + '\u00B0')

                    );

                  }),



                  // Points (with hover highlighting)

                  gpPoints.map((p, i) => {

                    const isHover = gpHoverIdx === i;

                    const isDrag = gpDragging === i;

                    const isConn = gpConnecting === i;

                    const ptRadius = isDrag ? 10 : isHover ? 9 : 7;

                    const ptFill = isConn ? '#6366f1' : isDrag ? '#a78bfa' : isHover ? '#8b5cf6' : '#7c3aed';

                    return React.createElement(React.Fragment, { key: 'pt' + i },

                      // Hover glow ring

                      isHover && !isDrag && React.createElement('circle', {

                        cx: p.x, cy: p.y, r: 14,

                        fill: 'none', stroke: '#a78bfa', strokeWidth: 1.5, opacity: 0.5,

                        style: { transition: 'opacity 0.2s ease' }

                      }),

                      React.createElement('circle', {

                        cx: p.x, cy: p.y, r: ptRadius,

                        fill: ptFill,

                        stroke: '#fff', strokeWidth: 2.5,

                        className: 'cursor-grab',

                        style: { transition: 'r 0.15s ease, fill 0.15s ease' },

                        onMouseEnter: function () { gpUpd('hoverIdx', i); },

                        onMouseLeave: function () { gpUpd('hoverIdx', -1); }

                      }),

                      React.createElement('text', {

                        x: p.x + 12, y: p.y - 10,

                        style: { fontSize: isHover ? '14px' : '13px', fontWeight: 'bold', fill: '#4c1d95', transition: 'font-size 0.15s ease' }

                      }, labelFor(i))

                    );

                  }),



                  // Connecting helper line

                  gpConnecting !== null && gpConnecting !== undefined && gpPoints[gpConnecting] &&

                    React.createElement('line', {

                      x1: gpPoints[gpConnecting].x, y1: gpPoints[gpConnecting].y,

                      x2: gpPoints[gpConnecting].x + 1, y2: gpPoints[gpConnecting].y + 1,

                      stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4,3', opacity: 0.6

                    }),



                  // Empty state instruction

                  gpPoints.length === 0 && React.createElement('text', {

                    x: W / 2, y: H / 2, textAnchor: 'middle',

                    style: { fontSize: '14px', fill: '#a78bfa', fontWeight: '600' }

                  }, 'Click to place points \u2022 Use "Draw Segment" to connect')

                )

              ),



              // ── Action buttons ──

              React.createElement("div", { className: "flex gap-2 flex-wrap" },

                React.createElement("button", {

                  onClick: () => {

                    if (gpPoints.length >= 2) {

                      const lastIdx = gpPoints.length - 1;

                      // Connect last two points if no segment exists

                      if (!gpSegments.some(s => (s.from === lastIdx - 1 && s.to === lastIdx) || (s.from === lastIdx && s.to === lastIdx - 1))) {

                        gpUpd('segments', [...gpSegments, { from: lastIdx - 1, to: lastIdx }]);

                      }

                    }

                  },

                  disabled: gpPoints.length < 2,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 transition-all disabled:opacity-40"

                }, "\uD83D\uDD17 Connect Last Two"),

                React.createElement("button", {

                  onClick: () => {

                    if (gpConnecting !== null && gpConnecting !== undefined) {

                      gpUpd('connecting', null);

                    } else if (gpPoints.length > 0) {

                      gpUpd('connecting', gpPoints.length - 1);

                    }

                  },

                  disabled: gpPoints.length < 1,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpConnecting !== null && gpConnecting !== undefined ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200') + " disabled:opacity-40"

                }, gpConnecting !== null && gpConnecting !== undefined ? "\u2714 Connecting from " + labelFor(gpConnecting) : "\u2197\uFE0F Draw Segment"),

                React.createElement("button", {

                  onClick: () => gpUpd('showLabels', !gpShowLabels),

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpShowLabels ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200')

                }, gpShowLabels ? "\uD83D\uDCCF Labels ON" : "\uD83D\uDCCF Labels"),

                React.createElement("button", {

                  onClick: () => {

                    if (gpPoints.length > 0) {

                      const newPts = gpPoints.slice(0, -1);

                      const removed = gpPoints.length - 1;

                      const newSegs = gpSegments.filter(s => s.from !== removed && s.to !== removed);

                      gpUpd('points', newPts);

                      gpUpd('segments', newSegs);

                      gpUpd('connecting', null);

                    }

                  },

                  disabled: gpPoints.length < 1,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-40"

                }, "\u232B Undo Point"),

                React.createElement("button", {

                  onClick: () => { gpUpd('points', []); gpUpd('segments', []); gpUpd('connecting', null); gpUpd('feedback', null); gpUpd('challenge', null); gpUpd('challengeAnswer', ''); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"

                }, "\u21BA Clear All")

              ),



              // ── Theorem Detection Panel ──

              theorems.length > 0 && React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200" },

                React.createElement("p", { className: "text-xs font-bold text-violet-700 uppercase mb-2" }, "\uD83D\uDD0D Detected Theorems"),

                React.createElement("div", { className: "space-y-2" },

                  theorems.map((th, ti) => React.createElement("div", {

                    key: ti,

                    className: "flex items-start gap-2 bg-white rounded-lg p-2.5 border " + (th.valid ? 'border-emerald-200' : 'border-amber-200')

                  },

                    React.createElement("span", { className: "text-lg" }, th.icon),

                    React.createElement("div", { className: "flex-1" },

                      React.createElement("p", { className: "text-xs font-bold " + (th.valid ? 'text-emerald-700' : 'text-amber-700') }, th.label),

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-mono" }, th.desc),

                      React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5 italic" }, th.detail)

                    ),

                    React.createElement("span", { className: "text-xs font-bold " + (th.valid ? 'text-emerald-500' : 'text-amber-500') }, th.valid ? '\u2713 Verified' : '\u2248 Approx')

                  ))

                )

              ),



              // ── Live Measurements Stats ──

              gpPoints.length >= 2 && React.createElement("div", { className: "grid grid-cols-3 gap-3" },

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Points"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, gpPoints.length)

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Segments"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, gpSegments.length)

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Theorems"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, theorems.length)

                )

              ),



              // ── Challenge Section ──

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", {

                  onClick: generateChallenge,

                  className: "flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md"

                }, "\uD83C\uDFAF Proof Challenge"),

                React.createElement("button", {

                  onClick: () => { gpUpd('challenge', null); gpUpd('feedback', null); gpUpd('challengeAnswer', ''); },

                  disabled: !gpChallenge,

                  className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all disabled:opacity-40"

                }, "\u21BA Reset")

              ),



              // Challenge UI

              gpChallenge && React.createElement("div", { className: "bg-violet-50 rounded-lg p-3 border border-violet-200" },

                React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, "\uD83C\uDFAF ", gpChallenge.question),

                React.createElement("div", { className: "flex gap-2 items-center" },

                  React.createElement("input", {

                    type: "text",

                    value: gp.challengeAnswer || '',

                    onChange: e => gpUpd('challengeAnswer', e.target.value),

                    onKeyDown: e => { if (e.key === 'Enter') checkChallenge(); },

                    placeholder: "Your answer (\u00B0)",

                    className: "flex-1 px-3 py-2 border-2 border-violet-300 rounded-lg text-sm font-bold text-center focus:border-violet-500 outline-none"

                  }),

                  React.createElement("button", {

                    onClick: checkChallenge,

                    className: "px-4 py-2 bg-violet-500 text-white font-bold rounded-lg text-sm hover:bg-violet-600 transition-all"

                  }, "\u2714 Check")

                ),

                gpFeedback && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gpFeedback.correct ? 'text-green-600' : 'text-red-600') }, gpFeedback.msg)

              ),



              // ── Educational footer ──

              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200 text-center" },

                React.createElement("p", { className: "text-[10px] text-violet-600" }, "\uD83E\uDDED ", React.createElement("strong", null, "Euclidean Geometry"), " \u2014 drag points to explore how angles and lengths change. Watch the theorem panel to discover geometric relationships!"),

                React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Place points \u2022 Draw segments \u2022 Drag to explore \u2022 Discover theorems")

              ),



              // ── Guided Proof Panel ──

              gpMode === 'guided' && gpGuided && (function () {

                const proof = GUIDED_PROOFS.find(p => p.id === gpGuided.proofId);

                if (!proof) return null;

                const answers = gpGuided.answers || {};

                const completedCount = Object.values(answers).filter(a => a.correct).length;

                const totalSteps = proof.steps.length;

                const pct = Math.round((completedCount / totalSteps) * 100);



                return React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300 shadow-lg" },



                  // Header

                  React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                    React.createElement("div", { className: "w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg shadow" }, "\uD83D\uDCDD"),

                    React.createElement("div", { className: "flex-1" },

                      React.createElement("h4", { className: "text-sm font-bold text-emerald-800" }, proof.title),

                      React.createElement("p", { className: "text-[10px] text-emerald-600 italic" }, proof.theorem)

                    ),

                    React.createElement("div", { className: "text-xs font-bold px-2 py-1 rounded-full " + (pct === 100 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700') }, pct + '%')

                  ),



                  // Progress bar

                  React.createElement("div", { className: "w-full h-1.5 bg-emerald-200 rounded-full mb-3 overflow-hidden" },

                    React.createElement("div", { className: "h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500", style: { width: pct + '%' } })

                  ),



                  // Proof selector

                  React.createElement("div", { className: "flex gap-1.5 mb-3 flex-wrap" },

                    GUIDED_PROOFS.map(p => React.createElement("button", {

                      key: p.id,

                      onClick: () => loadGuidedProof(p.id),

                      className: "px-2 py-1 text-[10px] font-bold rounded-lg transition-all " + (gpGuided.proofId === p.id ? 'bg-emerald-600 text-white shadow' : 'bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200')

                    }, p.title.split(' ').slice(0, 2).join(' ')))

                  ),



                  // Proof table

                  React.createElement("div", { className: "bg-white rounded-xl border border-emerald-200 overflow-hidden" },

                    // Table header

                    React.createElement("div", { className: "grid grid-cols-12 bg-emerald-100 text-[10px] font-bold text-emerald-800 border-b border-emerald-200" },

                      React.createElement("div", { className: "col-span-1 p-2 text-center" }, "#"),

                      React.createElement("div", { className: "col-span-6 p-2" }, "Statement"),

                      React.createElement("div", { className: "col-span-4 p-2" }, "Reason"),

                      React.createElement("div", { className: "col-span-1 p-2 text-center" }, "\u2713")

                    ),

                    // Steps

                    proof.steps.map((step, si) => {

                      const ans = answers[si];

                      const isAnswered = !!ans;

                      const isCorrect = ans && ans.correct;

                      const isLocked = isAnswered && isCorrect;

                      const bgClass = isCorrect ? 'bg-emerald-50' : (isAnswered && !isCorrect) ? 'bg-red-50' : (si === 0 || (answers[si - 1] && answers[si - 1].correct)) ? 'bg-white' : 'bg-slate-50 opacity-60';

                      const canAnswer = !isLocked && (si === 0 || (answers[si - 1] && answers[si - 1].correct));



                      return React.createElement("div", {

                        key: 'step-' + si,

                        className: "grid grid-cols-12 border-b border-emerald-100 last:border-0 " + bgClass

                      },

                        React.createElement("div", { className: "col-span-1 p-2 text-center text-xs font-bold text-emerald-600" }, si + 1),

                        React.createElement("div", { className: "col-span-6 p-2 text-[11px] text-slate-700 font-medium" }, step.statement),

                        React.createElement("div", { className: "col-span-4 p-1.5" },

                          isLocked

                            ? React.createElement("div", { className: "text-[10px] font-bold text-emerald-600 bg-emerald-100 rounded px-2 py-1" }, step.reason)

                            : canAnswer

                              ? React.createElement("select", {

                                  value: (ans && ans.selected) || '',

                                  onChange: e => checkGuidedStep(si, e.target.value),

                                  className: "w-full text-[10px] font-bold border-2 rounded-lg px-1.5 py-1 outline-none " + (isAnswered && !isCorrect ? 'border-red-300 text-red-600 bg-red-50' : 'border-emerald-300 text-emerald-700 focus:border-emerald-500')

                                },

                                  React.createElement('option', { value: '', disabled: true }, 'Select reason...'),

                                  step.options.map(opt => React.createElement('option', { key: opt, value: opt }, opt))

                                )

                              : React.createElement("div", { className: "text-[10px] text-slate-400 italic px-2 py-1" }, '\uD83D\uDD12 Locked')

                        ),

                        React.createElement("div", { className: "col-span-1 p-2 text-center text-sm" },

                          isCorrect ? '\u2705' : isAnswered ? '\u274C' : canAnswer ? '\u2B55' : '\u23F3'

                        )

                      );

                    })

                  ),



                  // Completion message

                  gpGuided.completed && Object.values(answers).every(a => a.correct) && React.createElement("div", { className: "mt-3 p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-center" },

                    React.createElement("p", { className: "text-sm font-bold text-emerald-700" }, "\uD83C\uDF89 Proof Complete! Q.E.D."),

                    React.createElement("p", { className: "text-[10px] text-emerald-600 mt-1" }, "You successfully proved: ", proof.theorem)

                  ),



                  // Wrong answer hint

                  Object.values(answers).some(a => !a.correct) && React.createElement("div", { className: "mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200" },

                    React.createElement("p", { className: "text-[10px] text-amber-700" }, "\uD83D\uDCA1 Hint: Re-read the statement carefully and think about which geometric property justifies it. You can change your answer!")

                  )



                );

              })()

            );
      })();
    }
  });

  // ═══ 🔬 calculus (calculus) ═══


  // ═══ 🔬 fractions (fractions) ═══
  /* fractions tool extracted to standalone file */




  console.log('[StemLab] stem_tool_math.js loaded — 13 tools');
})();
