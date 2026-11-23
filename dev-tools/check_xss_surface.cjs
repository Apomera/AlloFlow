#!/usr/bin/env node
// check_xss_surface.cjs — Blocking AST-backed XSS sink scanner with ratchet baseline.
//
// Detects HTML injection sinks across JSX, compiled JS modules, STEM/SEL plugins,
// quiz scripts, the LMS bookmarklet, and browser-rendering worker views:
//   - JSX:          dangerouslySetInnerHTML={{ __html: <expr> }}
//   - Compiled JS:  dangerouslySetInnerHTML: { __html: <expr> }
//   - DOM sinks:    .innerHTML = / +=, .outerHTML = / +=
//   - DOM methods:  .insertAdjacentHTML(pos, <expr>)
//   - Doc writes:   document.write / document.writeln / <win>.document.write / <doc>.write
//
// Classification rules:
//   - Pure static string / non-interpolated template / static concatenation -> safe
//   - Literal translation key t('a.b') -> safe
//   - Explicit sanitizer wrapper (DOMPurify.sanitize, sanitizeHtml, sanitizeSvgGraph,
//     _viewSanitizeReconTableHtml, _tdSafeReportHtml, escapeHtml, escHtml, processMathHTML) -> safe
//   - Inline HTML escape chain (.replace(/&/g,'&amp;') + .replace(/</g,'&lt;')) -> safe
//   - Interpolated template literal (`...${x}...`) -> SAFE ONLY if EVERY interpolation
//     is static, numeric, or explicitly sanitized/escaped; otherwise SUSPECT
//   - String concatenation (`a + b`) -> SAFE ONLY if EVERY operand is static, numeric,
//     or explicitly sanitized/escaped; otherwise SUSPECT
//   - Everything else (variables, expressions, unsanitized calls) -> SUSPECT
//
// Fail-closed guarantees:
//   - Parse errors are NEVER silently skipped (exit 2).
//   - Missing mandatory files / inaccessible dirs / symlinks fail closed (exit 2).
//   - Pre-existing suspect sites are tightly ratcheted in dev-tools/xss_surface_baseline.json
//     by (file, sink, kind, normalizedSignature, maxCount). Any NEW or CHANGED suspect
//     finding exits 1 (blocking by default).
//
// Usage:
//   node dev-tools/check_xss_surface.cjs
//   node dev-tools/check_xss_surface.cjs --verbose
//   node dev-tools/check_xss_surface.cjs --quiet
//   node dev-tools/check_xss_surface.cjs --no-baseline
//   node dev-tools/check_xss_surface.cjs --advisory
//   node dev-tools/check_xss_surface.cjs --baseline=<path>
//   node dev-tools/check_xss_surface.cjs --update-baseline
//
// Exit codes:
//   0 — complete scan, zero unbaselined suspect sites
//   1 — one or more unbaselined suspect XSS sites (blocking)
//   2 — incomplete scan (parse error, missing required source, symlink, invalid baseline/CLI)

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const babelParser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE_PATH = path.join(__dirname, 'xss_surface_baseline.json');

const BABEL_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'topLevelAwait',
  'dynamicImport',
  'optionalChaining',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'decorators-legacy',
];

// Explicit sanitizer / HTML-escaper function names recognized as safe wrappers.
const SANITIZER_CALL_RE = /\b(?:DOMPurify\.sanitize|sanitizeHtml|sanitizeHTML|sanitizeSvgGraph|_viewSanitizeReconTableHtml|_tdSafeReportHtml|escapeHtml|escapeHTML|escHtml|he\.escape|xss|processMathHTML)\s*\(/;
const DIRECT_SANITIZER_NAME_RE = /^(?:(?:window|globalThis|self)\.)?(?:DOMPurify\.sanitize|sanitizeHtml|sanitizeHTML|sanitizeSvgGraph|_viewSanitizeReconTableHtml|_tdSafeReportHtml|escapeHtml|escapeHTML|escHtml|esc|he\.escape|xss|processMathHTML)$/;

const DOC_WRITE_OBJ_RE = /(?:^|\.)(?:document|contentDocument|doc|printDoc|frameDoc|winDoc|iframeDoc|popupDoc)$/i;

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function normalizeSignature(snippet) {
  return String(snippet || '')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim()
    .slice(0, 120);
}

function parseAst(src, relPath) {
  const ext = path.extname(relPath).toLowerCase();
  const isHost = path.basename(relPath) === 'AlloFlowANTI.txt';
  const isTs = ext === '.ts' || ext === '.tsx';
  const needsBabel = isHost || ext === '.jsx' || isTs;

  if (!needsBabel) {
    try {
      return acorn.parse(src, {
        ecmaVersion: 'latest',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowHashBang: true,
        allowSuperOutsideMethod: true,
        locations: true,
      });
    } catch (acornErr) {
      try {
        return babelParser.parse(src, {
          sourceType: 'unambiguous',
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          allowImportExportEverywhere: true,
          allowSuperOutsideMethod: true,
          errorRecovery: false,
          plugins: BABEL_PLUGINS,
        }).program;
      } catch (_) {
        throw acornErr;
      }
    }
  }

  const plugins = isTs ? [...BABEL_PLUGINS, 'typescript'] : BABEL_PLUGINS;
  return babelParser.parse(src, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowSuperOutsideMethod: true,
    errorRecovery: false,
    plugins,
  }).program;
}

