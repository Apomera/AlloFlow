#!/usr/bin/env node
// _jsx_render_tree.cjs — emit a structural map of AlloFlowContent's JSX return block
//
// Usage:
//   node _jsx_render_tree.cjs                    # AlloFlowANTI.txt, default depth 2
//   node _jsx_render_tree.cjs --depth 3          # nest deeper
//   node _jsx_render_tree.cjs --file foo.jsx     # different source file
//
// Output: tree of top-level JSX children + conditional branches with line ranges
// + line counts. Identifies natural extraction seams.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) argv[args[i].slice(2)] = args[i + 1] || true;
}
const FILE = argv.file || 'AlloFlowANTI.txt';
const MAX_DEPTH = parseInt(argv.depth || 2, 10);

const src = fs.readFileSync(path.resolve(FILE), 'utf8');
const lines = src.split(/\r?\n/);

// Find AlloFlowContent's return statement
const componentRe = /^const AlloFlowContent\s*=\s*\(\)\s*=>\s*\{/;
const componentLine = lines.findIndex(l => componentRe.test(l));
if (componentLine < 0) {
  console.error('Could not find `const AlloFlowContent = () => {` in', FILE);
  process.exit(1);
}

// Find the first `  return (` after that
let returnLine = -1;
for (let i = componentLine; i < lines.length; i++) {
  if (/^\s\sreturn\s*\(/.test(lines[i])) { returnLine = i; break; }
}
if (returnLine < 0) {
  console.error('Could not find `return (` inside AlloFlowContent');
  process.exit(1);
}

// Find matching close paren by walking parens
let depth = 0;
let returnEnd = -1;
for (let i = returnLine; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) { returnEnd = i; break; }
    }
  }
  if (returnEnd >= 0) break;
}
if (returnEnd < 0) { console.error('Could not match closing paren of return ()'); process.exit(1); }

console.log(`AlloFlowContent: line ${componentLine + 1}`);
console.log(`return (        : line ${returnLine + 1}`);
console.log(`return end      : line ${returnEnd + 1}`);
console.log(`JSX block size  : ${returnEnd - returnLine + 1} lines`);
console.log('');

// Extract JSX text and parse it as an expression
const jsxText = lines.slice(returnLine, returnEnd + 1).join('\n');
// Wrap as a tiny program so the parser accepts it (return-stmt outside function fails)
const wrapped = `function __wrap() { ${jsxText.replace(/^\s*return\s*\(/, 'return (')} }`;
let ast;
try {
  ast = parser.parse(wrapped, {
    sourceType: 'module',
    plugins: ['jsx'],
    errorRecovery: true,
  });
} catch (e) {
  console.error('Parser failed:', e.message);
  process.exit(1);
}

// Find the JSX root inside the wrapped function
let jsxRoot = null;
function findJsx(node) {
  if (!node) return;
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') { jsxRoot = node; return; }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === 'object' && !jsxRoot) {
      if (Array.isArray(v)) v.forEach(findJsx);
      else if (typeof v.type === 'string') findJsx(v);
    }
  }
}
findJsx(ast);
if (!jsxRoot) { console.error('No JSX root found inside return ()'); process.exit(1); }

// Babel locs are relative to `wrapped`. The wrapper prepends "function __wrap() { "
// followed by a single space, no newline. So source lines map 1:1 to AST lines for line content.
// AST line numbers point at the wrapped string. The wrapper has 0 newlines before the JSX,
// so AST.loc.start.line = 1 corresponds to lines[returnLine] (which contains "  return (").
// Hence: source_line = returnLine + ast_line.

function jsxName(node) {
  if (!node) return '?';
  if (node.type === 'JSXElement') {
    const open = node.openingElement && node.openingElement.name;
    return jsxName(open);
  }
  if (node.type === 'JSXFragment') return '<>';
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') {
    return `${jsxName(node.object)}.${jsxName(node.property)}`;
  }
  if (node.type === 'JSXNamespacedName') {
    return `${jsxName(node.namespace)}:${jsxName(node.name)}`;
  }
  return node.type;
}

