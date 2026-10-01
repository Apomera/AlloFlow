import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_misc_panels_source.jsx', 'utf8');
const built = readFileSync('view_misc_panels_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_misc_panels_module.js', 'utf8');

describe('PDF workbench refinement prompt accessibility', () => {
  it('uses the shared contained prompt instead of a native browser prompt', () => {
    expect(source).not.toContain("window.prompt((t('diff_view.refine_prompt')");
    expect(source).toContain("typeof window.AlloFlowUX.prompt === 'function'");
    expect(source).toContain("await window.AlloFlowUX.prompt(refinePrompt, '', {");
  });

  it('provides explicit labels, multiline entry, and a bounded input', () => {
    expect(source).toContain("title: t('diff_view.refine_title') || 'Refine selected passage'");
    expect(source).toContain("confirmText: t('diff_view.refine_action') || 'Refine passage'");
    expect(source).toContain("cancelText: t('common.cancel') || 'Cancel'");
    expect(source).toContain("placeholder: t('diff_view.refine_placeholder') || 'Describe the change you want…'");
    expect(source).toContain('multiline: true');
    expect(source).toContain('maxLength: 1000');
  });

  it('keeps both generated modules byte-identical', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('AlloFlowUX.prompt(refinePrompt, "", {');
    expect(built).not.toContain('window.prompt(t("diff_view.refine_prompt")');
  });
});
