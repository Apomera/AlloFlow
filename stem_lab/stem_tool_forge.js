/* stem_tool_forge.js — the Tool Forge: a plugin-authoring harness for STEAM Lab /
 * SEL Hub tools, in-app and teacher-gated.
 *
 * Two doors over one backend:
 *   - Describe (AI): natural language -> a retargeted 4-agent generator
 *     (Architect/Builder/Reviewer/Fixer over ctx.callGemini) -> a CONFORMING
 *     plugin source (not a single-file HTML app — the applab generator's output
 *     is retargeted to the registerTool contract).
 *   - Code: a monospace editor seeded from a conforming skeleton.
 *
 * One validator loop (Tier-1, in-browser, advisory):
 *   - Static contract check: lazy-loads acorn UMD and runs the vendored
 *     forge_contract_core.validateSource() (the SAME manifest the Node gate uses).
 *   - Render-smoke: mounts the candidate in a SANDBOXED iframe (sandbox=
 *     "allow-scripts", NO same-origin) with React + a stub StemLab/ctx mirroring
 *     check_stem_render. createRoot mount runs effects, so it catches more than
 *     Node SSR. Crashes are caught by an error boundary + window.onerror and
 *     postMessage'd back. The opaque-origin sandbox is the author-time FERPA/key
 *     firewall: generated code can never touch parent state, keys, or storage.
 *
 * Tier-2 (Node SSR golden + check_tool_contract + check_free_vars) remains the
 * gate of record at submit/publish; this in-browser loop is the fast approximation.
 *
 * NOTE: this file VENDORS dev-tools/forge_contract_core.js verbatim between the
 * ==FORGE_CONTRACT_CORE_BEGIN/END== markers. dev-tools/check_forge_contract_sync.cjs
 * asserts the vendored copy matches the source, so the contract never drifts.
 */

