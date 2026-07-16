import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

const source = readFileSync('annotation_suite_source.jsx', 'utf8');
const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });

function walk(value, visit, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => walk(item, visit, seen));
    else walk(child, visit, seen);
  }
}

function elementName(opening) {
  return opening?.name?.type === 'JSXIdentifier' ? opening.name.name : '';
}

function stringAttribute(opening, name) {
  const attr = opening.attributes.find((item) =>
    item.type === 'JSXAttribute' && item.name.name === name,
  );
  return attr?.value?.type === 'StringLiteral' ? attr.value.value : null;
}

const elements = [];
walk(ast, (node) => {
  if (node.type === 'JSXElement') elements.push(node);
});

describe('Annotation Suite sidebar accessibility', () => {
  it('contains no native button inside an element with button role', () => {
    const roleButtons = elements.filter((node) => stringAttribute(node.openingElement, 'role') === 'button');
    expect(roleButtons.length).toBeGreaterThan(0);
    for (const roleButton of roleButtons) {
      const nested = [];
      for (const child of roleButton.children) {
        walk(child, (node) => {
          if (node.type === 'JSXOpeningElement' && elementName(node) === 'button') nested.push(node);
        });
      }
      expect(nested).toEqual([]);
    }
  });

  it('uses a native row action beside, rather than around, its delete control', () => {
    expect(source).toContain('role="listitem"');
    expect(source).toContain('className="min-h-6 flex-1 min-w-0 rounded text-left');
    expect(source).not.toContain('cursor-pointer transition-colors motion-reduce:transition-none');
    expect(source).not.toContain('onKeyDown={function (e) { if (e.key === \'Enter\' || e.key === \' \')');
  });

  it('names the panel and makes its scrollable list keyboard reachable', () => {
    expect(source).toContain('aria-labelledby="annotation-list-title"');
    expect(source).toContain('<h2 id="annotation-list-title"');
    expect(source).toContain('role="group" aria-label="Filter annotations"');
    expect(source).toContain('role="list" aria-label="Annotations" tabIndex={0}');
  });

  it('uses 24px minimums for the formerly undersized sidebar and editor controls', () => {
    expect(source.match(/inline-flex min-h-6 min-w-6 items-center justify-center/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).toContain("className={'min-h-6 px-2 py-0.5 rounded-full");
    expect(source).toContain('className="min-h-6 px-2 py-0.5');
    expect(source).toContain('className="min-h-6 px-3 py-1');
  });
});