function isPureStatic(node) {
  if (!node) return false;
  if (node.type === 'Literal' || node.type === 'StringLiteral'
      || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral'
      || node.type === 'NullLiteral') {
    return true;
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isPureStatic(node.left) && isPureStatic(node.right);
  }
  if (node.type === 'ConditionalExpression') {
    return isPureStatic(node.consequent) && isPureStatic(node.alternate);
  }
  if (node.type === 'ParenthesizedExpression') {
    return isPureStatic(node.expression);
  }
  return false;
}

function flattenPlus(node, out = []) {
  if (!node) return out;
  if (node.type === 'ParenthesizedExpression') return flattenPlus(node.expression, out);
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    flattenPlus(node.left, out);
    flattenPlus(node.right, out);
  } else {
    out.push(node);
  }
  return out;
}

function getCalleeText(callee, src) {
  if (!callee) return '';
  return src.slice(callee.start, callee.end).replace(/\s+/g, '');
}

function isStaticReplacePattern(node, charToEscape) {
  if (!node) return false;
  if (node.type === 'RegExpLiteral' && typeof node.pattern === 'string') {
    return node.pattern === charToEscape || node.pattern === '\\' + charToEscape;
  }
  if (node.type === 'Literal' && node.regex && typeof node.regex.pattern === 'string') {
    return node.regex.pattern === charToEscape || node.regex.pattern === '\\' + charToEscape;
  }
  if (node.type === 'StringLiteral' || (node.type === 'Literal' && typeof node.value === 'string')) {
    return node.value === charToEscape;
  }
  return false;
}

function getStringLiteralValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

// Verify the OUTERMOST AST node is a contiguous `.replace(...)` call chain that
// escapes both `&` -> `&amp;` and `<` -> `&lt;` (before any subsequent static-only
// formatting replacements) — never an arbitrary outer function or half of a ternary.
function isInlineHtmlEscapeChain(node, src) {
  if (!node) return false;
  if (node.type === 'ParenthesizedExpression') return isInlineHtmlEscapeChain(node.expression, src);
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return false;

  const calls = [];
  let cur = node;
  while (cur) {
    if (cur.type === 'ParenthesizedExpression') { cur = cur.expression; continue; }
    if ((cur.type === 'CallExpression' || cur.type === 'OptionalCallExpression')
        && cur.callee && (cur.callee.type === 'MemberExpression' || cur.callee.type === 'OptionalMemberExpression')
        && !cur.callee.computed && cur.callee.property && cur.callee.property.name === 'replace'
        && Array.isArray(cur.arguments) && cur.arguments.length >= 2) {
      calls.push(cur);
      cur = cur.callee.object;
    } else {
      break;
    }
  }
  if (calls.length === 0) return false;

  // calls[] is outermost-first; reverse so we inspect in execution order (innermost -> outermost).
  calls.reverse();
  let escapedAmp = false;
  let escapedLt = false;
  let escapeDoneIdx = -1;

  for (let i = 0; i < calls.length; i++) {
    const [pat, rep] = calls[i].arguments;
    const repVal = getStringLiteralValue(rep);
    if (isStaticReplacePattern(pat, '&') && repVal === '&amp;') {
      escapedAmp = true;
    } else if (isStaticReplacePattern(pat, '<') && repVal === '&lt;') {
      escapedLt = true;
    } else {
      // Single-regex character-map escaper: .replace(/[&<>...]/g, ch => ({ '&': '&amp;', '<': '&lt;', ... }[ch]))
      const patPattern = pat && (pat.type === 'RegExpLiteral' ? pat.pattern : (pat.type === 'Literal' && pat.regex ? pat.regex.pattern : null));
      if (patPattern && /^\[[^\]]*&[^\]]*<[^\]]*\]$|^\[[^\]]*<[^\]]*&[^\]]*\]$/.test(patPattern)) {
        const repSrc = src.slice(rep.start, rep.end);
        if (/&amp;/.test(repSrc) && /&lt;/.test(repSrc)) {
          escapedAmp = true;
          escapedLt = true;
        }
      }
    }
    if (escapedAmp && escapedLt && escapeDoneIdx === -1) {
      escapeDoneIdx = i;
    }
  }

  if (!escapedAmp || !escapedLt) return false;

  // Every .replace() AFTER escaping must use a static replacement string so later
  // replacements in the chain cannot interpolate untrusted expressions.
  for (let i = escapeDoneIdx + 1; i < calls.length; i++) {
    const rep = calls[i].arguments[1];
    if (!isPureStatic(rep)) return false;
  }
  return true;
}

