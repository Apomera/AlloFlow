import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens ABC entry modal accessibility', () => {
  const source = read('behavior_lens_module.js');
  const modalStart = source.indexOf("const ABCModal = (");
  const modalEnd = source.indexOf('// \u2500\u2500\u2500 ABCDataPanel', modalStart);
  const modal = source.slice(modalStart, modalEnd);

  it('uses a presentational backdrop rather than exposing the overlay as a button', () => {
    expect(modal).toContain("role: 'presentation'");
    expect(modal).not.toContain("return h('div', { role: 'button'");
    expect(modal).not.toContain("e.target.click()");
  });

  it('provides a labelled modal dialog and explicit action button behavior', () => {
    expect(modal).toContain('ref: dialogRef');
    expect(modal).toContain("role: 'dialog'");
    expect(modal).toContain("'aria-modal': 'true'");
    expect(modal).toContain("'aria-label': (entry ? 'Edit ABC entry' : 'New ABC entry')");
    expect(modal).toContain("'data-bl-abc-modal-initial': 'true'");
    expect(modal).toContain('Close ABC entry dialog');
    expect(modal).toContain('Cancel ABC entry changes');
  });

  it('moves focus inside, traps Tab in both directions, and closes with Escape', () => {
    expect(modal).toContain("dialog.querySelector('[data-bl-abc-modal-initial]')");
    expect(modal).toContain("if (event.key === 'Escape')");
    expect(modal).toContain("if (event.key !== 'Tab') return");
    expect(modal).toContain('last.focus();');
    expect(modal).toContain('first.focus();');
    expect(modal).toContain('onCloseRef.current();');
  });

  it('removes listeners and restores the opener when the modal unmounts', () => {
    expect(modal).toContain("document.removeEventListener('keydown', handleModalKeyDown, true)");
    expect(modal).toContain('opener && opener.isConnected');
    expect(modal).toContain('opener.focus();');
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/behavior_lens_module.js'));
  });
});
