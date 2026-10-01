import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import parser from '@babel/parser';

const source = readFileSync('games_source.jsx', 'utf8');
const ast = parser.parse(source, { sourceType: 'script', plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'] });
const buttons = [];
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && node.name.name === 'button') buttons.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
};
visit(ast);

describe('games button semantics', () => {
  it('gives every native game button an explicit non-submit type', () => {
    const missing = buttons.filter((node) => !node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type'));
    expect(missing.map((node) => node.loc.start.line)).toEqual([]);
    expect(buttons.some((node) => node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type' && a.value?.value === 'submit'))).toBe(false);
  });

  it('does not introduce an implicit form submission context', () => {
    expect(source).not.toMatch(/<form\b|onSubmit=/);
  });
});