function isSafeIife(node, src) {
  if (!node || (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')) return false;
  let callee = node.callee;
  while (callee && callee.type === 'ParenthesizedExpression') callee = callee.expression;
  if (!callee || (callee.type !== 'ArrowFunctionExpression' && callee.type !== 'FunctionExpression')) return false;
  if (!callee.body) return false;
  if (callee.body.type !== 'BlockStatement') {
    return isSafeFragmentExpr(callee.body, src);
  }
  // Collect all ReturnStatements belonging directly to this IIFE (do not descend into nested functions).
  const returns = [];
  const stack = [...callee.body.body];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (cur.type === 'FunctionDeclaration' || cur.type === 'FunctionExpression' || cur.type === 'ArrowFunctionExpression') {
      continue;
    }
    if (cur.type === 'ReturnStatement') {
      returns.push(cur);
      continue;
    }
    for (const key of Object.keys(cur)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range'
          || key === 'tokens' || key === 'comments' || key === 'extra') continue;
      const val = cur[key];
      if (Array.isArray(val)) {
        for (let i = val.length - 1; i >= 0; i--) if (val[i] && typeof val[i] === 'object') stack.push(val[i]);
      } else if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }
  if (returns.length === 0) return false;
  return returns.every(ret => !ret.argument || isSafeFragmentExpr(ret.argument, src));
}

function isSafeFragmentExpr(node, src) {
  if (!node) return false;
  if (node.type === 'ParenthesizedExpression') return isSafeFragmentExpr(node.expression, src);
  if (isPureStatic(node)) return true;

  // Pure numeric `.length` property access (AST node-type checked, not regex on raw text)
  if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')
      && !node.computed && node.property && node.property.name === 'length') {
    return true;
  }

  // Calls: numeric coercions, literal translation key t('foo.bar'), direct sanitizers,
  // outermost inline HTML escape chains, safe IIFEs, and Array.map(...).join(safeSep)
  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
    const calleeName = getCalleeText(node.callee, src);
    if (/^(?:Number|Math\.\w+|parseInt|parseFloat)$/.test(calleeName)) {
      return true;
    }
    if (calleeName === 't' && Array.isArray(node.arguments) && node.arguments.length === 1) {
      const argVal = getStringLiteralValue(node.arguments[0]);
      if (argVal && /^[a-zA-Z0-9_.\-]+$/.test(argVal)) return true;
    }
    if (DIRECT_SANITIZER_NAME_RE.test(calleeName)) {
      return true;
    }
    if (isInlineHtmlEscapeChain(node, src)) {
      return true;
    }
    if (isSafeIife(node, src)) {
      return true;
    }
    if (node.callee && (node.callee.type === 'MemberExpression' || node.callee.type === 'OptionalMemberExpression')
        && !node.callee.computed && node.callee.property && node.callee.property.name === 'join'
        && node.callee.object && (node.callee.object.type === 'CallExpression' || node.callee.object.type === 'OptionalCallExpression')
        && node.callee.object.callee && (node.callee.object.callee.type === 'MemberExpression' || node.callee.object.callee.type === 'OptionalMemberExpression')
        && !node.callee.object.callee.computed && node.callee.object.callee.property && node.callee.object.callee.property.name === 'map') {
      // Separator argument to .join(sep) MUST also be safe (or omitted)!
      const sepSafe = !Array.isArray(node.arguments) || node.arguments.length === 0
        || (node.arguments.length === 1 && isSafeFragmentExpr(node.arguments[0], src));
      if (!sepSafe) return false;
      const cb = node.callee.object.arguments[0];
      if (cb && cb.type === 'ArrowFunctionExpression' && cb.body && cb.body.type !== 'BlockStatement') {
        return isSafeFragmentExpr(cb.body, src);
      }
    }
    return false;
  }

  // Conditional / logical where BOTH branches are safe
  if (node.type === 'ConditionalExpression') {
    return isSafeFragmentExpr(node.consequent, src) && isSafeFragmentExpr(node.alternate, src);
  }
  if (node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??')) {
    return isSafeFragmentExpr(node.left, src) && isSafeFragmentExpr(node.right, src);
  }
  if (node.type === 'LogicalExpression' && node.operator === '&&') {
    return isSafeFragmentExpr(node.right, src);
  }

  // Nested template literal where every interpolation is safe
  if (node.type === 'TemplateLiteral') {
    return node.expressions.every(e => isSafeFragmentExpr(e, src));
  }

  // Nested binary '+' where every part is safe
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return flattenPlus(node).every(p => isSafeFragmentExpr(p, src));
  }

  return false;
}

