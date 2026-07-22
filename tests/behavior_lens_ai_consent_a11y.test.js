import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('BehaviorLens AI consent dialog accessibility', () => {
  const source = read('behavior_lens_module.js');

  it('uses a named and described modal dialog inside a presentational backdrop', () => {
    expect(source).toContain("showAiConsentModal && h('div', {\r\n                role: 'presentation'");
    expect(source).toContain('ref: aiConsentDialogRef');
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("'aria-labelledby': 'bl-ai-consent-title'");
    expect(source).toContain("'aria-describedby': 'bl-ai-consent-description'");
    expect(source).toContain("id: 'bl-ai-consent-description'");
  });

  it('moves focus into the dialog and contains forward and reverse Tab navigation', () => {
    expect(source).toContain("dialog.querySelector('[data-bl-ai-consent-initial]')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('document.activeElement === first');
    expect(source).toContain('document.activeElement === last');
    expect(source).toContain('last.focus();');
    expect(source).toContain('first.focus();');
  });

  it('closes with Escape and restores the AI toggle as opener', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('aiConsentOpenerRef.current = event.currentTarget');
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain("document.removeEventListener('keydown', handleDialogKeyDown, true)");
  });

  it('uses explicit non-submit button behavior for both consent actions', () => {
    expect(source).toContain("'data-bl-ai-consent-initial': 'true'");
    const modal = source.slice(source.indexOf("showAiConsentModal && h('div'"));
    expect(modal.match(/type: 'button'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/behavior_lens_module.js'));
  });
});
