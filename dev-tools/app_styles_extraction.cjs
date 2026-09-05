'use strict';
// Experimental external CSS variant. The editable JSX and normal build remain
// self-contained; callers must explicitly choose and publish this asset set.
const crypto = require('crypto');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { buildAppStylesModule } = require('../_build_app_styles_module.js');

function extractAppStyles(source, { minBytes = 4096 } = {}) {
  const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
  const assets = [], edits = [];
  traverse(ast, {
    JSXElement(p) {
      const node = p.node;
      if (node.openingElement.name.name !== 'style') return;
      // Retain conditional motion overrides and all interpolated typography.
      if (p.findParent(parent => parent.isConditionalExpression() || parent.isLogicalExpression())) return;
      const children = node.children.filter(child => child.type !== 'JSXText' || child.value.trim());
      const template = children.length === 1 && children[0].type === 'JSXExpressionContainer' && children[0].expression;
      if (template?.type !== 'TemplateLiteral' || template.expressions.length) return;
      const css = template.quasis[0].value.cooked;
      if (css === null || Buffer.byteLength(css) < minBytes) return;
      const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 16);
      const file = 'app_styles.' + hash + '.css';
      const attrs = node.openingElement.attributes.map(attr => source.slice(attr.start, attr.end)).join(' ');
      edits.push({ start: node.start, end: node.end, text: '<link rel="stylesheet" href={new URL(' + JSON.stringify(file) + ', __alloExternalStylesBase).href} data-alloflow-external-style="' + hash + '" ' + attrs + ' />' });
      assets.push({ file, content: css });
    },
  });
  let transformed = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) transformed = transformed.slice(0, edit.start) + edit.text + transformed.slice(edit.end);
  // Resolve beside the executing module, including local desktop and CDN paths.
  // Inline evaluation is deliberately unsupported: a real script URL is needed.
  if (assets.length) transformed = 'const __alloExternalStylesBase = document.currentScript && document.currentScript.src;\nif (!__alloExternalStylesBase) throw new Error("External AppStyles requires a script URL");\n' + transformed;
  return { module: buildAppStylesModule(transformed), assets };
}
module.exports = { extractAppStyles };