function classifySinkExpr(node, src) {
  if (!node) return { kind: 'unsanitized-expr', severity: 'suspect' };
  if (node.type === 'ParenthesizedExpression') return classifySinkExpr(node.expression, src);

  // 1. Pure static string / non-interpolated template / static concatenation
  if (isPureStatic(node)) {
    return { kind: 'static-literal', severity: 'safe' };
  }

  // 2. Literal translation key: t('foo.bar')
  if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression')
      && getCalleeText(node.callee, src) === 't'
      && Array.isArray(node.arguments) && node.arguments.length === 1) {
    const argVal = getStringLiteralValue(node.arguments[0]);
    if (argVal && /^[a-zA-Z0-9_.\-]+$/.test(argVal)) {
      return { kind: 'translation-key', severity: 'safe' };
    }
  }

  // 3. Interpolated template literal (`...${x}...`) — NEVER blindly safe!
  if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
    if (node.expressions.every(e => isSafeFragmentExpr(e, src))) {
      return { kind: 'sanitized-template', severity: 'safe' };
    }
    return { kind: 'interpolated-template', severity: 'suspect' };
  }

  // 4. String concatenation (`a + b`) — EVERY part must be safe!
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const parts = flattenPlus(node);
    if (parts.every(p => isSafeFragmentExpr(p, src))) {
      return { kind: 'sanitized-concat', severity: 'safe' };
    }
    const someSanitized = parts.some(p => SANITIZER_CALL_RE.test(src.slice(p.start, p.end)));
    return { kind: someSanitized ? 'partially-escaped-concat' : 'dynamic-concat', severity: 'suspect' };
  }

  // 5. Direct sanitizer wrapper call, outermost inline HTML escape chain, or strictly verified IIFE
  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
    const calleeName = getCalleeText(node.callee, src);
    if (DIRECT_SANITIZER_NAME_RE.test(calleeName)) {
      return { kind: 'sanitized', severity: 'safe' };
    }
    if (isInlineHtmlEscapeChain(node, src)) {
      return { kind: 'inline-html-escape', severity: 'safe' };
    }
    if (isSafeIife(node, src)) {
      return { kind: 'sanitized', severity: 'safe' };
    }
  }

  // 6. Conditional / logical expression where BOTH outcomes are provably safe
  if (node.type === 'ConditionalExpression') {
    if (isSafeFragmentExpr(node.consequent, src) && isSafeFragmentExpr(node.alternate, src)) {
      return { kind: 'sanitized', severity: 'safe' };
    }
  }

  return { kind: 'unsanitized-expr', severity: 'suspect' };
}

function extractHtmlPropValue(objNode) {
  if (!objNode || objNode.type !== 'ObjectExpression') return objNode;
  const prop = objNode.properties.find(p => (p.type === 'ObjectProperty' || p.type === 'Property')
    && !p.computed && ((p.key.name || p.key.value) === '__html'));
  return prop ? prop.value : objNode;
}

