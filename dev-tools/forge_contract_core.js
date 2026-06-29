/* forge_contract_core.js — the PLUGIN CONTRACT, as one portable module.
 *
 * Single source of truth for "what is a conformant STEM Lab / SEL Hub tool":
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
    var shadowed = false, members = {};
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

    var ctxSet = {};
    for (var c = 0; c < CONTRACT.ctxSurface.length; c++) ctxSet[CONTRACT.ctxSurface[c]] = true;
    var colorSet = {};
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

      var props = {};
      for (var pi = 0; pi < cfg.properties.length; pi++) { var p = cfg.properties[pi]; if (p.type === 'Property') { var k = objKey(p); if (k) props[k] = p.value; } }

      for (var fi = 0; fi < CONTRACT.requiredFields.length; fi++) {
        var f = CONTRACT.requiredFields[fi];
        if (!(f in props)) { t.missing.push(f); t.warns.push('missing config.' + f); }
      }

      if (props.render) {
        if (isFn(props.render)) {
          var p0 = props.render.params && props.render.params[0];
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
          t.warns.push('render is an identifier reference (cannot statically verify it is a function)');
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

    // id uniqueness within this source
    var seen = {};
    for (var ti = 0; ti < out.tools.length; ti++) {
      var tid = out.tools[ti].id;
      if (tid) { if (seen[tid]) out.tools[ti].warns.push('duplicate tool id "' + tid + '" in this source (alias?)'); else seen[tid] = true; }
    }

    out.ok = out.errors.length === 0 && out.tools.every(function (x) { return x.errors.length === 0; });
    return out;
  }

  return { CONTRACT: CONTRACT, validateSource: validateSource };
});