function summarizeExpression(expr) {
  // Best-effort short summary of a JSXExpressionContainer's content
  if (!expr) return '';
  switch (expr.type) {
    case 'LogicalExpression': {
      const left = summarizeExpression(expr.left);
      const right = expr.right.type === 'JSXElement' || expr.right.type === 'JSXFragment'
        ? `<${jsxName(expr.right)}>` : summarizeExpression(expr.right);
      return `${left} ${expr.operator} ${right}`;
    }
    case 'ConditionalExpression':
      return `${summarizeExpression(expr.test)} ? ${summarizeExpression(expr.consequent)} : ${summarizeExpression(expr.alternate)}`;
    case 'CallExpression':
      return `${summarizeExpression(expr.callee)}(...)`;
    case 'MemberExpression':
      return `${summarizeExpression(expr.object)}.${summarizeExpression(expr.property)}`;
    case 'Identifier':
      return expr.name;
    case 'BinaryExpression':
      return `${summarizeExpression(expr.left)} ${expr.operator} ${summarizeExpression(expr.right)}`;
    case 'UnaryExpression':
      return `${expr.operator}${summarizeExpression(expr.argument)}`;
    case 'StringLiteral':
      return JSON.stringify(expr.value).slice(0, 30);
    case 'NumericLiteral': return String(expr.value);
    case 'BooleanLiteral': return String(expr.value);
    case 'NullLiteral': return 'null';
    case 'JSXElement': return `<${jsxName(expr)}>`;
    case 'JSXFragment': return '<>';
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return '<fn>';
    case 'ObjectExpression': return '{...}';
    case 'ArrayExpression': return '[...]';
    case 'TemplateLiteral': return '`...`';
    default: return expr.type;
  }
}

function walk(node, depth, parentTag) {
  if (depth > MAX_DEPTH) return;
  if (!node) return;
  const indent = '  '.repeat(depth);
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    const startL = node.loc.start.line + returnLine; // 1-indexed source line
    const endL = node.loc.end.line + returnLine;
    const lineCount = endL - startL + 1;
    const tag = node.type === 'JSXFragment' ? '<>' : `<${jsxName(node)}>`;
    if (depth === 0) {
      console.log(`[${startL}-${endL}] (${lineCount} lines) ${tag} ROOT`);
    } else {
      console.log(`${indent}[${startL}-${endL}] (${lineCount} lines) ${tag}`);
    }
    const children = node.type === 'JSXElement' ? node.children : node.children;
    for (const c of (children || [])) walk(c, depth + 1, tag);
  } else if (node.type === 'JSXExpressionContainer') {
    const startL = node.loc.start.line + returnLine;
    const endL = node.loc.end.line + returnLine;
    const lineCount = endL - startL + 1;
    const summary = summarizeExpression(node.expression);
    if (lineCount >= 3 || depth <= 1) {
      console.log(`${indent}[${startL}-${endL}] (${lineCount} lines) {${summary}}`);
    }
    // Recurse into JSXElement-bearing children of expressions
    const expr = node.expression;
    if (expr) {
      // Walk JSX inside conditional / logical expressions to find nested elements
      const nestedElements = [];
      function findNested(n) {
        if (!n) return;
        if (n.type === 'JSXElement' || n.type === 'JSXFragment') { nestedElements.push(n); return; }
        for (const k of Object.keys(n)) {
          const v = n[k];
          if (v && typeof v === 'object') {
            if (Array.isArray(v)) v.forEach(findNested);
            else if (typeof v.type === 'string') findNested(v);
          }
        }
      }
      findNested(expr);
      for (const el of nestedElements) walk(el, depth + 1, '<expr-jsx>');
    }
  }
  // JSXText / other types ignored
}

walk(jsxRoot, 0, null);
