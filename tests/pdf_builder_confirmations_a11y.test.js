import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');
let axe;
let opener;
let content;

function loadConfirmationHelper(doc) {
  const start = source.indexOf('const askBuilderConfirmation =');
  const marker = source.indexOf('FOCUS DELEGATION', start);
  const end = source.lastIndexOf('\n', marker);
  expect(start).toBeGreaterThan(-1);
  expect(marker).toBeGreaterThan(start);
  let expression = source.slice(start, end);
  expression = expression.slice(expression.indexOf('=') + 1).trim().replace(/;\s*$/, '');
  return new Function('doc', `return (${expression});`)(doc);
}

beforeAll(() => {
  axe = require(resolve(modulesDir, 'axe-core'));
});

afterEach(() => {
  document.querySelector('[role="alertdialog"]')?.parentElement?.remove();
  document.getElementById('allo-builder-confirm-style')?.remove();
  opener?.remove();
  content?.remove();
  opener = content = null;
});

describe('PDF Document Builder confirmation accessibility', () => {
  it('replaces both iframe browser confirmations and preserves generated-module parity', () => {
    expect(source.match(/\bwin\.confirm\s*\(/g) || []).toHaveLength(0);
    expect(source.match(/await askBuilderConfirmation\s*\(/g)).toHaveLength(2);
    expect(source).toContain("doc.addEventListener('change', async (ev) => {");
    expect(source).toContain("title: 'Embed this large image?'");
    expect(source).toContain("title: 'Replace the sentence frame template?'");
    expect(source).toContain('setTimeout(() => { try { newSelect.focus(); } catch (_) {} }, 0)');
    const helper = source.slice(source.indexOf('const askBuilderConfirmation ='), source.indexOf('FOCUS DELEGATION'));
    expect(helper).not.toContain('innerHTML');
    expect(helper).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(helper).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(helper).toContain("el.setAttribute('inert', '')");
    expect(helper).toContain("el.setAttribute('aria-hidden', 'true')");
    expect(helper).toContain("if (event.key === 'Escape')");
    expect(helper).toContain("if (event.key !== 'Tab') return");
    expect(helper).toContain('cancel.focus()');
    expect(helper).toContain('if (createdStyle) { try { style.remove(); }');
    expect(readFileSync('desktop/web-app/public/view_pdf_audit_module.js', 'utf8'))
      .toBe(readFileSync('view_pdf_audit_module.js', 'utf8'));
  });

  it('renders a safe-default dialog, isolates the builder, traps focus, restores focus, and passes axe', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Choose image';
    content = document.createElement('main');
    content.textContent = 'Document builder content';
    content.setAttribute('aria-hidden', 'false');
    document.body.append(opener, content);
    opener.focus();
    const askBuilderConfirmation = loadConfirmationHelper(document);

    const pending = askBuilderConfirmation({
      title: 'Embed this large image?',
      description: 'The file is large. Continue?',
      confirmLabel: 'Embed image',
    });
    const dialog = document.querySelector('[role="alertdialog"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const [cancel, confirm] = buttons;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('allo-builder-confirm-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('allo-builder-confirm-description');
    expect(document.activeElement).toBe(cancel);
    expect(buttons.map((button) => button.type)).toEqual(['button', 'button']);
    expect(buttons.every((button) => button.className === 'allo-builder-confirm-button')).toBe(true);
    expect(opener.hasAttribute('inert')).toBe(true);
    expect(opener.getAttribute('aria-hidden')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);
    expect(content.getAttribute('aria-hidden')).toBe('true');

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(confirm);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(cancel);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(await pending).toBe(false);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.getElementById('allo-builder-confirm-style')).toBeNull();
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(opener.hasAttribute('aria-hidden')).toBe(false);
    expect(content.hasAttribute('inert')).toBe(false);
    expect(content.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(opener);

    const accepted = askBuilderConfirmation({ title: 'Replace?', description: 'Edits will be lost.', confirmLabel: 'Replace', danger: true });
    document.querySelector('[role="alertdialog"] button:last-child').click();
    expect(await accepted).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});
