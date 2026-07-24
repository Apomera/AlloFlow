import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge export accessibility', () => {
  it('keeps built and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('requestExportConsent');
  });

  it('routes all protected exports through awaited consent', () => {
    expect(source).not.toMatch(/\bwindow\.confirm\s*\(/);
    expect(source.match(/await requestExportConsent\(/g)).toHaveLength(4);
    for (const label of ['Export storybook', 'Export comic script', 'Export production pack', 'Export full draft']) {
      expect(source).toContain(`confirmLabel: '${label}'`);
    }
  });

  it('uses a focus-managed named and described alert dialog', () => {
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="sf-export-consent-title"');
    expect(source).toContain('aria-describedby="sf-export-consent-message"');
    expect(source).toContain('ref={exportConsentDialogRef}');
    expect(source).toContain('_storyForgeUseFocusTrap(exportConsentDialogRef, !!exportConsent');
    expect(source).toContain('() => finishExportConsent(false)');
    expect(source).not.toContain('handleExportConsentKeyDown');
  });

  it('names the programmatically created draft file picker', () => {
    expect(source).toContain("input.setAttribute('aria-label', 'Import Story Forge draft file')");
  });
});