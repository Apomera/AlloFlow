import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const ast = require('@babel/parser').parse(source, { sourceType: 'script', plugins: ['jsx'] });
const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const expressions = new Map();
const stack = [ast];
while (stack.length) {
  const node = stack.pop();
  if (node.type === 'JSXAttribute' && node.value?.type === 'JSXExpressionContainer') {
    const expression = node.value.expression;
    const call = expression.type === 'LogicalExpression' ? expression.left : expression;
    const key = call.type === 'CallExpression' && call.callee.name === 't' && call.arguments[0]?.value;
    if (typeof key === 'string' && key.startsWith('export_preview.accessibility.')) expressions.set(key, expression);
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) child.forEach(value => { if (value?.type) stack.push(value); });
    else if (child?.type) stack.push(child);
  }
}
const evaluate = (leaf, t, context = {}) => {
  const expression = expressions.get('export_preview.accessibility.' + leaf);
  expect(expression, leaf).toBeDefined();
  return new Function('t', ...Object.keys(context), 'return (' + source.slice(expression.start, expression.end) + ');')(t, ...Object.values(context));
};
const translator = dictionary => (key, params = {}) => {
  const value = dictionary[key];
  return value?.replace(/\{([^{}]+)\}/g, (match, name) => params[name] ?? match);
};

describe('Document Builder accessible label localization', () => {
  it('registers every newly keyed accessible label and preserves source/public dictionaries and builds', () => {
    expect(expressions.size).toBeGreaterThan(150);
    for (const key of expressions.keys()) {
      const leaf = key.slice('export_preview.accessibility.'.length);
      expect(typeof ui.export_preview.accessibility[leaf], key).toBe('string');
      expect(ui.export_preview.accessibility[leaf].trim(), key).not.toBe('');
    }
    expect(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).toBe(readFileSync('ui_strings.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8')).toBe(readFileSync('view_export_preview_module.js', 'utf8'));
  });

  it('uses translated accessible text and keeps English fallback when a language lacks the key', () => {
    const key = 'export_preview.accessibility.document_status_bar';
    expect(evaluate('document_status_bar', translator({ [key]: 'Document status translated' }))).toBe('Document status translated');
    expect(evaluate('document_status_bar', () => undefined)).toBe('Document status bar');
  });

  it('passes dynamic page number and heading through the translator without losing the fallback', () => {
    const key = 'export_preview.accessibility.go_to_page_value1_value2';
    const context = { pageIndex: 2, pageDocumentSections: [{ name: 'Results' }], pageHeadings: [] };
    expect(evaluate('go_to_page_value1_value2', translator({ [key]: 'Page {value1}{value2}' }), context)).toBe('Page 3, Results');
    expect(evaluate('go_to_page_value1_value2', () => undefined, context)).toBe('Go to page 3, Results');
  });
});