function scanSource(src, relPath) {
  const ast = parseAst(src, relPath);
  const findings = [];

  const stack = [ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    let match = null;

    // 1. JSX attribute: dangerouslySetInnerHTML={{ __html: expr }}
    if (node.type === 'JSXAttribute'
        && node.name && node.name.name === 'dangerouslySetInnerHTML'
        && node.value && node.value.type === 'JSXExpressionContainer') {
      match = {
        sink: 'jsx:dangerouslySetInnerHTML',
        targetNode: extractHtmlPropValue(node.value.expression),
        line: node.loc ? node.loc.start.line : 0,
      };
    }
    // 2. Compiled JS property: dangerouslySetInnerHTML: { __html: expr }
    else if ((node.type === 'Property' || node.type === 'ObjectProperty')
        && !node.computed
        && ((node.key && (node.key.name || node.key.value)) === 'dangerouslySetInnerHTML')) {
      match = {
        sink: 'js:dangerouslySetInnerHTML',
        targetNode: extractHtmlPropValue(node.value),
        line: node.loc ? node.loc.start.line : 0,
      };
    }
    // 3. DOM property assignment: el.innerHTML = expr, el.innerHTML += expr, el.outerHTML = expr
    else if (node.type === 'AssignmentExpression'
        && node.left && node.left.type === 'MemberExpression'
        && !node.left.computed && node.left.property
        && (node.left.property.name === 'innerHTML' || node.left.property.name === 'outerHTML')) {
      match = {
        sink: 'dom:' + node.left.property.name,
        targetNode: node.right,
        line: node.loc ? node.loc.start.line : 0,
      };
    }
    // 4. DOM method: el.insertAdjacentHTML(position, expr)
    else if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression')
        && node.callee && (node.callee.type === 'MemberExpression' || node.callee.type === 'OptionalMemberExpression')
        && !node.callee.computed && node.callee.property
        && node.callee.property.name === 'insertAdjacentHTML'
        && Array.isArray(node.arguments) && node.arguments.length >= 2) {
      match = {
        sink: 'dom:insertAdjacentHTML',
        targetNode: node.arguments[1],
        line: node.loc ? node.loc.start.line : 0,
      };
    }
    // 5. Document write: document.write(a, b, ...), win.document.write(...), doc.writeln(...)
    else if ((node.type === 'CallExpression' || node.type === 'OptionalCallExpression')
        && node.callee && (node.callee.type === 'MemberExpression' || node.callee.type === 'OptionalMemberExpression')
        && !node.callee.computed && node.callee.property
        && (node.callee.property.name === 'write' || node.callee.property.name === 'writeln')
        && Array.isArray(node.arguments) && node.arguments.length >= 1) {
      const objSrc = src.slice(node.callee.object.start, node.callee.object.end).replace(/\s+/g, '');
      if (DOC_WRITE_OBJ_RE.test(objSrc)) {
        match = {
          sink: 'dom:document.' + node.callee.property.name,
          targetNodes: node.arguments,
          line: node.loc ? node.loc.start.line : 0,
        };
      }
    }

    if (match && (match.targetNode || (Array.isArray(match.targetNodes) && match.targetNodes.length > 0))) {
      let cls;
      let rawExpr;
      if (Array.isArray(match.targetNodes)) {
        const argResults = match.targetNodes.map(arg => classifySinkExpr(arg, src));
        const firstSuspect = argResults.find(r => r.severity === 'suspect');
        cls = firstSuspect || argResults[0];
        rawExpr = match.targetNodes.map(arg => src.slice(arg.start, arg.end).replace(/\s+/g, ' ').trim()).join(', ');
      } else {
        cls = classifySinkExpr(match.targetNode, src);
        rawExpr = src.slice(match.targetNode.start, match.targetNode.end).replace(/\s+/g, ' ').trim();
      }
      findings.push({
        file: relPath,
        line: match.line,
        sink: match.sink,
        kind: cls.kind,
        severity: cls.severity,
        expr: rawExpr.length > 100 ? rawExpr.slice(0, 100) + '…' : rawExpr,
        signature: normalizeSignature(rawExpr),
      });
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range'
          || key === 'tokens' || key === 'comments' || key === 'extra') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (let i = val.length - 1; i >= 0; i--) {
          if (val[i] && typeof val[i] === 'object') stack.push(val[i]);
        }
      } else if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}

