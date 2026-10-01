import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

const source = readFileSync('dynamic_assessment_module.js', 'utf8');
const mirror = readFileSync('desktop/web-app/public/dynamic_assessment_module.js', 'utf8');
const ast = parse(source, { sourceType: 'script' });

function walk(value, visit, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => walk(item, visit, seen));
    else walk(child, visit, seen);
  }
}

function hCall(node, tagName) {
  return node.type === 'CallExpression'
    && node.callee?.type === 'Identifier'
    && node.callee.name === 'h'
    && node.arguments[0]?.type === 'StringLiteral'
    && node.arguments[0].value === tagName;
}

function propertyName(property) {
  if (property.type !== 'ObjectProperty' && property.type !== 'ObjectMethod') return '';
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'StringLiteral') return property.key.value;
  return '';
}

function propertiesFor(call) {
  const props = call.arguments[1];
  return props?.type === 'ObjectExpression' ? props.properties : [];
}

const formControls = [];
const tableHeaders = [];
walk(ast, (node) => {
  if (['input', 'select', 'textarea'].some((tag) => hCall(node, tag))) formControls.push(node);
  if (hCall(node, 'th')) tableHeaders.push(node);
});

describe('Dynamic Assessment form and table accessibility', () => {
  it('gives every rendered native form control an explicit accessible name', () => {
    expect(formControls).toHaveLength(88);
    for (const control of formControls) {
      const names = propertiesFor(control).map(propertyName);
      expect(names.some((name) => name === 'aria-label' || name === 'aria-labelledby')).toBe(true);
    }
  });

  it('gives every generated table header an explicit scope', () => {
    expect(tableHeaders).toHaveLength(42);
    for (const header of tableHeaders) {
      const scope = propertiesFor(header).find((property) => propertyName(property) === 'scope');
      expect(scope?.value?.type).toBe('StringLiteral');
      expect(['col', 'row']).toContain(scope?.value?.value);
    }
  });

  it('keeps the dialog shell focus indicator visible in normal and forced-colors modes', () => {
    expect(source.match(/\.da-shell:focus-visible/g)).toHaveLength(2);
    expect(source).not.toContain('style: { outline: "none" }');
    expect(source).toContain('outline: 3px solid var(--da-focus)');
    expect(source).toContain('outline: 3px solid Highlight');
  });

  it('keeps temporary clipboard and restore-file controls named and outside the tab order', () => {
    expect(source).toContain('ta.setAttribute("aria-label", "Temporary clipboard text")');
    expect(source).toContain('ta.readOnly = true');
    expect(source).toContain('ta.tabIndex = -1');
    expect(source).toContain('var previousFocus = document.activeElement');
    expect(source).toContain('if (ta && ta.parentNode) ta.parentNode.removeChild(ta)');
    expect(source).toContain('previousFocus.focus()');
    expect(source).toContain('input.setAttribute("aria-label", "Restore sessions from an encrypted or legacy JSON backup file")');
    expect(source).toContain('input.tabIndex = -1');
  });

  it('keeps the active deployment mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });
});
