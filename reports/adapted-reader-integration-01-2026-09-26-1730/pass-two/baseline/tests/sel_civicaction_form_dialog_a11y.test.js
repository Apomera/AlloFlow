import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Civic Action form dialog accessibility', () => {
  const source = read('sel_hub/sel_tool_civicaction.js');

  it('provides a labelled modal form dialog with background isolation', () => {
    expect(source).toContain('function askCivicActionForm(options)');
    expect(source).toContain("var dialog = document.createElement('form')");
    expect(source).toContain("dialog.setAttribute('role', 'dialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', idBase + '-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('associates labels, enforces required fields, and uses a native date input', () => {
    expect(source).toContain("label.setAttribute('for', fieldId)");
    expect(source).toContain("input.setAttribute('aria-required', 'true')");
    expect(source).toContain('dialog.checkValidity()');
    expect(source).toContain('dialog.reportValidity()');
    expect(source).toContain("{ name: 'date', label: 'Target date (optional)', type: 'date', required: false }");
  });

  it('contains focus, cancels on Escape, restores the opener, and blocks background shortcuts', () => {
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('inputs[0].focus();');
  });

  it('supplies WCAG 2.2 target sizing and routes all three add flows through the service', () => {
    expect(source).toContain('min-width:44px;min-height:44px');
    expect(source.match(/askCivicActionForm\(/g)).toHaveLength(4);
    for (const title of ['Add a stakeholder', 'Add an ally', 'Add an action milestone']) {
      expect(source).toContain(`title: '${title}'`);
    }
  });

  it('contains no executable native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/sel_hub/sel_tool_civicaction.js'));
  });
});