function collectFiles({ root = ROOT, io = fs, requireHost = true } = {}) {
  const files = new Set();
  const omissions = [];
  const rel = p => toPosix(path.relative(root, p));

  let rootEntries;
  try {
    rootEntries = io.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    omissions.push({ file: '.', reason: 'root directory enumeration failed' });
    return { files: [], omissions };
  }

  for (const entry of rootEntries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const isRootTarget = entry.name === 'AlloFlowANTI.txt'
      || entry.name === 'lms_bookmarklet.js'
      || /^[^_].*_module\.js$/.test(entry.name)
      || /^[^_].*_source\.jsx$/.test(entry.name)
      || /^quiz_[a-z_]+\.js$/.test(entry.name);
    if (!isRootTarget) continue;
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      omissions.push({ file: rel(full), reason: 'symbolic link is not scanned' });
      continue;
    }
    if (entry.isFile()) files.add(full);
    else omissions.push({ file: rel(full), reason: 'source is not a regular file' });
  }

  if (requireHost) {
    const hostPath = path.join(root, 'AlloFlowANTI.txt');
    if (!files.has(hostPath)) {
      omissions.push({ file: 'AlloFlowANTI.txt', reason: 'mandatory host file AlloFlowANTI.txt is missing' });
    }
  }

  for (const dirName of ['stem_lab', 'sel_hub']) {
    const dirAbs = path.join(root, dirName);
    let entries;
    try {
      const st = io.lstatSync(dirAbs);
      if (!st.isDirectory() || st.isSymbolicLink()) {
        omissions.push({ file: dirName, reason: 'source directory is not a regular directory' });
        continue;
      }
      entries = io.readdirSync(dirAbs, { withFileTypes: true });
    } catch (_) {
      omissions.push({ file: dirName, reason: 'required source directory is missing or unreadable' });
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      if (!entry.name.endsWith('.js') || /\.(?:test|spec)\.js$/i.test(entry.name)) continue;
      const full = path.join(dirAbs, entry.name);
      if (entry.isSymbolicLink()) {
        omissions.push({ file: rel(full), reason: 'symbolic link is not scanned' });
        continue;
      }
      if (entry.isFile()) files.add(full);
    }
  }

  return { files: [...files].sort(), omissions };
}

function loadBaseline(baselinePath, io = fs) {
  if (!baselinePath) return { accepted: {} };
  const raw = io.readFileSync(baselinePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !parsed.accepted || typeof parsed.accepted !== 'object') {
    throw new Error('Invalid XSS baseline format (missing accepted map)');
  }
  return parsed;
}

function buildBaselineObject(suspectFindings) {
  const accepted = {};
  for (const f of suspectFindings) {
    if (!accepted[f.file]) accepted[f.file] = [];
    const existing = accepted[f.file].find(e => e.sink === f.sink && e.kind === f.kind && e.signature === f.signature);
    if (existing) existing.count++;
    else accepted[f.file].push({ sink: f.sink, kind: f.kind, signature: f.signature, count: 1 });
  }
  const sorted = {};
  for (const file of Object.keys(accepted).sort()) {
    sorted[file] = accepted[file].sort((a, b) =>
      a.sink.localeCompare(b.sink) || a.kind.localeCompare(b.kind) || a.signature.localeCompare(b.signature));
  }
  return {
    note: 'Ratchet baseline for dev-tools/check_xss_surface.cjs. Pins pre-existing suspect HTML sinks by (file, sink, kind, normalizedSignature, maxCount). Any NEW or MODIFIED unsanitized dangerouslySetInnerHTML, innerHTML/outerHTML, insertAdjacentHTML, document.write, or interpolated template literal fails CI.',
    accepted: sorted,
  };
}

