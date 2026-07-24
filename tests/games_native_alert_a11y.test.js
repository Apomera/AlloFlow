import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const source = read('games_source.jsx');
const built = read('games_module.js');
const deployed = read('desktop/web-app/public/games_module.js');

describe('Concept Sort unavailable-feature announcement', () => {
  it('announces through the existing atomic live region without a native alert', () => {
    expect(source).toContain("const message = t('common.coming_soon') || 'This feature is coming soon.';");
    expect(source).toContain('setAnnouncement(message);');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).not.toContain("else alert(t('common.coming_soon'))");
  });

  it('uses the shared toast only when its callable API is available', () => {
    expect(source).toContain("typeof window.AlloFlowUX.toast === 'function'");
    expect(source).toContain("window.AlloFlowUX.toast(message, 'info')");
  });

  it('keeps generated and deployed game bundles synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('This feature is coming soon.');
    expect(built).not.toContain("else alert(t('common.coming_soon'))");
  });
});
