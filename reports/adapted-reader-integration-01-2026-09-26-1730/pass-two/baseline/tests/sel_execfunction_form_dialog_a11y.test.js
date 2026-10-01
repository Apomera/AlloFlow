import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Executive Function form dialog accessibility', () => {
  const source = read('sel_hub/sel_tool_execfunction.js');

  it('provides a labelled modal form dialog with background isolation', () => {
    expect(source).toContain('function askExecFunctionForm(options)');
    expect(source).toContain("var dialog = document.createElement('form')");
    expect(source).toContain("dialog.setAttribute('role', 'dialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', idBase + '-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('associates labels and validates all fields before submission', () => {
    expect(source).toContain("label.setAttribute('for', fieldId)");
    expect(source).toContain("input.setAttribute('aria-required', 'true')");
    expect(source).toContain('dialog.checkValidity()');
    expect(source).toContain('dialog.reportValidity()');
  });

  it('constrains the time estimate and retains the 25-minute default', () => {
    expect(source).toContain("{ name: 'minutes', label: 'Estimated minutes', type: 'number', value: 25, min: 1, max: 480, step: 1, inputMode: 'numeric' }");
    expect(source).toContain('var min = parseInt(values.minutes, 10) || 25;');
  });

  it('contains focus, cancels on Escape, restores the opener, and blocks background shortcuts', () => {
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('inputs[0].focus();');
  });

  it('supplies WCAG 2.2 targets and routes both add flows through the service', () => {
    expect(source).toContain('min-width:44px;min-height:44px');
    expect(source.match(/askExecFunctionForm\(/g)).toHaveLength(3);
    expect(source).toContain("title: 'Add a habit to track'");
    expect(source).toContain("title: 'Add a day-planner block'");
  });

  it('contains no executable native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/sel_hub/sel_tool_execfunction.js'));
  });
});