function evaluateFindings(findings, baseline) {
  const safe = findings.filter(f => f.severity === 'safe');
  const suspect = findings.filter(f => f.severity === 'suspect');
  const acceptedMap = (baseline && baseline.accepted) || {};
  const usage = new Map();
  const baselined = [];
  const unaccepted = [];

  for (const f of suspect) {
    const entries = Array.isArray(acceptedMap[f.file]) ? acceptedMap[f.file] : [];
    const match = entries.find(e => e.sink === f.sink && e.kind === f.kind && e.signature === f.signature);
    if (match) {
      const key = `${f.file}|${f.sink}|${f.kind}|${f.signature}`;
      const used = usage.get(key) || 0;
      const maxCount = Number.isInteger(match.count) ? match.count : 1;
      if (used < maxCount) {
        usage.set(key, used + 1);
        baselined.push(f);
        continue;
      }
    }
    unaccepted.push(f);
  }

  const staleBaseline = [];
  for (const [file, entries] of Object.entries(acceptedMap)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const key = `${file}|${entry.sink}|${entry.kind}|${entry.signature}`;
      const used = usage.get(key) || 0;
      const maxCount = Number.isInteger(entry.count) ? entry.count : 1;
      if (used < maxCount) {
        staleBaseline.push({ file, sink: entry.sink, kind: entry.kind, baselined: maxCount, observed: used });
      }
    }
  }

  return { safe, suspect, baselined, unaccepted, staleBaseline };
}

function scanRepo({
  root = ROOT,
  io = fs,
  requireHost = true,
  baseline = null,
  advisory = false,
} = {}) {
  const { files, omissions } = collectFiles({ root, io, requireHost });
  const findings = [];
  const parseErrors = [];
  let scannedFiles = 0;

  for (const file of files) {
    const rel = toPosix(path.relative(root, file));
    let src;
    try {
      const st = io.lstatSync(file);
      if (!st.isFile() || st.isSymbolicLink()) {
        omissions.push({ file: rel, reason: 'source is not a regular file' });
        continue;
      }
      src = io.readFileSync(file, 'utf8');
    } catch (_) {
      omissions.push({ file: rel, reason: 'source read failed' });
      continue;
    }

    try {
      findings.push(...scanSource(src, rel));
      scannedFiles++;
    } catch (err) {
      parseErrors.push({
        file: rel,
        message: err && err.message ? err.message.split('\n')[0] : 'parse error',
      });
    }
  }

  const { safe, suspect, baselined, unaccepted, staleBaseline } = evaluateFindings(findings, baseline);
  const exitCode = (omissions.length > 0 || parseErrors.length > 0)
    ? 2
    : (!advisory && unaccepted.length > 0 ? 1 : 0);

  return {
    scannedFiles,
    findings,
    safe,
    suspect,
    baselined,
    unaccepted,
    staleBaseline,
    parseErrors,
    omissions,
    exitCode,
  };
}

function formatReport(result, { quiet = false, verbose = false, advisory = false, write = console.log } = {}) {
  const showHeader = !quiet || result.unaccepted.length > 0 || result.parseErrors.length > 0 || result.omissions.length > 0;
  if (showHeader) {
    write('');
    write('╔══════════════════════════════════════════════════════════════════════╗');
    write('║   XSS Surface Check (dangerouslySetInnerHTML + DOM HTML Sinks)       ║');
    write('╚══════════════════════════════════════════════════════════════════════╝');
    write('  Files scanned:          ' + result.scannedFiles);
    write('  Total HTML sinks:       ' + result.findings.length);
    write('  Safe (static/escaped):  ' + result.safe.length);
    write('  Baselined suspect:      ' + result.baselined.length);
    write('  Unaccepted (new/drift): ' + result.unaccepted.length);
    if (result.parseErrors.length > 0) write('  Parse errors:           ' + result.parseErrors.length);
    if (result.omissions.length > 0) write('  Incomplete/omissions:   ' + result.omissions.length);
    write('');
  }

  if (result.omissions.length > 0) {
    write('═══ ✗ INCOMPLETE SCAN (' + result.omissions.length + ') ═══');
    for (const o of result.omissions) write('  ✗ ' + o.file + ': ' + o.reason);
    write('');
  }

  if (result.parseErrors.length > 0) {
    write('═══ ✗ PARSE ERRORS — FAIL CLOSED (' + result.parseErrors.length + ') ═══');
    for (const p of result.parseErrors) write('  ✗ ' + p.file + ': ' + p.message);
    write('');
  }

  if (result.unaccepted.length > 0) {
    write('═══ ' + (advisory ? '⚠' : '❌') + ' UNACCEPTED SUSPECT XSS SITES (' + result.unaccepted.length + ') ═══');
    for (const f of result.unaccepted.slice(0, verbose ? undefined : 30)) {
      write('  ' + (advisory ? '⚠' : '✗') + ' ' + f.file + ':' + f.line + '  [' + f.sink + ' / ' + f.kind + ']');
      write('      ' + f.expr);
    }
    if (!verbose && result.unaccepted.length > 30) {
      write('  (... ' + (result.unaccepted.length - 30) + ' more; re-run with --verbose)');
    }
    write('');
  }

  if (verbose && result.baselined.length > 0) {
    write('═══ ⊙ BASELINED SUSPECT SITES (' + result.baselined.length + ') ═══');
    for (const f of result.baselined.slice(0, 40)) {
      write('  ⊙ ' + f.file + ':' + f.line + '  [' + f.sink + ' / ' + f.kind + '] ' + f.expr);
    }
    if (result.baselined.length > 40) {
      write('  (... ' + (result.baselined.length - 40) + ' more baselined sites)');
    }
    write('');
  }

  if (verbose && result.safe.length > 0) {
    write('═══ ✓ SAFE SITES (' + result.safe.length + ') ═══');
    for (const f of result.safe.slice(0, 25)) {
      write('  ✓ ' + f.file + ':' + f.line + '  [' + f.sink + ' / ' + f.kind + ']');
    }
    if (result.safe.length > 25) write('  (... ' + (result.safe.length - 25) + ' more safe sites)');
    write('');
  }

  if (result.exitCode === 2) {
    write('  ❌ XSS surface scan incomplete (parse errors or omissions) — failing closed.');
    write('');
  } else if (result.exitCode === 1) {
    write('  ❌ ' + result.unaccepted.length + ' unaccepted suspect XSS site(s) found — sanitize with DOMPurify/escapeHtml or audit.');
    write('');
  } else if (!quiet) {
    write('  ✅ XSS surface check passed (' + result.safe.length + ' safe, ' + result.baselined.length + ' baselined, 0 unaccepted).');
    if (result.staleBaseline.length > 0) {
      write('  ℹ ' + result.staleBaseline.length + ' baseline entry/entries can be tightened with --update-baseline.');
    }
    write('');
  }
}

