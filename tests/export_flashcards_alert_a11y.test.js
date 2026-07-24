import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');
const source = read('export_source.jsx');
const built = read('export_module.js');
const deployed = read('desktop/web-app/public/export_module.js');

describe('flashcard translation export notifications', () => {
  it('uses non-blocking app notifications when translations are unavailable', () => {
    expect(source).toContain("const { generatedContent, t, addToast } = liveRef.current;");
    expect(source).toContain("if (typeof addToast === 'function') addToast(message, 'error');");
    expect(source).toContain("typeof window.AlloFlowUX.toast === 'function'");
    expect(source).not.toContain("else alert(t('flashcards.no_translations'))");
  });

  it('provides a meaningful fallback announcement string', () => {
    expect(source).toContain("t('flashcards.no_translations') || 'No translated flashcards are available to export.'");
  });

  it('keeps generated and deployed modules synchronized without the native alert', () => {
    expect(built).toBe(deployed);
    expect(built).toContain("typeof addToast === 'function'");
    expect(built).not.toContain("else alert(t('flashcards.no_translations'))");
  });
});
