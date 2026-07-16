import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

const source = readFileSync('allo_commands_source.jsx', 'utf8');
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

function attribute(opening, name) {
  return opening.attributes.find((item) => item.type === 'JSXAttribute' && item.name.name === name);
}

function stringAttribute(opening, name) {
  const attr = attribute(opening, name);
  return attr?.value?.type === 'StringLiteral' ? attr.value.value : null;
}

const elements = [];
walk(ast, (node) => {
  if (node.type === 'JSXElement') elements.push(node);
});

describe('AlloCommandPalette modal accessibility', () => {
  it('uses an explicitly named, focusable modal dialog', () => {
    const dialog = elements.find((node) => stringAttribute(node.openingElement, 'role') === 'dialog');
    expect(dialog).toBeTruthy();
    expect(stringAttribute(dialog.openingElement, 'aria-modal')).toBe('true');
    expect(stringAttribute(dialog.openingElement, 'aria-labelledby')).toBe('allo-palette-title');
    expect(attribute(dialog.openingElement, 'ref')).toBeTruthy();
    expect(attribute(dialog.openingElement, 'tabIndex')).toBeTruthy();
    expect(source).toContain('id="allo-palette-title"');
  });

  it('contains Tab and outside-focus movement and handles Escape anywhere in the dialog', () => {
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("document.addEventListener('keydown', onDocumentKeyDown, true)");
    expect(source).toContain("document.addEventListener('focusin', onDocumentFocusIn)");
    expect(source).toContain("document.removeEventListener('focusin', onDocumentFocusIn)");
    expect(source).toContain('if (!dialog.contains(event.target)) input.focus()');
    expect(source).toContain("previous.isConnected && typeof previous.focus === 'function'");
  });

  it('keeps listbox options free of nested interactive buttons', () => {
    const options = elements.filter((node) => stringAttribute(node.openingElement, 'role') === 'option');
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(attribute(option.openingElement, 'aria-selected')).toBeTruthy();
      expect(attribute(option.openingElement, 'onClick')).toBeTruthy();
      const nestedButtons = [];
      for (const child of option.children) {
        walk(child, (node) => {
          if (node.type === 'JSXOpeningElement' && elementName(node) === 'button') nestedButtons.push(node);
        });
      }
      expect(nestedButtons).toEqual([]);
    }
  });

  it('provides an explicit non-submit close button with a 44px target', () => {
    const buttons = elements.filter((node) => elementName(node.openingElement) === 'button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(stringAttribute(button.openingElement, 'type')).toBe('button');
    const closeButton = buttons.find((node) => attribute(node.openingElement, 'aria-label'));
    expect(closeButton).toBeTruthy();
    expect(stringAttribute(closeButton.openingElement, 'className')).toContain('min-h-11');
    expect(stringAttribute(closeButton.openingElement, 'className')).toContain('min-w-11');
  });
});
