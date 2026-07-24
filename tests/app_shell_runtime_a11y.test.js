import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const modal = fs.readFileSync('view_misc_modals_source.jsx', 'utf8');
const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const bot = fs.readFileSync('allobot_source.jsx', 'utf8');

describe('application shell accessibility remediation', () => {
  it('names the AI backend dialog and keeps its backdrop non-interactive', () => {
    expect(modal).toContain('aria-labelledby="ai-backend-title"');
    expect(modal).toContain('id="ai-backend-title"');
    expect(modal).not.toContain('role="button" tabIndex={0} onKeyDown');
  });
  it('provides a non-empty fallback name for the global mute button', () => {
    expect(app).toContain("muted ? 'Unmute all audio' : 'Mute all audio'");
  });
  it('places floating application status and assistant content in named regions', () => {
    expect(app).toMatch(/<main[^>]*>[\s\S]*?<h1 className="sr-only">AlloFlow<\/h1>/);
    expect(app).toContain('<div role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-4');
    expect(bot).toContain("<aside aria-label={t('bot.assistant_landmark') || 'AlloBot assistant'}>");
    const builder = fs.readFileSync('_build_allobot_module.js', 'utf8');
    expect(builder).toContain("desktop/web-app', 'public', 'allobot_module.js");
  });
  it('uses AA contrast for the AI settings reset button', () => {
    expect(modal).toContain('bg-slate-200 text-slate-700 px-4 py-2.5');
    expect(modal).not.toContain('bg-slate-200 text-slate-600 px-4 py-2.5');
  });
});
