import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import parser from '@babel/parser';

const source = readFileSync('view_header_source.jsx', 'utf8');

const openingElements = [];
const ast = parser.parse(source, { sourceType: 'script', plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'] });
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement') openingElements.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
};
visit(ast);

describe('header control accessibility', () => {
  it('gives every native button an explicit non-submit type', () => {
    const buttons = openingElements.filter((node) => node.name.type === 'JSXIdentifier' && node.name.name === 'button');
    const missing = buttons.filter((node) => !node.attributes.some((a) => a.type === 'JSXAttribute' && a.name.name === 'type'));
    expect(missing.map((node) => node.loc.start.line)).toEqual([]);
    expect(source).not.toContain('type="submit"');
  });

  it('makes the dismissible help tip keyboard operable and motion-safe', () => {
    expect(source).toContain('onClick={dismissHelpOnboarding}');
    expect(source).toContain("aria-label={t('common.dismiss') || 'Dismiss help tip'}");
    expect(source).toContain('animate-bounce motion-reduce:animate-none');
    expect(source).not.toMatch(/<div\s+onClick=\{dismissHelpOnboarding\}/);
  });
});