// ==FORGE_CONTRACT_CORE_BEGIN== (vendored from dev-tools/forge_contract_core.js — kept in sync by dev-tools/check_forge_contract_sync.cjs; DO NOT edit here, edit the source)
/* forge_contract_core.js — the PLUGIN CONTRACT, as one portable module.
 *
 * Single source of truth for "what is a conformant STEAM Lab / SEL Hub tool":
 *   - CONTRACT: the manifest (required fields, theme colors, categories, the ctx
 *     surface the host actually injects, the quest-key rule).
 *   - validateSource(src, acornParse): a BROWSER-PORTABLE structural validator
 *     used by the Tool Forge's Tier-1 (in-browser) loop. It hand-walks an acorn
 *     AST (no eslint-scope, no fs) so it runs identically in Node and the browser.
 *
 * Consumers:
 *   - dev-tools/check_tool_contract.cjs  — the Node gate of record. Imports
 *     CONTRACT for the manifest, and layers an eslint-scope ctx-surface pass on
 *     top (precise shadow resolution that the browser cannot do).
 *   - stem_lab/stem_tool_forge.js (Tier-1) — loads acorn UMD + this file, calls
 *     validateSource() for instant author feedback before the iframe render-smoke.
 *
 * The ctx surface is the EXACT union the host injects, derived from the stub ctx
 * in dev-tools/check_stem_render.cjs + check_sel_render.cjs (those stubs mirror
 * the live host ctx). Keeping these in sync means Tier-1 (browser) and Tier-2
 * (Node SSR smoke) agree on what `ctx` provides.
 *
 * UMD: module.exports in Node, window.ForgeContract in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ForgeContract = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── the ctx surface (what the host injects into render(ctx)) ──
  // STEM + shared. Mirrors check_stem_render.cjs makeCtx() keys.
  var STEM_CTX = [
    'React', 'toolData', 'setToolData', 'update', 'updateMulti',
    'setStemLabTool', 'setStemLabTab', 'stemLabTab', 'stemLabTool',
    'toolSnapshots', 'setToolSnapshots',
    'addToast', 'awardXP', 'getXP', 'announceToSR', 'canvasNarrate',
    'setCanvasNarrateEnabled', 'celebrate', 'markQuest',
    'callGemini', 'getHint', 'aiHintsEnabled', 'aiChat',
    'sourceText', 'inputText', 'sourceTopic', 'gradeLevel', 'gradeBand',
    'gridRange', 't', 'icons', 'saveSnapshot', 'renderTutorial', 'beep',
    'callTTS', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit',
    'srOnly', 'a11yClick', 'canvasA11yDesc', 'props',
    'activeSessionCode', 'studentNickname', 'isTeacherMode',
    'isDark', 'isContrast', 'reduceMotion', 'theme', 'pal',
    'labToolData', 'setLabToolData',
    // shared tool-family state the host injects (angles / multTable / explore / coding)
    'exploreScore', 'setExploreScore', 'exploreDifficulty', 'setExploreDifficulty',
    'angleValue', 'setAngleValue', 'angleChallenge', 'setAngleChallenge',
    'angleFeedback', 'setAngleFeedback',
    'multTableAnswer', 'setMultTableAnswer', 'multTableChallenge', 'setMultTableChallenge',
    'multTableFeedback', 'setMultTableFeedback', 'multTableHidden', 'setMultTableHidden',
    'multTableHover', 'setMultTableHover', 'multTableRevealed', 'setMultTableRevealed',
    // host internals tools may read (not encouraged, but injected — so not "unknown")
    '_codingCanvasRef', '_tutGalaxy', '_renderingFlag',
  ];
  // SEL Hub adds. Mirrors check_sel_render.cjs.
  var SEL_CTX = [
    'selHubTab', 'selHubTool', 'setSelHubTool', 'setSelHubTab',
    'selectedVoice', 'studentCodename', 'onSafetyFlag', 'palette',
  ];

  var CONTRACT = {
    version: '1.0',
    // every conforming tool config MUST define these
    requiredFields: ['label', 'desc', 'color', 'category', 'icon', 'render'],
    optionalFields: ['ready', 'cleanup', 'questHooks', 'lightBackground', 'id'],
    // config.color must be one of these tailwind theme names (or a hex string)
    themeColors: [
      'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
      'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
      'purple', 'fuchsia', 'pink', 'rose', 'white', 'black',
    ],
    // config.category — advisory known-set (unknown categories warn, don't fail)
    categories: [
      'math', 'science', 'engineering', 'art', 'coding', 'general', 'data', 'physics',
      'biology', 'chemistry', 'ecology', 'astronomy', 'geology', 'technology', 'tech',
      'behavior', 'social', 'life-skills', 'health', 'safety', 'creativity', 'creative',
      'communication', 'research', 'design', 'play', 'games', 'education', 'reference',
      'literacy', 'strategy', 'explore', 'applied',
    ],
    ctxSurface: STEM_CTX.concat(SEL_CTX),
    stemCtx: STEM_CTX,
    selCtx: SEL_CTX,
    // quest state for a STEM tool lives in toolData under this key
    questKeyRule: "quest/tool state is stored at ctx.toolData['_' + id]",
    iconRule: 'icon is a single emoji string literal',
    i18nRule: "user-facing strings go through ctx.t('stem.<id>.<key>', fallback); guard typeof ctx.t === 'function'",
    renderRules: [
      'render(ctx) returns a React element (ctx.React.createElement / JSX) — never null-throws on a stub ctx',
      'all hooks (useState/useEffect/useRef/...) live INSIDE the returned component, never in render() body',
      'no side effects in render() body; state changes go through ctx.update / effects / handlers',
      'must be SSR-safe: renders on a stub ctx where callGemini/callTTS are null and setters are no-ops',
    ],
  };

  // ── browser-portable AST helpers (hand-walk; only needs acorn) ──
  function walk(node, visit) {
    if (!node || typeof node.type !== 'string') return;
    visit(node);
    for (var k in node) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'parent') continue;
      var v = node[k];
      if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { if (v[i] && typeof v[i].type === 'string') walk(v[i], visit); } }
      else if (v && typeof v.type === 'string') walk(v, visit);
    }
  }
  function objKey(p) {
    if (!p || !p.key) return null;
    if (p.key.type === 'Identifier') return p.key.name;
    if (p.key.type === 'Literal') return String(p.key.value);
    return null;
  }
  function isFn(n) { return n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'); }

  // Approximate ctx-member collection for a render(ctx) function. Browser Tier-1
  // has no eslint-scope, so: if the render body re-declares the param name (a
  // shadow such as `const ctx = canvas.getContext('2d')`), we bail and skip the
  // surface check (returns null) rather than emit false positives — the Node gate
  // (Tier-2) resolves shadows precisely.
  function collectCtxMembers(fnNode, ctxName) {
    var shadowed = false, members = Object.create(null);
    // ObjectPattern param: function render({ React, t }) {...}
    var p0 = fnNode.params && fnNode.params[0];
    if (p0 && p0.type === 'ObjectPattern') {
      for (var i = 0; i < p0.properties.length; i++) {
        var pr = p0.properties[i];
        if (pr.type === 'Property' && pr.key.type === 'Identifier') members[pr.key.name] = true;
      }
      return Object.keys(members);
    }
    if (!ctxName) return null;
    walk(fnNode.body, function (n) {
      // detect a shadow declaration of the param name inside the body
      if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && n.id.name === ctxName) shadowed = true;
      if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') && n.id && n.id.name === ctxName) shadowed = true;
      // ctx.member
      if (n.type === 'MemberExpression' && !n.computed && n.object && n.object.type === 'Identifier' &&
          n.object.name === ctxName && n.property && n.property.type === 'Identifier') {
        members[n.property.name] = true;
      }
      // const { a, b } = ctx
      if (n.type === 'VariableDeclarator' && n.init && n.init.type === 'Identifier' && n.init.name === ctxName &&
          n.id && n.id.type === 'ObjectPattern') {
        for (var j = 0; j < n.id.properties.length; j++) {
          var q = n.id.properties[j];
          if (q.type === 'Property' && q.key.type === 'Identifier') members[q.key.name] = true;
        }
      }
    });
    if (shadowed) return null;
    return Object.keys(members);
  }

  // validateSource(src, acornParse) → { ok, errors:[top-level], tools:[ per-tool ] }
  // acornParse: function(code, opts) → AST (Node: require('acorn').parse; browser: window.acorn.parse)
  function validateSource(src, acornParse) {
    var out = { ok: false, errors: [], tools: [] };
    if (typeof src !== 'string' || !src.trim()) { out.errors.push('empty source'); return out; }
    var ast;
    try {
      ast = acornParse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
    } catch (e) { out.errors.push('parse error: ' + (e && e.message || e)); return out; }

    var calls = [];
    walk(ast, function (n) {
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
          n.callee.property.type === 'Identifier' && n.callee.property.name === 'registerTool') calls.push(n);
    });
    if (!calls.length) { out.errors.push('no window.StemLab/SelHub.registerTool(id, config) call found'); return out; }

    var ctxSet = Object.create(null);
    for (var c = 0; c < CONTRACT.ctxSurface.length; c++) ctxSet[CONTRACT.ctxSurface[c]] = true;
    var colorSet = Object.create(null);
    for (var d = 0; d < CONTRACT.themeColors.length; d++) colorSet[CONTRACT.themeColors[d]] = true;

    for (var ci = 0; ci < calls.length; ci++) {
      var call = calls[ci];
      var t = { id: null, target: 'unknown', errors: [], warns: [], missing: [], ctxMembers: [], ctxUnknown: [] };
      // target chain
      var obj = call.callee.object, chain = [];
      while (obj) {
        if (obj.type === 'Identifier') { chain.push(obj.name); break; }
        if (obj.type === 'MemberExpression') { if (obj.property.type === 'Identifier') chain.push(obj.property.name); obj = obj.object; } else break;
      }
      t.target = chain.indexOf('SelHub') >= 0 ? 'sel' : (chain.indexOf('StemLab') >= 0 ? 'stem' : 'unknown');
      if (t.target === 'unknown') t.warns.push('registerTool not on window.StemLab / window.SelHub');

      var idArg = call.arguments[0];
      if (!idArg || idArg.type !== 'Literal' || typeof idArg.value !== 'string') t.errors.push('id (arg 1) must be a string literal');
      else t.id = idArg.value;

      var cfg = call.arguments[1];
      if (!cfg) { t.errors.push('config (arg 2) is missing'); out.tools.push(t); continue; }
      if (cfg.type === 'Identifier') { t.warns.push('config is a variable reference (fields not statically checked)'); out.tools.push(t); continue; }
      if (cfg.type !== 'ObjectExpression') { t.errors.push('config (arg 2) is not an object literal or variable'); out.tools.push(t); continue; }

      var props = Object.create(null), kinds = Object.create(null), hasSpread = false;
      for (var pi = 0; pi < cfg.properties.length; pi++) {
        var p = cfg.properties[pi];
        if (p.type === 'SpreadElement' || p.type === 'ExperimentalSpreadProperty') { hasSpread = true; continue; }
        if (p.type === 'Property') { var k = objKey(p); if (k) { props[k] = p.value; kinds[k] = p.kind || 'init'; } }
      }
      // spread can inject required fields the validator can't see — surface that honestly
      if (hasSpread) t.warns.push('config has spread properties (...) — fields not fully statically checked');

      for (var fi = 0; fi < CONTRACT.requiredFields.length; fi++) {
        var f = CONTRACT.requiredFields[fi];
        if (!(f in props)) { t.missing.push(f); t.warns.push('missing config.' + f); }
        else if (kinds[f] !== 'init' && f !== 'render') t.warns.push('config.' + f + ' is a getter/setter (value not statically checked)');
      }

      if (props.render) {
        if (kinds.render !== 'init') {
          // a getter/setter can return a non-function at runtime — not statically verifiable
          t.errors.push('config.render must be a plain function property, not a getter/setter');
        } else if (isFn(props.render)) {
          var p0 = props.render.params && props.render.params[0];
          if (p0 && p0.type === 'ObjectPattern' && p0.properties.some(function (pr) { return pr.type === 'RestElement' || pr.type === 'ExperimentalRestProperty'; })) {
            t.warns.push('render destructures ctx with rest (...) — ctx surface not fully validated');
          }
          var ctxName = (p0 && p0.type === 'Identifier') ? p0.name : null;
          var used = collectCtxMembers(props.render, ctxName);
          if (used === null && !(p0 && p0.type === 'ObjectPattern')) {
            // shadowed or no param — skip surface check
          } else if (used) {
            t.ctxMembers = used.slice().sort();
            t.ctxUnknown = t.ctxMembers.filter(function (m) { return !ctxSet[m]; });
            if (t.ctxUnknown.length) t.warns.push('ctx members outside host surface: ' + t.ctxUnknown.join(', '));
          }
        } else if (props.render.type === 'Identifier') {
          // a variable could hold a non-function — "conformant by construction" needs a literal
          t.errors.push('config.render must be a function literal, not a variable reference (cannot statically verify)');
        } else {
          t.errors.push('config.render is not a function');
        }
      } else {
        t.errors.push('config.render is missing');
      }

      if (props.color) {
        if (props.color.type === 'Literal' && typeof props.color.value === 'string') {
          if (!colorSet[props.color.value] && !/^#[0-9a-fA-F]{3,8}$/.test(props.color.value)) t.warns.push('color "' + props.color.value + '" is not a known theme name or hex');
        } else t.warns.push('color is not a string literal');
      }
      if (props.icon && !(props.icon.type === 'Literal' && typeof props.icon.value === 'string')) t.warns.push('icon is not a string literal');

      out.tools.push(t);
    }

    // Multi-registration is legal and shipped (stem_tool_rocks.js registers
    // rocks + rockCycle; stem_tool_geo.js registers geoQuiz + geometryProver;
    // stem_tool_fractions.js aliases one config under two ids). Tier-2
    // (check_tool_contract.cjs) already WARNS rather than errors on this, so
    // mirror it here — and say which tool the downstream steps actually use,
    // since the render-smoke and the submission metadata both take the first.
    if (out.tools.length > 1 && out.tools[0]) {
      out.tools[0].warns.push(out.tools.length + ' registerTool calls (expected 1) — only the first (' + (out.tools[0].id || '?') + ') is render-smoked and submitted');
    }

    // id uniqueness within this source
    var seen = Object.create(null);
    for (var ti = 0; ti < out.tools.length; ti++) {
      var tid = out.tools[ti].id;
      if (tid) { if (seen[tid]) out.tools[ti].warns.push('duplicate tool id "' + tid + '" in this source (alias?)'); else seen[tid] = true; }
    }

    out.ok = out.errors.length === 0 && out.tools.every(function (x) { return x.errors.length === 0; });
    return out;
  }

  return { CONTRACT: CONTRACT, validateSource: validateSource };
});
// ==FORGE_CONTRACT_CORE_END==

(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.StemLab || !window.StemLab.registerTool) return;

  var ForgeContract = window.ForgeContract;
  var CONTRACT = (ForgeContract && ForgeContract.CONTRACT) || { version: '1.0', requiredFields: [], ctxSurface: [], themeColors: [], categories: [] };

  // submission spine (the same Worker the catalog/PD/bug forms use)
  var WORKER_BASE = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev';

  // CDN assets the harness lazy-loads (Aaron-only dev tool — runtime CDN is fine)
  var ACORN_URL = 'https://cdn.jsdelivr.net/npm/acorn@8.16.0/dist/acorn.js';
  var REACT_URL = 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js';
  var REACTDOM_URL = 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js';

  // ── a minimal CONFORMING tool, seeded into the coder door + anchoring the generator ──
  var SKELETON = [
    "(function () {",
    "  'use strict';",
    "  if (!window.StemLab || !window.StemLab.registerTool) return;",
    "  window.StemLab.registerTool('myTool', {",
    "    icon: '\\uD83D\\uDD2C',",
    "    label: 'My Tool',",
    "    desc: 'One line on what students actually do here.',",
    "    color: 'emerald',",
    "    category: 'science',",
    "    questHooks: [",
    "      { id: 'first_step', label: 'Take the first step', icon: '\\u2705',",
    "        check: function (d) { return (d && d.count || 0) >= 1; },",
    "        progress: function (d) { return ((d && d.count) || 0) + '/1'; } }",
    "    ],",
    "    render: function (ctx) {",
    "      return ctx.React.createElement(MyToolApp, { ctx: ctx });",
    "    }",
    "  });",
    "",
    "  function MyToolApp(props) {",
    "    var ctx = props.ctx, React = ctx.React, h = React.createElement;",
    "    var st = React.useState((ctx.toolData && ctx.toolData.myTool && ctx.toolData.myTool.count) || 0);",
    "    var count = st[0], setCount = st[1];",
    "    var t = function (k, f) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, f) : null; } catch (e) { v = null; } return (v == null) ? (f != null ? f : k) : v; };",
    "    var dark = !!ctx.isDark;",
    "    return h('div', { style: { padding: 16, color: dark ? '#e5e7eb' : '#111827' } },",
    "      h('p', { style: { marginTop: 0 } }, t('stem.myTool.intro', 'Tap the button to begin.')),",
    "      h('button', {",
    "        onClick: function () { var n = count + 1; setCount(n); ctx.update('myTool', 'count', n); },",
    "        style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', cursor: 'pointer' }",
    "      }, t('stem.myTool.tap', 'Tap') + ' (' + count + ')')",
    "    );",
    "  }",
    "})();",
    ""
  ].join('\n');

  // ── lazy script loader (the established AlloFlow runtime-injection pattern) ──
  var _loaded = {};
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      if (_loaded[url]) return resolve();
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { _loaded[url] = true; resolve(); };
      s.onerror = function () { reject(new Error('failed to load ' + url)); };
      document.head.appendChild(s);
    });
  }
  function ensureAcorn() {
    if (window.acorn) return Promise.resolve();
    return loadScript(ACORN_URL);
  }

  function cleanCode(s) {
    if (typeof s !== 'string') s = String(s == null ? '' : s);
    var m = s.match(/```(?:js|javascript)?\s*([\s\S]*?)```/i);
    if (m) return m[1].trim();
    return s.trim();
  }

  // Pull the metadata field VALUES (id/label/desc/category/color/icon/target) out of
  // the first registerTool config — needed for the submission payload. Browser-only
  // (uses window.acorn, already loaded for the validator).
  function extractMeta(src) {
    var meta = { id: '', target: 'stem', label: '', desc: '', category: '', color: '', icon: '' };
    if (!window.acorn) return meta;
    var ast;
    try { ast = window.acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch (e) { return meta; }
    var call = null;
    (function walk(n) {
      if (!n || typeof n.type !== 'string' || call) return;
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property && n.callee.property.name === 'registerTool') { call = n; return; }
      for (var k in n) { if (k === 'parent' || k === 'loc' || k === 'range') continue; var v = n[k]; if (Array.isArray(v)) v.forEach(function (c) { if (c && typeof c.type === 'string') walk(c); }); else if (v && typeof v.type === 'string') walk(v); }
    })(ast);
    if (!call) return meta;
    var obj = call.callee.object, chain = [];
    while (obj) { if (obj.type === 'Identifier') { chain.push(obj.name); break; } if (obj.type === 'MemberExpression') { if (obj.property && obj.property.name) chain.push(obj.property.name); obj = obj.object; } else break; }
    meta.target = chain.indexOf('SelHub') >= 0 ? 'sel' : 'stem';
    var idArg = call.arguments[0];
    if (idArg && idArg.type === 'Literal' && typeof idArg.value === 'string') meta.id = idArg.value;
    var cfg = call.arguments[1];
    if (cfg && cfg.type === 'ObjectExpression') {
      cfg.properties.forEach(function (p) {
        if (p.type !== 'Property') return;
        var key = p.key && (p.key.name || p.key.value);
        if (['label', 'desc', 'category', 'color', 'icon'].indexOf(key) >= 0 && p.value.type === 'Literal' && typeof p.value.value === 'string') meta[key] = p.value.value;
      });
    }
    return meta;
  }

  var AFFIRMATIONS = [
    { key: 'author_or_authorized', label: 'I am the author or am authorized to submit this tool.' },
    { key: 'accuracy_attested', label: 'Its academic content is accurate to the best of my knowledge.' },
    { key: 'no_pii', label: 'It contains no student PII or confidential data.' },
    { key: 'passes_validation', label: 'It passes the contract validator and renders in the preview.' },
    { key: 'license_agreed', label: 'I agree to release it under the selected license.' },
    { key: 'age_eligible', label: 'I am 18+ or submitting on behalf of an institution.' }
  ];
  var LICENSES = ['CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'MIT', 'Apache-2.0'];

  // ── the contract, as a compact prompt block for the generator ──
  function contractPrompt() {
    var c = CONTRACT;
    return [
      'You are authoring a single self-registering AlloFlow STEM/SEL plugin file.',
      'OUTPUT EXACTLY ONE JavaScript file, no markdown prose. Hard contract:',
      '1. Wrap everything in an IIFE that bails if the host is missing:',
      "   (function(){ 'use strict'; if(!window.StemLab||!window.StemLab.registerTool) return; ... })();",
      "2. Call window.StemLab.registerTool('<camelCaseId>', config) EXACTLY ONCE (use window.SelHub for an SEL tool).",
      '3. config MUST define: ' + (c.requiredFields || []).join(', ') + '.',
      '   - icon: a single emoji string.  - color: one of: ' + (c.themeColors || []).slice(0, 24).join(', ') + '.',
      '   - category: one of: ' + (c.categories || []).join(', ') + '.',
      '4. render: function(ctx){ return ctx.React.createElement(App, { ctx: ctx }); } where App is a',
      '   module-scope function component. ALL hooks (useState/useEffect/useRef) live INSIDE App, NEVER in render().',
      '5. PURITY/SSR: render must not throw on a stub ctx (callGemini/callTTS may be null; setters are no-ops).',
      '   Read initial state defensively from ctx.toolData; persist with ctx.update(toolId, key, value).',
      '6. i18n: user-facing strings via t = function(k,f){ return (typeof ctx.t===\"function\")?ctx.t(k,f):f; }',
      "   with keys 'stem.<id>.<slug>'.  THEME: honor ctx.isDark / ctx.isContrast; never hardcode dark colors.",
      '7. ctx is the ONLY injection surface. You may ONLY read these ctx members: ' + (c.ctxSurface || []).join(', ') + '.',
      '8. Quest/tool state convention: ctx.toolData[toolId]; optional questHooks: [{id,label,icon,check(d),progress(d)}].',
      'Accessibility: semantic elements, aria-labels on icon-only controls, 4.5:1 contrast, keyboard reachable.'
    ].join('\n');
  }

  // ── the sandboxed render-smoke document ──
  // Two layers contain the untrusted candidate: (1) sandbox="allow-scripts" with NO
  // allow-same-origin gives the iframe an opaque origin, so candidate code cannot read
  // the parent window, its keys (callGemini), storage, or cookies. (2) the CSP below
  // sets connect-src 'none', which blocks fetch/XHR/WebSocket/sendBeacon — so candidate
  // code cannot exfiltrate over the network either (sandbox alone does NOT block egress).
  // script-src is pinned to jsDelivr (for React) + inline (the harness). Together these
  // are the author-time data/key firewall. Tier-2 (Node) remains the gate of record.
  // theme = { isDark, isContrast } from the host. The stub ctx used to hardcode
  // isDark:false / isContrast:false and the body was always white, so the
  // preview could never show a tool in the theme it was being authored for —
  // even though the contract REQUIRES candidates to honor both flags. Passing
  // the real theme through is what makes the preview able to check that rule.
  function buildSmokeDoc(src, theme) {
    var th = theme || {};
    var tDark = !!th.isDark, tHc = !!th.isContrast;
    var pageBg = tHc ? '#000000' : (tDark ? '#0f172a' : '#ffffff');
    var pageFg = tHc ? '#ffff00' : (tDark ? '#e5e7eb' : '#111111');
    var fatalFg = tHc ? '#ffff00' : (tDark ? '#fca5a5' : '#b91c1c');
    var fatalBg = tHc ? '#000000' : (tDark ? '#450a0a' : '#fef2f2');
    var fatalBd = tHc ? '#ffff00' : (tDark ? '#7f1d1d' : '#fecaca');
    var themeName = tHc ? 'contrast' : (tDark ? 'dark' : 'default');
    // Neutralize a literal "</script" so the candidate cannot close the harness <script>.
    // "<\/script" is NOT recognized as an end tag by the HTML parser (the byte after "<"
    // is "\", not "/"), and "<\/" is a valid escaped "/" inside JS strings/regex/comments
    // — the only places "</script" can legally appear in conforming JS. (Verified: an
    // injected </script><img onerror> does NOT execute. We deliberately do NOT entity-
    // escape "<"/">", which would corrupt valid code like `for(i=0;i<n;i++)`.)
    var safe = String(src == null ? '' : src).replace(/<\/(script)/gi, '<\\/$1');
    var CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; "
      + "style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
    var head = [
      '<!doctype html><html><head><meta charset="utf-8">',
      '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">',
      '<style>html,body{margin:0}body{font:14px system-ui,-apple-system,sans-serif;padding:12px;background:' + pageBg + ';color:' + pageFg + '}',
      '#root{min-height:40px}.forge-fatal{color:' + fatalFg + ';font:12px ui-monospace,SFMono-Regular,Menlo,monospace;',
      'white-space:pre-wrap;padding:10px;background:' + fatalBg + ';border:1px solid ' + fatalBd + ';border-radius:8px}</style></head>',
      '<body><div id="root"></div>',
      '<script crossorigin src="' + REACT_URL + '"></sc' + 'ript>',
      '<script crossorigin src="' + REACTDOM_URL + '"></sc' + 'ript>'
    ].join('\n');

    var setup = [
      '<script>(function(){',
      '  function send(m){ try{ m.__forge=1; parent.postMessage(m,"*"); }catch(e){} }',
      '  window.__forgeSend = send;',
      '  window.onerror = function(msg,s,l,c,err){ send({type:"smoke",ok:false,error:String((err&&err.stack)||msg)}); return true; };',
      '  window.addEventListener("unhandledrejection", function(e){ send({type:"smoke",ok:false,error:"unhandled rejection: "+String((e.reason&&e.reason.stack)||e.reason)}); });',
      '  var noop=function(){}; var stub=function(){return null;};',
      '  var icons=new Proxy({},{get:function(){return stub;}});',
      '  var pal=new Proxy({},{get:function(){return "#888888";}});',
      '  var REG={};',
      '  window.StemLab={ registerTool:function(id,cfg){REG[id]=cfg;}, renderTool:function(id,ctx){return REG[id].render(ctx);}, getRegisteredTools:function(){return Object.keys(REG);}, _reg:REG };',
      '  window.SelHub=window.StemLab;',
      '  window.__makeCtx=function(){ var base={',
      '    React:window.React, toolData:{}, setToolData:noop, update:noop, updateMulti:noop,',
      '    setStemLabTool:noop, setStemLabTab:noop, stemLabTab:"", stemLabTool:"",',
      '    toolSnapshots:[], setToolSnapshots:noop, addToast:noop, awardXP:noop, getXP:function(){return 0;},',
      '    announceToSR:noop, canvasNarrate:noop, setCanvasNarrateEnabled:noop, celebrate:noop, markQuest:noop,',
      '    callGemini:null, getHint:noop, aiHintsEnabled:false, aiChat:null,',
      '    sourceText:"", inputText:"", sourceTopic:"", gradeLevel:"5th Grade", gradeBand:"g68",',
      '    gridRange:{min:-10,max:10}, t:function(k,f){return (f!=null)?f:k;}, icons:icons,',
      '    saveSnapshot:noop, renderTutorial:function(){return null;}, beep:noop,',
      '    callTTS:null, callImagen:null, callGeminiVision:null, callGeminiImageEdit:null,',
      '    srOnly:function(x){return window.React.createElement("span",{className:"sr-only"},x);},',
      // Must include onKeyDown. This ctx is what a standalone EXPORT runs against, so
      // without it every a11yClick control in an exported tool is "announced but
      // dead": role=button + tabIndex make a screen reader offer it and let it take
      // focus, and only a NATIVE <button> turns Enter/Space into a click — a div or
      // <g> does not. The tool would be accessible inside the app and silently
      // keyboard-inert once exported. Kept identical to the host's a11yClick in
      // stem_lab_module.js.
      '    a11yClick:function(hh){return {onClick:hh,onKeyDown:function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();hh(e);}},role:"button",tabIndex:0};},',
      '    canvasA11yDesc:function(dd){return {role:"img","aria-label":dd};}, props:{},',
      '    activeSessionCode:null, studentNickname:null, isTeacherMode:true,',
      '    isDark:' + tDark + ', isContrast:' + tHc + ', reduceMotion:false, theme:"' + themeName + '", pal:pal,',
      '    labToolData:{}, setLabToolData:noop, selectedVoice:null, studentCodename:null, onSafetyFlag:noop,',
      '    selHubTab:"", selHubTool:"", setSelHubTool:noop, setSelHubTab:noop };',
      '    return new Proxy(base,{get:function(o,p){return (p in o)?o[p]:noop;}});',
      '  };',
      '})();</sc' + 'ript>'
    ].join('\n');

    var candidate = '<script>\n' + safe + '\n</sc' + 'ript>';

    var run = [
      '<script>(function(){',
      '  var send=window.__forgeSend;',
      '  try {',
      '    var ids = window.StemLab.getRegisteredTools();',
      '    if(!ids.length){ send({type:"smoke",ok:false,error:"no tool registered — registerTool was not called (check the IIFE host guard / syntax)"}); return; }',
      '    var ctx = window.__makeCtx();',
      '    var React=window.React, ReactDOM=window.ReactDOM;',
      '    function EB(p){ React.Component.call(this,p); this.state={err:null}; }',
      '    EB.prototype=Object.create(React.Component.prototype);',
      '    EB.prototype.constructor=EB;',
      '    EB.prototype.componentDidCatch=function(err){ send({type:"smoke",ok:false,error:String((err&&err.stack)||err)}); this.setState({err:err}); };',
      '    EB.prototype.render=function(){ if(this.state.err) return React.createElement("div",{className:"forge-fatal"}, "Render crashed:\\n"+String((this.state.err&&this.state.err.message)||this.state.err)); return this.props.children; };',
      '    var toolEl = React.createElement(function ForgeSmoke(){ return window.StemLab.renderTool(ids[0], ctx); });',
      '    var root = ReactDOM.createRoot(document.getElementById("root"));',
      '    root.render(React.createElement(EB, null, toolEl));',
      '    setTimeout(function(){ send({type:"smoke", ok:true, ids:ids, target:"unknown"}); }, 1200);',
      '  } catch(e){ send({type:"smoke", ok:false, error:String((e&&e.stack)||e)}); }',
      '})();</sc' + 'ript>'
    ].join('\n');

    return head + '\n' + setup + '\n' + candidate + '\n' + run + '\n</body></html>';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('forge', {
    icon: '🛠️',
    label: 'Tool Forge',
    desc: 'Author, validate, and preview new STEAM Lab / SEL Hub plugins — describe one in plain language (AI builds a conforming plugin) or hand-code against the contract, with a live in-sandbox render-smoke and the same contract gate the deploy pipeline runs. Teacher / developer tool.',
    color: 'indigo',
    category: 'coding',
    render: function (ctx) {
      return ctx.React.createElement(ForgeApp, { ctx: ctx });
    }
  });

  function ForgeApp(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;

    var dark = !!ctx.isDark, hc = !!ctx.isContrast;
    // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
    var t = function (k, f) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, f) : null; } catch (e) { v = null; } return (v == null) ? (f != null ? f : k) : v; };

    var seed = (ctx.toolData && ctx.toolData.forge && ctx.toolData.forge.src) || SKELETON;
    var s_door = useState('code'); var door = s_door[0], setDoor = s_door[1];
    var s_src = useState(seed); var src = s_src[0], setSrc = s_src[1];
    var s_desc = useState(''); var desc = s_desc[0], setDesc = s_desc[1];
    var s_target = useState('stem'); var target = s_target[0], setTarget = s_target[1];
    var s_busy = useState(false); var busy = s_busy[0], setBusy = s_busy[1];
    var s_phase = useState(''); var phase = s_phase[0], setPhase = s_phase[1];
    var s_report = useState(null); var report = s_report[0], setReport = s_report[1];
    var s_smoke = useState(null); var smoke = s_smoke[0], setSmoke = s_smoke[1];
    var s_doc = useState(''); var smokeDoc = s_doc[0], setSmokeDoc = s_doc[1];
    var s_acorn = useState(false); var acornReady = s_acorn[0], setAcornReady = s_acorn[1];
    var s_aff = useState({}); var affirm = s_aff[0], setAffirm = s_aff[1];
    var s_author = useState(ctx.studentNickname || ''); var author = s_author[0], setAuthor = s_author[1];
    var s_license = useState('CC-BY-SA-4.0'); var license = s_license[0], setLicense = s_license[1];
    var s_submitting = useState(false); var submitting = s_submitting[0], setSubmitting = s_submitting[1];

    var iframeRef = useRef(null);
    var cancelRef = useRef(false);

    // lazy-load acorn for the static contract check
    useEffect(function () {
      var alive = true;
      ensureAcorn().then(function () { if (alive) setAcornReady(true); }).catch(function () {});
      return function () { alive = false; };
    }, []);

    // listen for render-smoke results from the sandbox
    useEffect(function () {
      function onMsg(e) {
        var d = e && e.data;
        if (!d || !d.__forge || d.type !== 'smoke') return;
        // only trust our own sandbox iframe — reject forged results from other frames/extensions
        var fr = iframeRef.current;
        if (fr && fr.contentWindow && e.source !== fr.contentWindow) return;
        // cap the error string so a hostile candidate cannot DoS the parent UI with a huge payload
        var err = (d.error == null) ? null : String(d.error).slice(0, 10000);
        setSmoke({ ok: !!d.ok, error: err, ids: Array.isArray(d.ids) ? d.ids.slice(0, 50) : [] });
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    var runStatic = useCallback(function (code) {
      if (!window.acorn || !ForgeContract) { setReport(null); return; }
      try { setReport(ForgeContract.validateSource(code, window.acorn.parse)); }
      catch (err) { setReport({ ok: false, errors: ['validator error: ' + (err && err.message || err)], tools: [] }); }
    }, []);

    // debounced static validation as the source changes
    useEffect(function () {
      if (!acornReady) return;
      var id = setTimeout(function () { runStatic(src); }, 400);
      return function () { clearTimeout(id); };
    }, [src, acornReady, runStatic]);

    // A render-smoke result belongs to the exact source it ran against. Without
    // this, editing after a green preview left smoke.ok true, so the submit gate
    // (and the render_smoke:true it puts in the payload) vouched for code that
    // was never rendered — while the affirmation checkbox says it was.
    var smokeSrcRef = useRef(null);
    useEffect(function () {
      if (smokeSrcRef.current === null || smokeSrcRef.current === src) return;
      setSmoke(null);
      setSmokeDoc('');
      smokeSrcRef.current = null;
    }, [src]);

    // The Code door is the DEFAULT door, and its source was never persisted:
    // ctx.update('forge','src') only ran on the AI path's success branch, while
    // the editor seeds from ctx.toolData.forge.src — so hand-authored work
    // looked saved and was silently lost on navigate-away. Debounced so a
    // keystroke does not write on every character.
    var seededRef = useRef(false);
    useEffect(function () {
      if (!seededRef.current) { seededRef.current = true; return; }  // skip the initial seed
      if (!ctx.update) return;
      var id = setTimeout(function () { ctx.update('forge', 'src', src); }, 600);
      return function () { clearTimeout(id); };
    }, [src, ctx]);

    useEffect(function () {
      if (!smokeSrcRef.current) return;
      setSmokeDoc(buildSmokeDoc(smokeSrcRef.current, { isDark: dark, isContrast: hc }));
    }, [dark, hc]);

    var runPreview = useCallback(function () {
      setSmoke(null);
      runStatic(src);
      // Remember WHICH source this smoke run covers, so the effect above can
      // invalidate the result the moment the source moves off it.
      smokeSrcRef.current = src;
      setSmokeDoc(buildSmokeDoc(src, { isDark: dark, isContrast: hc }));
    }, [src, runStatic, dark, hc]);

    // Model context budget. Every destructive round-trip used to slice the
    // source and then replace the WHOLE draft with the reply, so a plugin over
    // the slice was amputated — and then persisted. Refuse instead of truncate.
    var MAX_MODEL_CHARS = 60000;
    var MAX_REVIEW_CHARS = 40000;

    var generate = useCallback(function () {
      var cg = ctx.callGemini;
      if (typeof cg !== 'function') { ctx.addToast && ctx.addToast(t('stem.forge.no_ai', 'AI is not available here.'), 'error'); return; }
      if (!desc.trim()) { ctx.addToast && ctx.addToast(t('stem.forge.need_desc', 'Describe the tool first.'), 'info'); return; }
      cancelRef.current = false;
      setBusy(true); setSmoke(null);
      var hub = target === 'sel' ? 'window.SelHub' : 'window.StemLab';
      var grade = ctx.gradeLevel || 'middle school';
      var cp = contractPrompt();
      // Whatever is in the editor right now, so a failed run can restore it.
      var prevSrc = src;

      function stage(id, label) {
        setPhase(id);
        ctx.announceToSR && ctx.announceToSR(label);
      }
      function cancelled() { return cancelRef.current; }

      (function () {
        var plan = null, source = '', issues = [];
        stage('architect', t('stem.forge.sr_architect', 'Architect: planning the tool'));
        var archPrompt = 'Plan an AlloFlow ' + (target === 'sel' ? 'SEL Hub' : 'STEAM Lab') + ' plugin for this request:\n"' + desc.replace(/"/g, "'") + '"\nGrade level: ' + grade + '.\nReturn ONLY JSON: {"id":"camelCaseId","label":"...","desc":"...","icon":"single emoji","color":"theme name","category":"...","concept":"the core concept students explore","interactions":["the 2-4 concrete things the student does"],"stateShape":"the fields kept in toolData"}';
        Promise.resolve(cg(archPrompt, true)).then(function (p) {
          if (cancelled()) throw new Error('__forge_cancelled__');
          plan = p && typeof p === 'object' ? p : null;
          stage('builder', t('stem.forge.sr_builder', 'Builder: writing the plugin'));
          var planStr = plan ? JSON.stringify(plan) : '(no plan — infer a sensible one)';
          var buildPrompt = cp + '\n\nUse ' + hub + '.registerTool. PLAN:\n' + planStr + '\n\nUser request: "' + desc.replace(/"/g, "'") + '"\nGrade: ' + grade + '.\nReturn the COMPLETE plugin .js file only.';
          return cg(buildPrompt, false);
        }).then(function (code) {
          if (cancelled()) throw new Error('__forge_cancelled__');
          var built = cleanCode(code);
          // An empty/near-empty build used to be written straight into the
          // editor (and persisted), wiping whatever the author already had.
          if (!built || built.length < 40) throw new Error('the builder returned no usable code');
          source = built;
          setSrc(source);
          stage('reviewer', t('stem.forge.sr_reviewer', 'Reviewer: checking against the contract'));
          var reviewSrc = source.length > MAX_REVIEW_CHARS ? source.substring(0, MAX_REVIEW_CHARS) : source;
          var reviewPrompt = 'Review this AlloFlow plugin against the contract. Find: contract violations (missing required fields, hooks in render() body, throwing on stub ctx, ctx members outside the allowed surface), accessibility gaps, and bugs.\n\nCONTRACT SUMMARY:\n' + cp + '\n\nCODE:\n```js\n' + reviewSrc + '\n```\n\nReturn ONLY a JSON array: [{"severity":"error|warning","description":"...","fix":"..."}]. If perfect, return [].';
          return cg(reviewPrompt, true);
        }).then(function (rev) {
          if (cancelled()) throw new Error('__forge_cancelled__');
          issues = Array.isArray(rev) ? rev : (rev && Array.isArray(rev.issues) ? rev.issues : []);
          if (!issues.length) return source;
          if (source.length > MAX_MODEL_CHARS) {
            // Sending a slice and keeping the reply would delete the tail.
            ctx.addToast && ctx.addToast(t('stem.forge.too_large_to_fix', 'Draft is too large to auto-fix without truncating it — the reviewer notes are listed, fix them by hand.'), 'info');
            return source;
          }
          stage('fixer', t('stem.forge.sr_fixer', 'Fixer: applying the review notes'));
          var fixList = issues.map(function (x, i) { return (i + 1) + '. [' + (x.severity || 'issue') + '] ' + (x.description || '') + ' -> ' + (x.fix || ''); }).join('\n');
          var fixPrompt = 'Apply these fixes to the plugin. Keep it a single conforming file that still satisfies the contract.\n\nISSUES:\n' + fixList + '\n\nCODE:\n```js\n' + source + '\n```\n\nReturn the COMPLETE fixed plugin .js file only.';
          return cg(fixPrompt, false).then(function (fx) {
            var fixed = cleanCode(fx);
            // A reply that lost most of the file is a truncated generation;
            // keeping the reviewed draft beats "fixing" it into a stub.
            if (fixed && fixed.length > source.length * 0.5) return fixed;
            ctx.addToast && ctx.addToast(t('stem.forge.fix_incomplete', 'The fixer returned an incomplete file — kept the reviewed draft instead.'), 'info');
            return source;
          });
        }).then(function (finalSrc) {
          if (cancelled()) throw new Error('__forge_cancelled__');
          source = finalSrc || source;
          setSrc(source);
          setDoor('code');
          setPhase('');
          setBusy(false);
          ctx.update && ctx.update('forge', 'src', source);
          runStatic(source);
          smokeSrcRef.current = source;
          setSmokeDoc(buildSmokeDoc(source, { isDark: dark, isContrast: hc }));
          ctx.addToast && ctx.addToast(t('stem.forge.generated', 'Draft generated — review the validator + preview.'), 'success');
          ctx.announceToSR && ctx.announceToSR('Plugin draft generated.');
        }).catch(function (err) {
          setBusy(false); setPhase('');
          if (err && err.message === '__forge_cancelled__') {
            // Put back exactly what the author had before the run started.
            setSrc(prevSrc);
            ctx.addToast && ctx.addToast(t('stem.forge.gen_cancelled', 'Generation cancelled.'), 'info');
            ctx.announceToSR && ctx.announceToSR('Generation cancelled.');
            return;
          }
          setSrc(prevSrc);
          ctx.addToast && ctx.addToast(t('stem.forge.gen_failed', 'Generation failed: ') + (err && err.message || err), 'error');
          ctx.announceToSR && ctx.announceToSR('Generation failed.');
        });
      })();
    }, [ctx, desc, target, t, runStatic, src, dark, hc]);

    var allAffirmed = AFFIRMATIONS.every(function (a) { return affirm[a.key] === true; });
    // smokeSrcRef pins the result to the source it covered; the [src] effect
    // clears the smoke result on edit, and this makes the dependency explicit.
    var smokeCurrent = !!(smoke && smoke.ok && smokeSrcRef.current === src);
    var canSubmit = !!(report && report.ok && smokeCurrent && allAffirmed && !submitting && window.acorn);

    var submitPlugin = useCallback(function () {
      // `report` trails the source by a 400ms debounce, and the smoke result is
      // only as current as the last preview. Re-validate the EXACT bytes being
      // submitted before vouching for them in the payload.
      var live = null;
      if (window.acorn && ForgeContract) {
        try { live = ForgeContract.validateSource(src, window.acorn.parse); }
        catch (err) { live = { ok: false, errors: ['validator error: ' + (err && err.message || err)], tools: [] }; }
        setReport(live);
      }
      if (!live || !live.ok) { ctx.addToast && ctx.addToast(t('stem.forge.fix_first', 'Fix the structural problems before submitting.'), 'error'); return; }
      if (!smoke || !smoke.ok || smokeSrcRef.current !== src) {
        ctx.addToast && ctx.addToast(t('stem.forge.preview_stale', 'Run “Validate + preview” on the current source — it must render without crashing.'), 'error');
        return;
      }
      var meta = extractMeta(src);
      if (!meta.id) { ctx.addToast && ctx.addToast(t('stem.forge.no_id', 'Could not read the tool id from the source.'), 'error'); return; }
      setSubmitting(true);
      var payload = {
        plugin: { id: meta.id, label: meta.label || meta.id, desc: meta.desc, target: meta.target, category: meta.category, color: meta.color, icon: meta.icon, source: src },
        metadata: { author: (author || '').slice(0, 80), license: license },
        validator_report: { tier1: live, render_smoke: { ok: true } },
        affirmations: AFFIRMATIONS.reduce(function (o, a) { o[a.key] = affirm[a.key] === true; return o; }, {})
      };
      fetch(WORKER_BASE + '/submitPlugin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (o) {
          setSubmitting(false);
          if (o.status === 201 && o.j && o.j.ok) {
            ctx.addToast && ctx.addToast(t('stem.forge.submitted', 'Submitted for maintainer review ✓'), 'success');
            ctx.announceToSR && ctx.announceToSR('Plugin submitted for review.');
            setAffirm({});
          } else {
            ctx.addToast && ctx.addToast(t('stem.forge.submit_failed', 'Submit failed: ') + ((o.j && o.j.error) || ('HTTP ' + o.status)), 'error');
          }
        })
        .catch(function (e) { setSubmitting(false); ctx.addToast && ctx.addToast(t('stem.forge.submit_failed', 'Submit failed: ') + (e && e.message || e), 'error'); });
    }, [ctx, report, smoke, src, author, license, affirm, t]);

    // ── styling helpers ──
    // High-contrast previously reached exactly one property (border). The rest
    // of the chrome stayed mid-slate, so .theme-contrast users got a normal
    // low-contrast panel with one black outline — while this is the tool that
    // instructs generated plugins to "honor ctx.isDark / ctx.isContrast".
    // Palette mirrors the host's .theme-contrast block (AlloFlowANTI /
    // App.jsx): black surfaces, yellow text + borders, green on black for
    // controls. Pure binary — no soft variants, same as the host.
    var HC_BG = '#000000', HC_FG = '#ffff00', HC_BTN = '#00ff00';
    var fg = hc ? HC_FG : (dark ? '#e5e7eb' : '#0f172a');
    var sub = hc ? HC_FG : (dark ? '#94a3b8' : '#475569');
    var panelBg = hc ? HC_BG : (dark ? '#0f172a' : '#ffffff');
    var editorBg = hc ? HC_BG : (dark ? '#0b1220' : '#f8fafc');
    var border = hc ? HC_FG : (dark ? '#1e293b' : '#e2e8f0');
    // In high contrast the ✔/✖ glyph and the wording carry the verdict; the
    // host palette deliberately has no green/amber/red tier to borrow.
    var okFg   = hc ? HC_FG : (dark ? '#4ade80' : '#15803d');
    var errFg  = hc ? HC_FG : (dark ? '#f87171' : '#b91c1c');
    var warnFg = hc ? HC_FG : (dark ? '#fbbf24' : '#92400e');
    var accent = '#4f46e5';
    function btn(primary) {
      if (hc) {
        return { padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
          border: '2px solid ' + HC_BTN, background: HC_BG, color: HC_BTN };
      }
      return { padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
        border: '1px solid ' + (primary ? accent : border), background: primary ? accent : (dark ? '#1e293b' : '#f8fafc'), color: primary ? '#fff' : fg };
    }
    function tab(active) {
      return { padding: '8px 16px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        border: (hc ? '2px solid ' : '1px solid ') + border,
        borderBottom: active ? '1px solid ' + panelBg : (hc ? '2px solid ' : '1px solid ') + border,
        background: hc ? HC_BG : (active ? panelBg : (dark ? '#0b1220' : '#f1f5f9')),
        color: hc ? (active ? HC_BTN : HC_FG) : (active ? fg : sub), marginRight: 4 };
    }
    // Verdict banners: tinted in the normal themes, plain black/yellow in HC.
    function verdictBox(ok) {
      if (hc) return { border: '2px solid ' + HC_FG, background: HC_BG };
      return { border: '1px solid ' + (ok ? '#86efac' : '#fecaca'), background: ok ? (dark ? '#052e16' : '#f0fdf4') : (dark ? '#450a0a' : '#fef2f2') };
    }

    if (!ctx.isTeacherMode) {
      return h('div', { style: { padding: 24, color: fg, maxWidth: 640 } },
        h('h2', { style: { marginTop: 0 } }, '🛠️ ' + t('stem.forge.label', 'Tool Forge')),
        h('p', { style: { color: sub, lineHeight: 1.6 } },
          t('stem.forge.teacher_only', 'The Tool Forge is a teacher / developer workspace for authoring new STEAM Lab and SEL Hub tools. Switch on Teacher Mode to open it.'))
      );
    }

    // pipeline phase chips
    var PHASES = [
      { id: 'architect', label: t('stem.forge.architect', 'Architect') },
      { id: 'builder', label: t('stem.forge.builder', 'Builder') },
      { id: 'reviewer', label: t('stem.forge.reviewer', 'Reviewer') },
      { id: 'fixer', label: t('stem.forge.fixer', 'Fixer') }
    ];

    var errs = report ? (report.errors || []).concat((report.tools || []).reduce(function (a, x) { return a.concat((x.errors || []).map(function (e) { return (x.id || '?') + ': ' + e; })); }, [])) : [];
    var warns = report ? (report.tools || []).reduce(function (a, x) { return a.concat((x.warns || []).map(function (w) { return (x.id || '?') + ': ' + w; })); }, []) : [];
    var structOk = report && report.ok;

    return h('div', { style: { color: fg, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 480 } },
      // header
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' } },
        h('h2', { style: { margin: 0, fontSize: 20 } }, '🛠️ ' + t('stem.forge.label', 'Tool Forge')),
        h('span', { style: { color: sub, fontSize: 12 } }, 'contract v' + (CONTRACT.version || '1.0') + ' · ' + (acornReady ? t('stem.forge.gate_live', 'gate live') : t('stem.forge.gate_loading', 'loading validator…')))
      ),

      // doors
      h('div', { style: { display: 'flex', borderBottom: '1px solid ' + border } },
        h('button', { onClick: function () { setDoor('ai'); }, style: tab(door === 'ai'), 'aria-pressed': door === 'ai' }, '🤖 ' + t('stem.forge.door_ai', 'Describe (AI)')),
        h('button', { onClick: function () { setDoor('code'); }, style: tab(door === 'code'), 'aria-pressed': door === 'code' }, '⌨️ ' + t('stem.forge.door_code', 'Code'))
      ),

      // body: two columns
      h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' } },

        // LEFT — the active door
        h('div', { style: { flex: '1 1 420px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 } },
          door === 'ai'
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                h('label', { style: { fontSize: 13, fontWeight: 600 } }, t('stem.forge.describe', 'Describe the tool you want')),
                h('textarea', {
                  value: desc, onChange: function (e) { setDesc(e.target.value); }, rows: 5,
                  'aria-label': t('stem.forge.describe', 'Describe the tool you want'),
                  placeholder: t('stem.forge.placeholder', 'e.g. A lab where students drag charges around and see the electric field lines update live, with a quest to build a dipole.'),
                  style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid ' + border, background: panelBg, color: fg, font: '14px system-ui', resize: 'vertical' }
                }),
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                  h('label', { style: { fontSize: 13 } }, t('stem.forge.target', 'Target') + ':'),
                  h('select', { value: target, onChange: function (e) { setTarget(e.target.value); }, 'aria-label': t('stem.forge.target', 'Target'), style: { padding: '6px 8px', borderRadius: 6, border: '1px solid ' + border, background: panelBg, color: fg } },
                    h('option', { value: 'stem' }, 'STEAM Lab'),
                    h('option', { value: 'sel' }, 'SEL Hub')),
                  h('button', { onClick: generate, disabled: busy, 'aria-busy': busy, style: btn(true) }, busy ? t('stem.forge.working', 'Working…') : t('stem.forge.generate', 'Generate plugin')),
                  // Four sequential model calls with no way out until now.
                  busy ? h('button', {
                    onClick: function () { cancelRef.current = true; ctx.announceToSR && ctx.announceToSR('Cancelling after the current step.'); },
                    style: btn(false),
                    'aria-label': t('stem.forge.cancel', 'Cancel generation')
                  }, '✕ ' + t('stem.forge.cancel_short', 'Cancel')) : null
                ),
                // Phase chips mirror what stage() already sends to
                // ctx.announceToSR, so they are decorative to a screen reader.
                busy ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }, 'aria-hidden': true },
                  PHASES.map(function (p) {
                    var active = phase === p.id;
                    return h('span', { key: p.id, style: { fontSize: 12, padding: '3px 8px', borderRadius: 999, border: '1px solid ' + border, background: active ? accent : 'transparent', color: active ? '#fff' : sub } }, p.label);
                  })
                ) : null,
                h('p', { style: { fontSize: 12, color: sub, lineHeight: 1.5 } }, t('stem.forge.ai_note', 'The generator drafts a conforming plugin, then self-reviews and fixes against the contract. Always review the validator and the live preview before submitting.'))
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, height: '100%' } },
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                  h('label', { style: { fontSize: 13, fontWeight: 600 } }, t('stem.forge.source', 'Plugin source')),
                  h('button', { onClick: function () { setSrc(SKELETON); }, style: btn(false) }, t('stem.forge.skeleton', 'Reset to skeleton'))
                ),
                h('textarea', {
                  value: src, onChange: function (e) { setSrc(e.target.value); }, spellCheck: false,
                  'aria-label': t('stem.forge.source', 'Plugin source'),
                  style: { width: '100%', boxSizing: 'border-box', minHeight: 360, padding: 10, borderRadius: 8, border: '1px solid ' + border, background: editorBg, color: fg, font: '12.5px ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.5, whiteSpace: 'pre', overflowWrap: 'normal', resize: 'vertical' }
                })
              )
        ),

        // RIGHT — validator + preview
        h('div', { style: { flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 } },
          // validator
          h('div', { role: 'status', 'aria-live': 'polite', style: { border: '1px solid ' + border, borderRadius: 10, padding: 10, background: panelBg } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
              h('strong', { style: { fontSize: 13 } }, t('stem.forge.validator', 'Contract validator')),
              h('button', { onClick: runPreview, style: btn(true) }, t('stem.forge.run', 'Validate + preview'))
            ),
            !report
              ? h('div', { style: { fontSize: 12, color: sub } }, acornReady ? t('stem.forge.edit_to_validate', 'Edit the source to validate.') : t('stem.forge.gate_loading', 'loading validator…'))
              : h('div', { style: { fontSize: 12.5 } },
                  h('div', { style: { fontWeight: 700, color: structOk ? okFg : errFg, marginBottom: 4 } },
                    structOk ? '✔ ' + t('stem.forge.struct_ok', 'Structurally conformant') : '✖ ' + t('stem.forge.struct_fail', 'Structural problems')),
                  errs.length ? h('ul', { style: { margin: '4px 0', paddingLeft: 18, color: errFg } }, errs.map(function (e, i) { return h('li', { key: 'e' + i }, e); })) : null,
                  warns.length ? h('details', { style: { marginTop: 4 } },
                    h('summary', { style: { cursor: 'pointer', color: warnFg } }, warns.length + ' ' + t('stem.forge.warnings', 'warning(s)')),
                    h('ul', { style: { margin: '4px 0', paddingLeft: 18, color: warnFg } }, warns.map(function (w, i) { return h('li', { key: 'w' + i }, w); }))
                  ) : (errs.length ? null : h('div', { style: { color: sub } }, t('stem.forge.no_warns', 'No contract warnings.')))
                )
          ),
          // render-smoke result
          smoke ? h('div', { role: 'status', 'aria-live': 'polite', style: Object.assign({ borderRadius: 10, padding: 8, fontSize: 12.5 }, verdictBox(smoke.ok)) },
            smoke.ok
              ? h('span', { style: { color: okFg, fontWeight: 600 } }, '✔ ' + t('stem.forge.renders', 'Mounted without an immediate crash') + (smoke.ids && smoke.ids.length ? ' · id: ' + smoke.ids[0] : ''))
              : h('div', null,
                  h('div', { style: { color: errFg, fontWeight: 600, marginBottom: 4 } }, '✖ ' + t('stem.forge.render_crash', 'Render-smoke failed')),
                  h('pre', { style: { margin: 0, whiteSpace: 'pre-wrap', font: '11.5px ui-monospace, monospace', color: hc ? HC_FG : (dark ? '#fca5a5' : '#991b1b') } }, String(smoke.error || '').slice(0, 800)))
          ) : null,
          // live preview iframe (sandboxed: allow-scripts only)
          h('div', { style: { border: '1px solid ' + border, borderRadius: 10, overflow: 'hidden', background: '#fff', minHeight: 220, flex: 1 } },
            smokeDoc
              ? h('iframe', { ref: iframeRef, srcDoc: smokeDoc, sandbox: 'allow-scripts', title: t('stem.forge.preview', 'Plugin preview (sandboxed)'), style: { width: '100%', height: 280, border: 0, background: '#fff' } })
              : h('div', { style: { padding: 16, color: sub, fontSize: 12.5 } }, t('stem.forge.preview_hint', 'Press “Validate + preview” to render this plugin in an isolated sandbox.'))
          ),
          // submit → /submitPlugin (private KV; human-gated publish)
          h('details', { style: { border: '1px solid ' + border, borderRadius: 10, background: panelBg } },
            h('summary', { style: { cursor: 'pointer', padding: 10, fontSize: 13, fontWeight: 600 } },
              '📤 ' + t('stem.forge.submit_section', 'Submit for review')),
            h('div', { style: { padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 } },
              h('p', { style: { fontSize: 11.5, color: sub, margin: '4px 0', lineHeight: 1.5 } },
                t('stem.forge.submit_note', 'Submitting stages this tool in a private review queue — it never goes live until a maintainer reviews the source + validator report + preview and publishes it. Requires a green validator and a clean render.')),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('input', { value: author, onChange: function (e) { setAuthor(e.target.value); }, 'aria-label': t('stem.forge.author', 'Your name / credit (optional)'), placeholder: t('stem.forge.author', 'Your name / credit (optional)'), style: { flex: '1 1 180px', padding: '6px 8px', borderRadius: 6, border: '1px solid ' + border, background: panelBg, color: fg } }),
                h('select', { value: license, onChange: function (e) { setLicense(e.target.value); }, 'aria-label': t('stem.forge.license', 'License'), style: { padding: '6px 8px', borderRadius: 6, border: '1px solid ' + border, background: panelBg, color: fg } },
                  LICENSES.map(function (l) { return h('option', { key: l, value: l }, l); }))
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                AFFIRMATIONS.map(function (a) {
                  return h('label', { key: a.key, style: { fontSize: 12, display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer' } },
                    h('input', { type: 'checkbox', checked: affirm[a.key] === true, onChange: function (e) { var nx = Object.assign({}, affirm); nx[a.key] = e.target.checked; setAffirm(nx); }, style: { marginTop: 2 } }),
                    h('span', null, a.label));
                })
              ),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                h('button', { onClick: submitPlugin, disabled: !canSubmit, style: Object.assign({}, btn(true), canSubmit ? {} : { opacity: 0.5, cursor: 'not-allowed' }) },
                  submitting ? t('stem.forge.submitting', 'Submitting…') : '📤 ' + t('stem.forge.submit', 'Submit')),
                !canSubmit ? h('span', { style: { fontSize: 11, color: sub } },
                  (!(report && report.ok)) ? t('stem.forge.gate_struct', 'needs a green validator')
                    : (!(smoke && smoke.ok)) ? t('stem.forge.gate_render', 'run preview first')
                    : (!allAffirmed) ? t('stem.forge.gate_affirm', 'confirm all statements')
                    : '') : null
              )
            )
          )
        )
      )
    );
  }
})();
