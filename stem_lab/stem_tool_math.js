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
  window.StemLab.registerTool('calculus', {
    icon: '🔬',
    label: 'calculus',
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

      // ── Tool body (calculus) ──
      return (function() {
const d = labToolData.calculus;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, calculus: { ...prev.calculus, [key]: val } }));

          const W = 440, H = 300, pad = 40;

          const evalF = x => d.a * x * x + d.b * x + d.c;

          const xR = { min: -2, max: Math.max(d.xMax + 1, 6) };

          const yMax = Math.max(...Array.from({ length: 50 }, (_, i) => Math.abs(evalF(xR.min + i / 49 * (xR.max - xR.min)))), 1);

          const yR = { min: -yMax * 0.2, max: yMax * 1.2 };

          const toSX = x => pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2 * pad);

          const mode = d.mode || 'left';

          const dx = (d.xMax - d.xMin) / d.n;



          // Build approximation shapes

          var rects = [];

          var area = 0;

          if (mode === 'trapezoid') {

            for (var ti = 0; ti < d.n; ti++) {

              var txi = d.xMin + ti * dx;

              var tyL = evalF(txi), tyR2 = evalF(txi + dx);

              area += (tyL + tyR2) / 2 * dx;

              rects.push({ x: txi, w: dx, hL: tyL, hR: tyR2, type: 'trap' });

            }

          } else if (mode === 'simpson' && d.n >= 2 && d.n % 2 === 0) {

            var sdx = (d.xMax - d.xMin) / d.n;

            for (var si = 0; si < d.n; si += 2) {

              var sx0 = d.xMin + si * sdx;

              var sy0 = evalF(sx0), sy1 = evalF(sx0 + sdx), sy2 = evalF(sx0 + 2 * sdx);

              area += (sy0 + 4 * sy1 + sy2) * sdx / 3;

              rects.push({ x: sx0, w: sdx * 2, hL: sy0, hM: sy1, hR: sy2, type: 'simp' });

            }

          } else {

            for (var ri = 0; ri < d.n; ri++) {

              var xi = d.xMin + ri * dx;

              var yi = mode === 'left' ? evalF(xi) : mode === 'right' ? evalF(xi + dx) : evalF(xi + dx / 2);

              area += yi * dx;

              rects.push({ x: xi, w: dx, h: yi, type: 'rect' });

            }

          }



          // Curve polyline

          var curvePts = [];

          for (var cpx = 0; cpx <= W - 2 * pad; cpx += 2) {

            var cx = xR.min + (cpx / (W - 2 * pad)) * (xR.max - xR.min);

            curvePts.push(toSX(cx) + ',' + toSY(evalF(cx)));

          }



          // Exact integral

          var exact = (d.a / 3) * (Math.pow(d.xMax, 3) - Math.pow(d.xMin, 3)) + (d.b / 2) * (Math.pow(d.xMax, 2) - Math.pow(d.xMin, 2)) + d.c * (d.xMax - d.xMin);

          var err = Math.abs(area - exact);



          // Convergence data (error vs n for mini chart) — memoized

          var CW = 160, Cpad = 15;

          var _convCacheKey = [d.a, d.b, d.c, d.xMin, d.xMax, mode].join(',');

          if (!window._calcConvCache || window._calcConvCache.key !== _convCacheKey) {

            var _cd = [];

            for (var cn = 2; cn <= 50; cn += 2) {

              var cdx2 = (d.xMax - d.xMin) / cn;

              var carea = 0;

              if (mode === 'trapezoid') {

                for (var cti = 0; cti < cn; cti++) { var cxti = d.xMin + cti * cdx2; carea += (evalF(cxti) + evalF(cxti + cdx2)) / 2 * cdx2; }

              } else if (mode === 'simpson' && cn % 2 === 0) {

                for (var csi = 0; csi < cn; csi += 2) { var csx0 = d.xMin + csi * cdx2; carea += (evalF(csx0) + 4 * evalF(csx0 + cdx2) + evalF(csx0 + 2 * cdx2)) * cdx2 / 3; }

              } else {

                for (var cri = 0; cri < cn; cri++) { var cxi = d.xMin + cri * cdx2; carea += evalF(mode === 'left' ? cxi : mode === 'right' ? cxi + cdx2 : cxi + cdx2 / 2) * cdx2; }

              }

              _cd.push({ n: cn, err: Math.abs(carea - exact) });

            }

            window._calcConvCache = { key: _convCacheKey, data: _cd };

          }

          var convData = window._calcConvCache.data;

          var convMaxErr = Math.max(...convData.map(c => c.err), 0.001);

          var convToX = function (n) { return Cpad + ((n - 2) / 48) * (CW - 2 * Cpad); };

          var convToY = function (e) { return 55 - (e / convMaxErr) * 40; };



          // Mode options

          var MODES = [

            { id: 'left', label: t('stem.calculus.left') },

            { id: 'midpoint', label: t('stem.calculus.midpoint') },

            { id: 'right', label: t('stem.calculus.right') },

            { id: 'trapezoid', label: t('stem.calculus.trapezoid') },

            { id: 'simpson', label: "Simpson's" }

          ];



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            null, // tutorial overlay removed (hub-scope dependency)

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u222B Calculus Visualizer"),

              React.createElement("span", { className: "px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE")

            ),

            // Mode buttons

            React.createElement("div", { className: "flex gap-1 mb-3" },

              MODES.map(function (m) {

                return React.createElement("button", { key: m.id, onClick: function () { upd("mode", m.id); if (m.id === 'simpson' && d.n % 2 !== 0) upd('n', d.n + 1); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m.id ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-red-50') }, m.label);

              })

            ),

            // SVG Graph

            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border-2 border-red-200 shadow-sm", style: { maxHeight: "320px" } },

              // Grid

              (function () {

                var gels = [];

                for (var gx = Math.ceil(xR.min); gx <= xR.max; gx++) {

                  var gsx = toSX(gx);

                  if (gsx > pad && gsx < W - pad) {

                    gels.push(React.createElement("line", { key: 'gx' + gx, x1: gsx, y1: pad, x2: gsx, y2: H - pad, stroke: "#f1f5f9", strokeWidth: 0.5 }));

                  }

                }

                return gels;

              })(),

              // Axes

              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1.5 }),

              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1.5 }),

              // Integration bounds

              React.createElement("rect", { x: toSX(d.xMin), y: pad, width: Math.abs(toSX(d.xMax) - toSX(d.xMin)), height: H - 2 * pad, fill: "none", stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 2" }),

              // Approximation shapes

              rects.map(function (r, i) {

                if (r.type === 'trap') {

                  var pts = toSX(r.x) + ',' + toSY(0) + ' ' + toSX(r.x) + ',' + toSY(r.hL) + ' ' + toSX(r.x + r.w) + ',' + toSY(r.hR) + ' ' + toSX(r.x + r.w) + ',' + toSY(0);

                  return React.createElement("polygon", { key: i, points: pts, fill: "rgba(239,68,68,0.15)", stroke: "#ef4444", strokeWidth: 0.8 });

                }

                if (r.type === 'simp') {

                  // Approximate with quadratic through 3 points as polygon segments

                  var simpPts = [toSX(r.x) + ',' + toSY(0)];

                  for (var sp = 0; sp <= 10; sp++) {

                    var st = sp / 10;

                    var spx = r.x + st * r.w;

                    var spy = r.hL * (1 - st) * (1 - 2 * st) + 4 * r.hM * st * (1 - st) + r.hR * st * (2 * st - 1);

                    simpPts.push(toSX(spx) + ',' + toSY(spy));

                  }

                  simpPts.push(toSX(r.x + r.w) + ',' + toSY(0));

                  return React.createElement("polygon", { key: i, points: simpPts.join(' '), fill: "rgba(168,85,247,0.15)", stroke: "#a855f7", strokeWidth: 0.8 });

                }

                return React.createElement("rect", { key: i, x: toSX(r.x), y: r.h >= 0 ? toSY(r.h) : toSY(0), width: Math.abs(toSX(r.x + r.w) - toSX(r.x)), height: Math.abs(toSY(r.h) - toSY(0)), fill: "rgba(239,68,68,0.15)", stroke: "#ef4444", strokeWidth: 0.8 });

              }),

              // Curve

              curvePts.length > 1 && React.createElement("polyline", { points: curvePts.join(" "), fill: "none", stroke: "#1e293b", strokeWidth: 2.5 }),

              // Equation label

              React.createElement("text", { x: W / 2, y: H - 8, textAnchor: "middle", fill: "#64748b", style: { fontSize: '9px', fontWeight: 'bold' } }, "f(x) = " + d.a + "x\u00B2 + " + d.b + "x + " + d.c + "  |  \u222B \u2248 " + area.toFixed(4) + "  (n=" + d.n + ", " + mode + ")")

            ),

            // Controls

            React.createElement("div", { className: "grid grid-cols-2 gap-3 mt-3" },

              [{ k: 'xMin', label: 'a (lower)', min: -2, max: 8, step: 0.5 }, { k: 'xMax', label: 'b (upper)', min: 1, max: 10, step: 0.5 }, { k: 'n', label: t('stem.calculus.rectangles_n'), min: 2, max: 50, step: mode === 'simpson' ? 2 : 1 }, { k: 'a', label: t('stem.calculus.coeff_a'), min: -3, max: 3, step: 0.1 }].map(function (s) {

                return React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-xs font-bold text-red-600" }, s.label + ": " + d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: function (e) { upd(s.k, parseFloat(e.target.value)); }, className: "w-full accent-red-600" })

                );

              })

            ),

            // Analysis + Convergence side by side

            React.createElement("div", { className: "mt-3 grid grid-cols-5 gap-3" },

              // Analysis (3 cols)

              React.createElement("div", { className: "col-span-3 bg-red-50 rounded-xl border border-red-200 p-3" },

                React.createElement("p", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Analysis"),

                React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, mode === 'trapezoid' ? 'Trapezoidal' : mode === 'simpson' ? "Simpson's" : "Riemann (" + mode + ")"),

                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, area.toFixed(4))

                  ),

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Exact (\u222B)"),

                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, exact.toFixed(4))

                  ),

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Error"),

                    React.createElement("p", { className: "text-sm font-bold " + (err < 0.01 ? 'text-emerald-600' : err < 0.1 ? 'text-yellow-600' : 'text-red-600') }, err.toFixed(6))

                  )

                ),

                React.createElement("p", { className: "mt-2 text-xs text-red-500 italic" },

                  mode === 'simpson' ? '\uD83D\uDCA1 Simpson\'s rule uses parabolic arcs \u2014 incredibly accurate for polynomials!'

                    : mode === 'trapezoid' ? '\uD83D\uDCA1 Trapezoidal rule uses linear segments. Error \u221D 1/n\u00B2 \u2014 better than rectangles!'

                      : d.n <= 5 ? '\uD83D\uDCA1 Very few rectangles! The approximation is rough. Try increasing n.'

                        : d.n <= 15 ? '\uD83D\uDCA1 Getting closer! More rectangles = better approximation.'

                          : '\uD83D\uDCA1 At n=' + d.n + ', the sum closely matches the integral. The limit as n\u2192\u221E gives the true area.'

                )

              ),

              // Convergence mini-chart (2 cols)

              React.createElement("div", { className: "col-span-2 bg-slate-50 rounded-xl border p-2" },

                React.createElement("p", { className: "text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\uD83D\uDCC9 Error vs n"),

                React.createElement("svg", { viewBox: "0 0 " + CW + " 60", className: "w-full" },

                  React.createElement("line", { x1: Cpad, y1: 55, x2: CW - Cpad, y2: 55, stroke: "#e2e8f0", strokeWidth: 0.5 }),

                  React.createElement("polyline", {

                    points: convData.map(function (cd) { return convToX(cd.n) + ',' + convToY(cd.err); }).join(' '),

                    fill: "none", stroke: "#ef4444", strokeWidth: 1.5

                  }),

                  // Current n marker

                  React.createElement("circle", { cx: convToX(d.n), cy: convToY(err), r: 3, fill: "#ef4444", stroke: "white", strokeWidth: 1 }),

                  React.createElement("text", { x: Cpad, y: 8, fill: "#94a3b8", style: { fontSize: '6px' } }, convMaxErr.toFixed(2)),

                  React.createElement("text", { x: CW - Cpad, y: 8, fill: "#94a3b8", style: { fontSize: '6px', textAnchor: 'end' } }, "n=" + d.n),

                  React.createElement("text", { x: CW / 2, y: 8, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '6px' } }, "error \u2192 0")

                )

              )

            ),

            // Presets

            React.createElement("div", { className: "mt-3 flex flex-wrap gap-1.5" },

              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 self-center" }, "Presets:"),

              [

                { label: '\u222B x\u00B2 [0,1]', a: 1, b: 0, c: 0, xMin: 0, xMax: 1, n: 20, tip: 'Exact: 1/3 \u2248 0.333' },

                { label: '\u222B x\u00B2 [0,3]', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, tip: 'Exact: 9' },

                { label: '\u222B (x\u00B2+2x+1) [0,2]', a: 1, b: 2, c: 1, xMin: 0, xMax: 2, n: 20, tip: 'Try increasing n to see convergence!' },

                { label: '\u222B 2x [0,5]', a: 0, b: 2, c: 0, xMin: 0, xMax: 5, n: 10, tip: 'Linear \u2014 exact even with few rects' },

                { label: '\u222B -x\u00B2+4 [0,2]', a: -1, b: 0, c: 4, xMin: 0, xMax: 2, n: 25, tip: 'Downward parabola \u2014 find the area under the arch' },

                { label: '\u222B 3 [1,4] (constant)', a: 0, b: 0, c: 3, xMin: 1, xMax: 4, n: 5, tip: 'Constant function: area = 3\u00D73 = 9' },

              ].map(function (p) {

                return React.createElement("button", {

                  key: p.label, onClick: function () {

                    upd('a', p.a); upd('b', p.b); upd('c', p.c); upd('xMin', p.xMin); upd('xMax', p.xMax); upd('n', p.n);

                    addToast(p.tip, 'success');

                  }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"

                }, p.label);

              })

            ),

            // ══════════════════════════════════════════════════

            // ── Calculus Challenge Engine (4 modes + XP) ──

            // ══════════════════════════════════════════════════

            (() => {

              var cq = d.calcQuiz || null;

              var cScore = d.calcScore || 0;

              var cStreak = d.calcStreak || 0;

              var cMode = d.calcChallengeMode || 'estimate';

              var cHint = d.calcHint || '';



              var CALC_CHALLENGES = [

                { id: 'estimate', label: '\uD83C\uDFAF Estimate \u222B', color: 'red' },

                { id: 'method',  label: '\u26A1 Best Method', color: 'amber' },

                { id: 'minN',    label: '\uD83D\uDD22 Min n', color: 'blue' },

                { id: 'exact',   label: '\u270F\uFE0F Exact \u222B', color: 'emerald' }

              ];



              // ── Generator: Estimate the Integral ──

              function makeEstimateQuiz() {

                var qa = [1, -1, 2, -2, 0][Math.floor(Math.random() * 5)];

                var qb = [0, 1, 2, -1, -2, 3][Math.floor(Math.random() * 6)];

                var qc = [0, 1, 2, 3, -1][Math.floor(Math.random() * 5)];

                var qxMin = 0;

                var qxMax = [1, 2, 3][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                qExact = Math.round(qExact * 100) / 100;

                var opts = [qExact];

                while (opts.length < 4) {

                  var off = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);

                  var wrong = Math.round((qExact + off) * 100) / 100;

                  if (opts.indexOf(wrong) < 0 && wrong !== qExact) opts.push(wrong);

                }

                opts.sort(function (a, b) { return a - b; });

                var eqStr = (qa !== 0 ? qa + 'x\u00B2' : '') + (qb !== 0 ? (qb > 0 && qa !== 0 ? '+' : '') + qb + 'x' : '') + (qc !== 0 ? (qc > 0 && (qa !== 0 || qb !== 0) ? '+' : '') + qc : '');

                if (!eqStr) eqStr = '0';

                return { mode: 'estimate', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: qExact, opts: opts, answered: false, question: '\u222B\u2080' + '\u207B'.repeat(0) + qxMax + ' (' + eqStr + ') dx = ?' };

              }



              // ── Generator: Which Method Is Best? ──

              function makeMethodQuiz() {

                var qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                var qb = [0, 1, -1][Math.floor(Math.random() * 3)];

                var qc = [0, 1, 2][Math.floor(Math.random() * 3)];

                var qxMin = 0, qxMax = [2, 3][Math.floor(Math.random() * 2)];

                var qn = [4, 6, 8][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                var methods = ['left', 'right', 'midpoint', 'trapezoid', 'simpson'];

                var errors = {};

                methods.forEach(function (m) {

                  var qdx = (qxMax - qxMin) / qn;

                  var qarea = 0;

                  if (m === 'trapezoid') {

                    for (var i = 0; i < qn; i++) { var xi = qxMin + i * qdx; qarea += (qa * xi * xi + qb * xi + qc + qa * (xi + qdx) * (xi + qdx) + qb * (xi + qdx) + qc) / 2 * qdx; }

                  } else if (m === 'simpson' && qn % 2 === 0) {

                    for (var i = 0; i < qn; i += 2) { var xi = qxMin + i * qdx; var f0 = qa * xi * xi + qb * xi + qc; var f1 = qa * (xi + qdx) * (xi + qdx) + qb * (xi + qdx) + qc; var f2 = qa * (xi + 2 * qdx) * (xi + 2 * qdx) + qb * (xi + 2 * qdx) + qc; qarea += (f0 + 4 * f1 + f2) * qdx / 3; }

                  } else {

                    for (var i = 0; i < qn; i++) { var xi = qxMin + i * qdx; var xSample = m === 'left' ? xi : m === 'right' ? xi + qdx : xi + qdx / 2; qarea += (qa * xSample * xSample + qb * xSample + qc) * qdx; }

                  }

                  errors[m] = Math.abs(qarea - qExact);

                });

                var best = methods.reduce(function (a, b) { return errors[a] < errors[b] ? a : b; });

                var labels = { left: 'Left Riemann', right: 'Right Riemann', midpoint: 'Midpoint', trapezoid: 'Trapezoidal', simpson: "Simpson's" };

                return { mode: 'method', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, n: qn, answer: best, answerLabel: labels[best], opts: methods.map(function (m) { return { id: m, label: labels[m] }; }), errors: errors, answered: false, question: 'At n=' + qn + ', which method gives the smallest error?' };

              }



              // ── Generator: Minimum n ──

              function makeMinNQuiz() {

                var qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                var qb = [0, 1, 2][Math.floor(Math.random() * 3)];

                var qc = [0, 1][Math.floor(Math.random() * 2)];

                var qxMin = 0, qxMax = [2, 3][Math.floor(Math.random() * 2)];

                var threshold = [0.5, 0.1, 0.05][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                // Find the actual minimum n for left Riemann

                var minN = 2;

                for (var tn = 2; tn <= 100; tn++) {

                  var tdx = (qxMax - qxMin) / tn; var tarea = 0;

                  for (var ti = 0; ti < tn; ti++) { var txi = qxMin + ti * tdx; tarea += (qa * txi * txi + qb * txi + qc) * tdx; }

                  if (Math.abs(tarea - qExact) < threshold) { minN = tn; break; }

                }

                if (minN > 50) { minN = 50; threshold = 0.5; } // safety cap

                var opts = [minN];

                var candidates = [minN - 4, minN - 2, minN + 2, minN + 4, minN + 6, minN * 2].filter(function (v) { return v >= 2 && v <= 100 && v !== minN; });

                while (opts.length < 4 && candidates.length > 0) { var ci = Math.floor(Math.random() * candidates.length); opts.push(candidates.splice(ci, 1)[0]); }

                opts.sort(function (a, b) { return a - b; });

                return { mode: 'minN', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: minN, threshold: threshold, opts: opts, answered: false, question: 'Using Left Riemann sums, what is the smallest n where error < ' + threshold + '?' };

              }



              // ── Generator: Exact Integral (free-form typed) ──

              function makeExactQuiz() {

                var qa = [0, 1, -1, 2][Math.floor(Math.random() * 4)];

                var qb = [0, 1, 2, 3, -1][Math.floor(Math.random() * 5)];

                var qc = [0, 1, 2, -1][Math.floor(Math.random() * 4)];

                var qxMin = 0;

                var qxMax = [1, 2, 3][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                qExact = Math.round(qExact * 1000) / 1000;

                var eqStr = (qa !== 0 ? qa + 'x\u00B2' : '') + (qb !== 0 ? (qb > 0 && qa !== 0 ? '+' : '') + qb + 'x' : '') + (qc !== 0 ? (qc > 0 && (qa !== 0 || qb !== 0) ? '+' : '') + qc : '');

                if (!eqStr) eqStr = '0';

                var hintParts = [];

                if (qa !== 0) hintParts.push(qa + 'x\u00B3/3');

                if (qb !== 0) hintParts.push(qb + 'x\u00B2/2');

                if (qc !== 0) hintParts.push(qc + 'x');

                var antiDerivStr = hintParts.join(' + ') || '0';

                return { mode: 'exact', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: qExact, answered: false, question: 'Using the power rule, compute \u222B\u2080' + qxMax + ' (' + eqStr + ') dx exactly.', hint: 'Anti-derivative: F(x) = ' + antiDerivStr + '. Evaluate F(' + qxMax + ') \u2212 F(' + qxMin + ').' };

              }



              function startCalcChallenge() {

                var q;

                if (cMode === 'method') q = makeMethodQuiz();

                else if (cMode === 'minN') q = makeMinNQuiz();

                else if (cMode === 'exact') q = makeExactQuiz();

                else q = makeEstimateQuiz();

                upd('calcQuiz', q); upd('calcHint', '');

                // Load the function into the visualizer so students can see it

                upd('a', q.a); upd('b', q.b); upd('c', q.c);

                if (q.xMin !== undefined) upd('xMin', q.xMin);

                if (q.xMax !== undefined) upd('xMax', q.xMax);

                if (q.n !== undefined) upd('n', q.n);

              }



              function checkCalcAnswer(chosen) {

                var correct = false;

                if (cMode === 'method') { correct = chosen === cq.answer; }

                else if (cMode === 'minN') { correct = chosen <= cq.answer + 2 && chosen >= cq.answer; } // accept close

                else if (cMode === 'exact') { correct = Math.abs(parseFloat(chosen) - cq.answer) < 0.05; }

                else { correct = chosen === cq.answer; }

                upd('calcQuiz', Object.assign({}, cq, { answered: true, chosen: chosen, correct: correct }));

                upd('calcScore', cScore + (correct ? 1 : 0));

                var newStreak = correct ? cStreak + 1 : 0;

                upd('calcStreak', newStreak);

                if (correct) {

                  if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, cMode + ' challenge');

                  announceToSR('Correct! Earned 5 XP');

                  addToast('\u2705 Correct! +5 XP', 'success');

                  if (newStreak >= 3) { if (typeof stemCelebrate === 'function') stemCelebrate(); if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, '3-streak bonus'); addToast('\uD83D\uDD25 ' + newStreak + '-streak! +5 bonus XP', 'success'); }

                  setTimeout(function () { startCalcChallenge(); }, 2000);

                } else {

                  announceToSR('Incorrect. The answer was ' + cq.answer);

                  // Show hint

                  if (cq.hint) { upd('calcHint', cq.hint); }

                  else if (cMode === 'method') { upd('calcHint', 'The best method was ' + cq.answerLabel + '. Simpson\u2019s rule is often most accurate for polynomials!'); }

                  else if (cMode === 'minN') { upd('calcHint', 'The minimum n was ' + cq.answer + '. More subdivisions = smaller error.'); }

                  else { upd('calcHint', 'The answer was ' + cq.answer + '. Try computing the anti-derivative using the power rule!'); }

                  // AI hint if available

                  if (typeof stemAIHint === 'function') {

                    stemAIHint('calculus', cq.question, String(chosen), String(cq.answer), function (aiResp) { upd('calcHint', aiResp); });

                  }

                  addToast('\u274C Not quite \u2014 see the hint below', 'error');

                }

              }



              return React.createElement("div", { className: "border-t-2 border-red-200 pt-4 mt-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83C\uDFAF"),

                  React.createElement("h4", { className: "text-sm font-black text-red-800" }, "Calculus Challenges"),

                  cScore > 0 && React.createElement("span", { className: "ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" }, '\u2B50 ' + cScore + ' | \uD83D\uDD25 ' + cStreak)

                ),

                // Mode selector

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

                  CALC_CHALLENGES.map(function (cm) {

                    var isActive = cMode === cm.id;

                    return React.createElement("button", {

                      key: cm.id,

                      onClick: function () { upd('calcChallengeMode', cm.id); upd('calcQuiz', null); upd('calcHint', ''); },

                      className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-' + cm.color + '-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'),

                      'aria-label': cm.label + ' challenge mode'

                    }, cm.label);

                  })

                ),

                // Start button

                React.createElement("button", {

                  onClick: startCalcChallenge,

                  className: "px-4 py-2 rounded-lg text-xs font-bold mb-3 transition-all " + (cq ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'),

                  'aria-label': cq ? 'Generate new challenge' : 'Start challenge'

                }, cq ? '\uD83D\uDD04 New Challenge' : '\uD83D\uDE80 Start Challenge'),



                // Question card (multiple choice modes: estimate, method, minN)

                cq && !cq.answered && cMode !== 'exact' && React.createElement("div", { className: "bg-red-50 rounded-xl p-4 border border-red-200 animate-in fade-in" },

                  React.createElement("p", { className: "text-sm font-bold text-red-800 mb-3" }, cq.question),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    (cMode === 'method' ? cq.opts : cq.opts).map(function (opt) {

                      var optVal = cMode === 'method' ? opt.id : opt;

                      var optLabel = cMode === 'method' ? opt.label : (cMode === 'minN' ? 'n = ' + opt : String(opt));

                      return React.createElement("button", {

                        key: String(optVal),

                        onClick: function () { checkCalcAnswer(optVal); },

                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all",

                        'aria-label': 'Answer: ' + optLabel

                      }, optLabel);

                    })

                  )

                ),



                // Question card (free-form: exact mode)

                cq && !cq.answered && cMode === 'exact' && React.createElement("div", { className: "bg-emerald-50 rounded-xl p-4 border border-emerald-200 animate-in fade-in" },

                  React.createElement("p", { className: "text-sm font-bold text-emerald-800 mb-1" }, cq.question),

                  React.createElement("p", { className: "text-[10px] text-emerald-600 mb-3 italic" }, "Use the power rule: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1) + C"),

                  React.createElement("div", { className: "flex items-center gap-2" },

                    React.createElement("input", {

                      type: "number", step: "any",

                      value: d._calcExactInput || '',

                      onChange: function (e) { upd('_calcExactInput', e.target.value); },

                      onKeyDown: function (e) { if (e.key === 'Enter' && d._calcExactInput) checkCalcAnswer(d._calcExactInput); },

                      placeholder: "Type your answer\u2026",

                      className: "flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 text-sm font-bold text-emerald-800 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none",

                      'aria-label': 'Type your answer for the exact integral'

                    }),

                    React.createElement("button", {

                      onClick: function () { if (d._calcExactInput) checkCalcAnswer(d._calcExactInput); },

                      className: "px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md",

                      'aria-label': 'Submit answer'

                    }, "Check \u2192")

                  )

                ),



                // Result card

                cq && cq.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold mb-2 " + (cq.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },

                  cq.correct ? '\u2705 Correct! The answer is ' + cq.answer : '\u274C The correct answer was ' + cq.answer,

                  cq.correct && cStreak >= 3 && React.createElement("span", { className: "ml-2 text-amber-600" }, '\uD83D\uDD25 ' + cStreak + '-streak!')

                ),



                // Hint card (shown on wrong answer)

                cHint && React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-800" },

                  React.createElement("span", { className: "font-bold" }, "\uD83D\uDCA1 Hint: "),

                  cHint

                ),



                // Method comparison table (shown after method quiz answered)

                cq && cq.answered && cMode === 'method' && cq.errors && React.createElement("div", { className: "mt-2 bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-slate-500 uppercase mb-1" }, "Error Comparison (n=" + cq.n + ")"),

                  React.createElement("div", { className: "grid grid-cols-5 gap-1 text-center" },

                    ['left', 'right', 'midpoint', 'trapezoid', 'simpson'].map(function (m) {

                      var isBest = m === cq.answer;

                      return React.createElement("div", { key: m, className: "px-1 py-1 rounded text-[9px] font-bold " + (isBest ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-slate-500 border') },

                        React.createElement("div", null, m === 'simpson' ? "Simp" : m.charAt(0).toUpperCase() + m.slice(1, 4)),

                        React.createElement("div", { className: "text-[8px]" }, cq.errors[m].toFixed(4))

                      );

                    })

                  )

                )

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'calc-' + Date.now(), tool: 'calculus', label: '\u222B[' + d.xMin + ',' + d.xMax + '] n=' + d.n, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });


  // ═══ 🔬 fractions (fractions) ═══
  /* fractions tool extracted to standalone file */
  window.StemLab.registerTool('unitConvert', {
    icon: '🔬',
    label: 'unitConvert',
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

      // ── Tool body (unitConvert) ──
      return (function() {
const d = labToolData.unitConvert;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, unitConvert: { ...prev.unitConvert, [key]: val } }));

          const CATEGORIES = {

            length: { label: '\uD83D\uDCCF Length', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },

            weight: { label: '\u2696 Weight', units: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ton: 907185 } },

            temperature: { label: '\uD83C\uDF21 Temperature', units: { '\u00B0C': 'C', '\u00B0F': 'F', 'K': 'K' } },

            speed: { label: '\uD83D\uDE80 Speed', units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704, 'knots': 0.51444 } },

            volume: { label: '\uD83E\uDDEA Volume', units: { mL: 0.001, L: 1, gal: 3.78541, qt: 0.946353, cup: 0.236588, 'fl oz': 0.0295735 } },

            time: { label: '\u23F0 Time', units: { sec: 1, min: 60, hr: 3600, day: 86400, week: 604800, year: 31536000 } },

          };

          const cat = CATEGORIES[d.category] || CATEGORIES.length;

          const convert = function () {

            if (d.category === 'temperature') {

              var v = d.value;

              if (d.fromUnit === d.toUnit) return v;

              if (d.fromUnit === '\u00B0C' && d.toUnit === '\u00B0F') return v * 9 / 5 + 32;

              if (d.fromUnit === '\u00B0F' && d.toUnit === '\u00B0C') return (v - 32) * 5 / 9;

              if (d.fromUnit === '\u00B0C' && d.toUnit === 'K') return v + 273.15;

              if (d.fromUnit === 'K' && d.toUnit === '\u00B0C') return v - 273.15;

              if (d.fromUnit === '\u00B0F' && d.toUnit === 'K') return (v - 32) * 5 / 9 + 273.15;

              if (d.fromUnit === 'K' && d.toUnit === '\u00B0F') return (v - 273.15) * 9 / 5 + 32;

              return v;

            }

            return d.value * (cat.units[d.fromUnit] || 1) / (cat.units[d.toUnit] || 1);

          };

          var result = convert();

          var fmtResult = typeof result === 'number' ? (Math.abs(result) < 0.01 && result !== 0 ? result.toExponential(4) : result.toFixed(4).replace(/\.?0+$/, '')) : result;



          // Visual comparison bars

          var fromBase = d.category === 'temperature' ? 1 : (cat.units[d.fromUnit] || 1);

          var toBase = d.category === 'temperature' ? 1 : (cat.units[d.toUnit] || 1);

          var ratio = d.category === 'temperature' ? (result !== 0 ? Math.abs(d.value / result) : 1) : fromBase / toBase;

          var barFrom = 100;

          var barTo = d.category !== 'temperature' ? Math.min(Math.max(barFrom * (1 / ratio), 5), 300) : barFrom;



          // Real-world references

          var REFERENCES = {

            length: function (meters) {

              if (meters < 0.01) return '\uD83D\uDC1C About ' + (meters * 1000).toFixed(0) + ' ant lengths';

              if (meters < 1) return '\uD83D\uDCCF About ' + (meters * 100).toFixed(0) + ' cm \u2014 a ruler is 30cm';

              if (meters < 10) return '\uD83D\uDEB6 About ' + (meters / 0.75).toFixed(0) + ' walking steps';

              if (meters < 100) return '\uD83C\uDFCA A pool is 50m \u2014 that\u2019s ' + (meters / 50).toFixed(1) + ' pools';

              if (meters < 1000) return '\u26BD A soccer field is 100m \u2014 that\u2019s ' + (meters / 100).toFixed(1) + ' fields';

              return '\uD83D\uDE97 ' + (meters / 1609.34).toFixed(1) + ' miles \u2014 about ' + (meters / 400).toFixed(0) + ' laps around a track';

            },

            weight: function (grams) {

              if (grams < 1) return '\uD83D\uDC1D A bee weighs ~0.1g \u2014 that\u2019s ' + (grams / 0.1).toFixed(0) + ' bees';

              if (grams < 100) return '\uD83E\uDD55 A carrot weighs ~60g \u2014 that\u2019s ' + (grams / 60).toFixed(1) + ' carrots';

              if (grams < 1000) return '\uD83C\uDF4E An apple weighs ~180g \u2014 that\u2019s ' + (grams / 180).toFixed(1) + ' apples';

              if (grams < 10000) return '\uD83D\uDCDA A textbook weighs ~1kg \u2014 that\u2019s ' + (grams / 1000).toFixed(1) + ' textbooks';

              return '\uD83D\uDC18 An adult elephant weighs ~5000kg \u2014 that\u2019s ' + (grams / 5000000).toFixed(4) + ' elephants';

            },

            speed: function (ms) {

              if (ms < 2) return '\uD83D\uDEB6 Walking speed is ~1.4 m/s';

              if (ms < 12) return '\uD83C\uDFC3 Usain Bolt peaks at ~12 m/s \u2014 you\u2019re at ' + (ms / 12 * 100).toFixed(0) + '%';

              if (ms < 100) return '\uD83D\uDE97 Highway speed is ~30 m/s \u2014 you\u2019re at ' + (ms / 30 * 100).toFixed(0) + '%';

              return '\u2708 A jet is ~250 m/s \u2014 you\u2019re at ' + (ms / 250 * 100).toFixed(0) + '%';

            },

            volume: function (liters) {

              if (liters < 0.5) return '\u2615 A teacup holds ~0.24L \u2014 that\u2019s ' + (liters / 0.24).toFixed(1) + ' cups';

              if (liters < 5) return '\uD83E\uDD5B A water bottle is 1L \u2014 that\u2019s ' + liters.toFixed(1) + ' bottles';

              return '\uD83D\uDEC1 A bathtub holds ~300L \u2014 that\u2019s ' + (liters / 300).toFixed(2) + ' tubs';

            },

            time: function (secs) {

              if (secs < 60) return '\uD83D\uDCA8 A sneeze lasts ~0.5s \u2014 that\u2019s ' + (secs / 0.5).toFixed(0) + ' sneezes';

              if (secs < 3600) return '\u23F0 One class period is ~50 min \u2014 that\u2019s ' + (secs / 3000).toFixed(1) + ' classes';

              if (secs < 86400) return '\uD83C\uDF1E A day has 24 hrs \u2014 that\u2019s ' + (secs / 86400).toFixed(2) + ' days';

              return '\uD83D\uDCC5 A year has 365 days \u2014 that\u2019s ' + (secs / 31536000).toFixed(3) + ' years';

            },

          };

          var baseValue = d.category === 'temperature' ? d.value : d.value * (cat.units[d.fromUnit] || 1);

          var refFn = REFERENCES[d.category];

          var refText = refFn ? refFn(baseValue) : null;



          // Conversion history

          var history = d.history || [];



          // Quiz

          var QUIZ_QS = [

            { q: 'How many centimeters in 1 meter?', a: 100, unit: 'cm' },

            { q: 'How many grams in 1 kilogram?', a: 1000, unit: 'g' },

            { q: 'How many inches in 1 foot?', a: 12, unit: 'in' },

            { q: 'How many seconds in 1 hour?', a: 3600, unit: 'sec' },

            { q: 'How many mL in 1 liter?', a: 1000, unit: 'mL' },

            { q: 'How many ounces in 1 pound?', a: 16, unit: 'oz' },

          ];



          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCCF Unit Converter"),

              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE")

            ),

            // Category tabs

            React.createElement("div", { className: "flex gap-2 mb-4" },

              Object.entries(CATEGORIES).map(function (entry) {

                var k = entry[0], v = entry[1];

                return React.createElement("button", { key: k, onClick: function () { upd('category', k); var units = Object.keys(v.units); upd('fromUnit', units[0]); upd('toUnit', units[1] || units[0]); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.category === k ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50') }, v.label);

              })

            ),

            // Main converter card

            React.createElement("div", { className: "bg-white rounded-xl border-2 border-cyan-200 p-6 shadow-sm" },

              React.createElement("div", { className: "flex items-center gap-4 justify-center" },

                React.createElement("div", { className: "text-center" },

                  React.createElement("input", { type: "number", value: d.value, onChange: function (e) { upd('value', parseFloat(e.target.value) || 0); }, className: "w-32 text-center text-2xl font-bold border-b-2 border-cyan-300 outline-none py-1", step: "0.01" }),

                  React.createElement("select", { 'aria-label': 'Convert from unit', value: d.fromUnit, onChange: function (e) { upd('fromUnit', e.target.value); }, className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },

                    Object.keys(cat.units).map(function (u) { return React.createElement("option", { key: u, value: u }, u); })

                  )

                ),

                React.createElement("span", { className: "text-2xl text-cyan-400 font-bold" }, "\u2192"),

                React.createElement("div", { className: "text-center" },

                  React.createElement("p", { className: "text-2xl font-black text-cyan-700 py-1" }, fmtResult),

                  React.createElement("select", { 'aria-label': 'Convert to unit', value: d.toUnit, onChange: function (e) { upd('toUnit', e.target.value); }, className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },

                    Object.keys(cat.units).map(function (u) { return React.createElement("option", { key: u, value: u }, u); })

                  )

                )

              ),

              // Swap + Save buttons

              React.createElement("div", { className: "flex justify-center gap-2 mt-3" },

                React.createElement("button", { onClick: function () { setLabToolData(function (prev) { return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { fromUnit: d.toUnit, toUnit: d.fromUnit }) }); }); }, className: "px-4 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100 transition-all" }, "\u21C4 Swap"),

                React.createElement("button", {

                  onClick: function () {

                    var entry = { from: d.value + ' ' + d.fromUnit, to: fmtResult + ' ' + d.toUnit, ts: Date.now() };

                    var newHist = [entry].concat((history || []).slice(0, 4));

                    upd('history', newHist);

                    addToast(t('stem.converter.u2705_saved_to_history'), 'success');

                  }, className: "px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all"

                }, "\uD83D\uDCBE Save")

              )

            ),

            // Visual comparison bars

            d.category !== 'temperature' && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Visual Comparison"),

              React.createElement("div", { className: "space-y-2" },

                React.createElement("div", null,

                  React.createElement("p", { className: "text-[10px] font-bold text-cyan-600 mb-1" }, d.value + ' ' + d.fromUnit),

                  React.createElement("div", { className: "h-5 rounded-full overflow-hidden bg-slate-200" },

                    React.createElement("div", { className: "h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-500", style: { width: Math.min(barFrom, 100) + '%' } })

                  )

                ),

                React.createElement("div", null,

                  React.createElement("p", { className: "text-[10px] font-bold text-indigo-600 mb-1" }, fmtResult + ' ' + d.toUnit),

                  React.createElement("div", { className: "h-5 rounded-full overflow-hidden bg-slate-200" },

                    React.createElement("div", { className: "h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500", style: { width: Math.min(barTo, 100) + '%' } })

                  )

                )

              )

            ),

            // Real-world reference

            refText && React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3 text-center" },

              React.createElement("p", { className: "text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1" }, "\uD83C\uDF0D Real-World Reference"),

              React.createElement("p", { className: "text-sm font-bold text-amber-800" }, refText)

            ),

            // History

            history && history.length > 0 && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border p-3" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, "\uD83D\uDCDD Conversion History"),

                React.createElement("button", { onClick: function () { upd('history', []); }, className: "text-[10px] text-red-400 hover:text-red-600 font-bold" }, "Clear")

              ),

              React.createElement("div", { className: "space-y-1" },

                history.map(function (h, i) {

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border" },

                    React.createElement("span", { className: "text-cyan-600 font-bold" }, h.from),

                    React.createElement("span", { className: "text-slate-300" }, "\u2192"),

                    React.createElement("span", { className: "text-indigo-600 font-bold" }, h.to)

                  );

                })

              )

            ),

            // Quiz Mode

            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },

              React.createElement("button", {

                onClick: function () {

                  var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];

                  upd('quiz', { q: q.q, a: q.a, unit: q.unit, answered: false, score: (d.quiz && d.quiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-600 text-white')

              }, d.quiz ? "\uD83D\uDD04 New Question" : "\uD83E\uDDE0 Quiz Mode"),

              d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct"),

              d.quiz && React.createElement("div", { className: "mt-2 bg-cyan-50 rounded-lg p-3 border border-cyan-200" },

                React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),

                !d.quiz.answered

                  ? React.createElement("div", { className: "flex gap-2 items-center" },

                    React.createElement("input", {

                      type: "number", placeholder: t('stem.converter.your_answer'), className: "px-3 py-2 border border-cyan-200 rounded-lg font-mono text-sm w-32", onKeyDown: function (e) {

                        if (e.key === 'Enter') {

                          var ans = parseFloat(e.target.value);

                          var correct = Math.abs(ans - d.quiz.a) < 0.01;

                          upd('quiz', Object.assign({}, d.quiz, { answered: true, userAns: ans, correct: correct, score: d.quiz.score + (correct ? 1 : 0) }));

                          addToast(correct ? '\u2705 Correct!' : '\u274C Answer: ' + d.quiz.a + ' ' + d.quiz.unit, correct ? 'success' : 'error');

                        }

                      }

                    }),

                    React.createElement("span", { className: "text-xs text-slate-400" }, d.quiz.unit + " \u2014 press Enter")

                  )

                  : React.createElement("p", { className: "text-sm font-bold " + (d.quiz.correct ? 'text-emerald-600' : 'text-red-600') },

                    d.quiz.correct ? '\u2705 Correct!' : '\u274C Answer was: ' + d.quiz.a + ' ' + d.quiz.unit

                  )

              )

            ),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'uc-' + Date.now(), tool: 'unitConvert', label: d.value + ' ' + d.fromUnit + ' to ' + d.toUnit, data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });


  // ═══ 🔬 logicLab (logicLab) ═══
  window.StemLab.registerTool('logicLab', {
    icon: '🔬',
    label: 'logicLab',
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

      // ── Tool body (logicLab) ──
      return (function() {
// ── state ──

          var d = labToolData.logicLab || {};

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

            { level: 1, title: 'Simple Deduction', premises: ['P → Q', 'P'], conclusion: 'Q', hint: 'Use Modus Ponens' },

            { level: 2, title: 'Denial', premises: ['P → Q', '¬Q'], conclusion: '¬P', hint: 'Use Modus Tollens' },

            { level: 3, title: 'Chain Reaction', premises: ['P → Q', 'Q → R', 'P'], conclusion: 'R', hint: 'Chain implications, then apply MP' },

            { level: 4, title: 'Process of Elimination', premises: ['P ∨ Q', 'P → R', '¬P'], conclusion: 'R', hint: 'Eliminate with DS, then apply MP... wait, think again!' },

            { level: 5, title: 'Combine & Conclude', premises: ['(P ∧ Q) → R', 'P', 'Q'], conclusion: 'R', hint: 'First combine P and Q, then apply MP' }

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

            { arg: 'If a shape is a square, it has four sides. This shape has four sides. Therefore, it\'s a square.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Rectangles, rhombuses, and trapezoids also have four sides!' }

          ];



          // ── Quick-fire truth table challenges ──

          var TT_CHALLENGES = [

            { expr: 'P ∧ Q', desc: 'AND gate' },

            { expr: 'P ∨ Q', desc: 'OR gate' },

            { expr: 'P → Q', desc: 'Implication' },

            { expr: '¬ P', desc: 'Negation' },

            { expr: 'P ⊕ Q', desc: 'Exclusive OR' },

            { expr: '(P → Q) ∧ (Q → P)', desc: 'Biconditional equivalence' }

          ];



          var activeCh = aiProof || PROOF_CHALLENGES[currentChallenge] || PROOF_CHALLENGES[0];





          // ── gradient map ──

          var _gViolet = 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)';

          var _gCard = 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)';



          // ── render ──

          return React.createElement("div", { className: "max-w-4xl mx-auto" },

            // Header

            React.createElement("div", { className: "mb-6 text-center" },

              React.createElement("div", { className: "inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-3", style: { background: _gViolet, boxShadow: '0 8px 32px rgba(124,58,237,0.3)' } },

                React.createElement("span", { style: { fontSize: '32px' } }, "\uD83E\uDDE0"),

                React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, "Logic Lab"),

                React.createElement("span", { className: "text-violet-200 text-sm font-bold ml-2" }, "Propositional Logic & Reasoning")

              ),

              // Mode tabs

              React.createElement("div", { className: "flex justify-center gap-2 mt-4" },

                [['truth', '\uD83D\uDCCA', 'Truth Tables'], ['proof', '\uD83E\uDDE9', 'Proof Builder'], ['challenges', '\u26A1', 'Challenges']].map(function(m) {

                  var active = mode === m[0];

                  return React.createElement("button", {

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

              // Expression builder

              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\u270F\uFE0F"),

                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "Build Your Expression")

                ),

                // Current expression display

                React.createElement("div", { className: "flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-violet-200" },

                  React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800 flex-1" }, expr),

                  React.createElement("button", {

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

                    return React.createElement("button", {

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

                    return React.createElement("button", {

                      key: v,

                      onClick: function() { upd({ expression: expr + v }); },

                      className: "px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-lg transition-all text-sm"

                    }, v);

                  }),

                  React.createElement("button", {

                    onClick: function() { upd({ expression: expr.length > 0 ? expr.slice(0, -1) : '' }); },

                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg transition-all text-sm"

                  }, "\u232B"),

                  React.createElement("button", {

                    onClick: function() { upd({ expression: '' }); },

                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all text-sm"

                  }, "Clear")

                ),

                // Presets

                React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-500 mr-1 self-center" }, "Presets:"),

                  PRESETS.map(function(p) {

                    return React.createElement("button", {

                      key: p.label,

                      onClick: function() { upd({ expression: p.expr }); if (typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Truth table explored'); },

                      className: "px-2.5 py-1 bg-white border border-violet-200 hover:border-violet-400 text-violet-600 text-xs font-bold rounded-full transition-all hover:shadow-sm"

                    }, p.label);

                  })

                )

              ),



              // Truth table output

              (function() {

                var table = genTable(expr);

                if (!table) return React.createElement("div", { className: "p-8 text-center text-slate-400 text-sm" }, "Enter an expression above to generate a truth table");

                var typeBadge = table.type === 'tautology' ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: '\u2705 Tautology (always true)', glow: '0 0 20px rgba(16,185,129,0.3)' }

                  : table.type === 'contradiction' ? { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '\u274C Contradiction (always false)', glow: '0 0 20px rgba(239,68,68,0.3)' }

                  : { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: '\u26A0\uFE0F Contingency (sometimes true)', glow: 'none' };



                return React.createElement("div", { className: "rounded-2xl border-2 border-violet-200 overflow-hidden", style: { background: _gCard } },

                  // Badge

                  React.createElement("div", { className: "px-5 py-3 flex items-center justify-between" },

                    React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "\uD83D\uDCCA Truth Table"),

                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black border " + typeBadge.bg + " " + typeBadge.text + " " + typeBadge.border, style: { boxShadow: typeBadge.glow } }, typeBadge.label),

                    React.createElement("button", {

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

                      React.createElement("thead", null,

                        React.createElement("tr", null,

                          table.vars.map(function(v) {

                            return React.createElement("th", { key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100 first:rounded-l-lg last:rounded-r-lg" }, v);

                          }),

                          React.createElement("th", { className: "px-4 py-2 text-white font-black text-center rounded-lg", style: { background: _gViolet } }, expr)

                        )

                      ),

                      React.createElement("tbody", null,

                        table.rows.map(function(row, ri) {

                          return React.createElement("tr", { key: ri, className: "group" },

                            table.vars.map(function(v) {

                              return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white group-hover:bg-violet-50 transition-colors " + (row.env[v] ? "text-emerald-600" : "text-slate-400") },

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

                    return React.createElement("button", {

                      key: ci,

                      onClick: function() { upd({ currentChallenge: ci, proofSteps: [], proofComplete: false, aiProof: null }); },

                      className: "p-3 rounded-xl text-center transition-all " + (isActive ? "ring-2 ring-violet-500 shadow-lg" : "hover:shadow-md"),

                      style: { background: isCompleted ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : isActive ? 'white' : '#f5f3ff', border: isCompleted ? '2px solid #6ee7b7' : '2px solid #e9d5ff' }

                    },

                      React.createElement("div", { className: "text-lg font-black " + (isCompleted ? "text-emerald-600" : "text-violet-700") }, isCompleted ? "\u2714" : "L" + ch.level),

                      React.createElement("div", { className: "text-[10px] font-bold text-slate-500 mt-0.5" }, ch.title)

                    );

                  })

                ),

                // AI Proof Generator

                React.createElement("div", { className: "mt-3 flex items-center gap-2" },

                  React.createElement("button", {

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

                  aiProof && React.createElement("button", {

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

                      return React.createElement("button", {

                        key: pi,

                        onClick: function() {

                          var sel = (d.selectedSteps || []).slice();

                          var idx = sel.indexOf('P' + pi);

                          if (idx !== -1) sel.splice(idx, 1); else sel.push('P' + pi);

                          upd({ selectedSteps: sel });

                        },

                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-indigo-200 ring-2 ring-indigo-500 shadow-md" : "bg-white hover:bg-indigo-100 border border-indigo-200")

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

                      return React.createElement("button", {

                        key: si,

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

                        React.createElement("span", { className: "text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded" }, step.rule),

                        step.result === activeCh.conclusion && React.createElement("span", { className: "text-emerald-500 font-black text-sm" }, "\uD83C\uDF89")

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-2" },

                      React.createElement("button", {

                        onClick: function() {

                          var newSteps = proofSteps.slice(0, -1);

                          upd({ proofSteps: newSteps, proofComplete: false });

                        },

                        className: "px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all",

                        disabled: proofSteps.length === 0

                      }, "\u21A9 Undo"),

                      React.createElement("button", {

                        onClick: function() { upd({ proofSteps: [], proofComplete: false, selectedSteps: [] }); },

                        className: "px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"

                      }, "\uD83D\uDD04 Reset")

                    )

                  ),



                  // Hint

                  React.createElement("button", {

                    onClick: function() { upd({ showHint: !d.showHint }); },

                    className: "text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"

                  }, d.showHint ? "\uD83D\uDCA1 " + activeCh.hint : "\uD83D\uDCA1 Show Hint")

                ),



                // Right: Rules panel

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-1" }, "\uD83D\uDCDA Inference Rules"),

                  RULES.map(function(rule) {

                    return React.createElement("button", {

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

                            if (addToast) addToast('\uD83C\uDF89 Proof complete! Well done!', 'success');

                            if (typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'Proof completed');

                          }

                        } else {

                          if (addToast) addToast('\u274C That rule doesn\'t apply to the selected statements.', 'warning');

                        }

                      },

                      className: "w-full p-3 rounded-xl text-left transition-all bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400 hover:shadow-sm"

                    },

                      React.createElement("div", { className: "font-bold text-violet-800 text-xs" }, rule.name),

                      React.createElement("div", { className: "text-[10px] font-mono text-slate-500 mt-0.5" }, rule.form),

                      React.createElement("div", { className: "text-[10px] text-slate-400 mt-0.5 italic" }, rule.eng)

                    );

                  })

                )

              )

            ),





            // ═══ MODE 3: CHALLENGES ═══

            mode === 'challenges' && React.createElement("div", { className: "space-y-4" },

              // Challenge type tabs

              React.createElement("div", { className: "flex gap-2 justify-center" },

                [['fallacy', '\uD83D\uDD0D', 'Fallacy Spotter'], ['quickfire', '\u23F1\uFE0F', 'Quick-Fire Tables'], ['detective', '\uD83D\uDD75\uFE0F', 'Reasoning']].map(function(ct) {

                  var active = challengeMode === ct[0];

                  return React.createElement("button", {

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

                    React.createElement("button", {

                      onClick: function() {

                        var correct = f.valid === true;

                        upd({ challengeAnswer: correct ? 'correct' : 'wrong' });

                        if (correct && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Fallacy detected');

                      },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all hover:shadow-md text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", {

                      onClick: function() {

                        var correct = f.valid === false;

                        upd({ challengeAnswer: correct ? 'correct' : 'wrong' });

                        if (correct && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Fallacy detected');

                      },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all hover:shadow-md text-sm"

                    }, "\u274C Invalid (Fallacy)")

                  ),

                  // Feedback

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, f.name + " — " + f.formal),

                    React.createElement("div", { className: "text-xs text-slate-500" }, f.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", {

                        onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiFallacy: null }); },

                        className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                      }, "Next \u2192"),

                      React.createElement("button", {

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

                    React.createElement("button", {

                      onClick: function() { var c = af.valid === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", {

                      onClick: function() { var c = af.valid === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm"

                    }, "\u274C Invalid (Fallacy)")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, af.name + " \u2014 " + af.formal),

                    React.createElement("div", { className: "text-xs text-slate-500" }, af.explain),

                    React.createElement("button", {

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

                    React.createElement("thead", null,

                      React.createElement("tr", null,

                        table.vars.map(function(v) { return React.createElement("th", { key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100" }, v); }),

                        React.createElement("th", { className: "px-4 py-2 text-white font-black text-center", style: { background: _gViolet } }, "Result?")

                      )

                    ),

                    React.createElement("tbody", null,

                      table.rows.map(function(row, ri) {

                        var ua = userAnswers[ri];

                        var showResult = ua !== undefined;

                        var isCorrect = ua === row.result;

                        return React.createElement("tr", { key: ri },

                          table.vars.map(function(v) { return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white " + (row.env[v] ? "text-emerald-600" : "text-slate-400") }, row.env[v] ? "T" : "F"); }),

                          React.createElement("td", { className: "px-4 py-2 text-center" },

                            showResult

                              ? React.createElement("span", { className: "font-black " + (isCorrect ? "text-emerald-600" : "text-red-500") }, (isCorrect ? "\u2705 " : "\u274C ") + (ua ? "T" : "F"))

                              : React.createElement("div", { className: "flex gap-1 justify-center" },

                                  React.createElement("button", {

                                    onClick: function() { var a = Object.assign({}, userAnswers); a[ri] = true; upd({ qfAnswers: a }); },

                                    className: "px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded text-xs"

                                  }, "T"),

                                  React.createElement("button", {

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

                    React.createElement("button", {

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

                  { scenario: 'Lunch options:\n1. We\u2019re having pizza OR pasta.\n2. The pizza oven is broken (so no pizza).', question: 'Are we having pasta?', answer: true, rule: 'Disjunctive Syllogism', explain: 'Pizza \u2228 Pasta, \u00ACPizza. By DS: Pasta.' }

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

                    React.createElement("button", { onClick: function() { var c = det.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { onClick: function() { var c = det.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { onClick: function() { var c = 'wrong'; upd({ challengeAnswer: c }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + det.rule),

                    React.createElement("div", { className: "text-xs text-slate-500" }, det.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiDetective: null }); }, className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all" }, "Next \u2192"),

                      React.createElement("button", {

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

                    React.createElement("button", { onClick: function() { var c = ad.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { onClick: function() { var c = ad.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { onClick: function() { upd({ challengeAnswer: 'wrong' }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + ad.rule),

                    React.createElement("div", { className: "text-xs text-slate-500" }, ad.explain),

                    React.createElement("button", {

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



            // ═══ EDUCATIONAL PANEL ═══

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", {

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

                    React.createElement("tbody", null,

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

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "Valid vs Invalid Arguments"),

                  React.createElement("p", null, "A ", React.createElement("strong", null, "valid"), " argument guarantees the conclusion IF the premises are true. An ", React.createElement("strong", null, "invalid"), " argument (fallacy) has a logical gap \u2014 even if the premises are true, the conclusion doesn't necessarily follow."),

                  React.createElement("p", { className: "mt-1 text-violet-600 font-bold" }, "Common fallacies: Affirming the Consequent (P\u2192Q, Q \u2234 P\u2717), Denying the Antecedent (P\u2192Q, \u00ACP \u2234 \u00ACQ\u2717)")

                )

              )

            ),



            // ═══ BACK BUTTON ═══

            React.createElement("div", { className: "mt-6 text-center" },

              React.createElement("button", {

                onClick: function() { setStemLabTool(null); },

                className: "px-6 py-2.5 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-all"

              }, "\u2190 Back to Tools")

            )

          );
      })();
    }
  });


  console.log('[StemLab] stem_tool_math.js loaded — 13 tools');
})();