function main(args = process.argv.slice(2), deps = {}) {
  const io = deps.io || fs;
  const root = deps.root || ROOT;
  const write = deps.write || console.log;
  const errorWrite = deps.error || console.error;

  let verbose = false;
  let quiet = false;
  let noBaseline = false;
  let advisory = false;
  let updateBaseline = false;
  let baselinePath = deps.baselinePath || DEFAULT_BASELINE_PATH;

  for (const arg of args) {
    if (arg === '--verbose') verbose = true;
    else if (arg === '--quiet') quiet = true;
    else if (arg === '--no-baseline') noBaseline = true;
    else if (arg === '--advisory') advisory = true;
    else if (arg === '--update-baseline') updateBaseline = true;
    else if (arg.startsWith('--baseline=')) baselinePath = path.resolve(root, arg.slice('--baseline='.length));
    else {
      errorWrite('Unknown option: ' + arg + '\nUsage: node dev-tools/check_xss_surface.cjs [--verbose] [--quiet] [--no-baseline] [--advisory] [--baseline=<path>] [--update-baseline]');
      return 2;
    }
  }

  if (updateBaseline) {
    const result = scanRepo({ root, io, baseline: null, advisory: true });
    if (result.parseErrors.length > 0 || result.omissions.length > 0) {
      formatReport(result, { quiet: false, verbose, advisory: false, write });
      return 2;
    }
    const obj = buildBaselineObject(result.suspect);
    io.writeFileSync(baselinePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    write('Updated XSS baseline at ' + baselinePath + ' (' + result.suspect.length + ' suspect sites across ' + Object.keys(obj.accepted).length + ' files).');
    return 0;
  }

  let baseline = null;
  if (!noBaseline) {
    try {
      baseline = loadBaseline(baselinePath, io);
    } catch (err) {
      errorWrite('Failed to load XSS baseline at ' + baselinePath + ': ' + err.message);
      return 2;
    }
  }

  const result = scanRepo({ root, io, baseline, advisory });
  formatReport(result, { quiet, verbose, advisory, write });
  return result.exitCode;
}

module.exports = {
  DEFAULT_BASELINE_PATH,
  normalizeSignature,
  parseAst,
  classifySinkExpr,
  scanSource,
  collectFiles,
  loadBaseline,
  buildBaselineObject,
  evaluateFindings,
  scanRepo,
  formatReport,
  main,
};

if (require.main === module) {
  process.exitCode = main();
}
