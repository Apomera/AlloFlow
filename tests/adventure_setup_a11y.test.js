import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure saved-game and setup accessibility', () => {
  it('groups setup sections and associates visible labels with core fields', () => {
    expect(source).toContain('role="group" aria-labelledby="adventure-setup-core-heading"');
    expect(source).toContain('role="group" aria-labelledby="adventure-setup-modifiers-heading"');
    expect(source).toContain('role="group" aria-labelledby="adventure-setup-customization-heading"');
    expect(source).toContain('htmlFor="adventure-setup-input-mode"');
    expect(source).toContain('id="adventure-setup-input-mode"');
    expect(source).toContain('htmlFor="adventure-setup-difficulty"');
    expect(source).toContain('id="adventure-setup-difficulty"');
    expect(source).toContain('htmlFor="adventure-setup-language"');
    expect(source).toContain('id="adventure-setup-language"');
    expect(source).not.toContain("aria-label={t('common.selection')}");
  });

  it('uses visible checkbox labels and larger focusable targets', () => {
    expect(source.match(/min-h-11 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer focus-within/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source.match(/w-5 h-5 shrink-0/g)?.length).toBeGreaterThanOrEqual(7);
    expect(source).not.toContain('common.toggle_adventure_free_response_enabled');
    expect(source).not.toContain('common.toggle_adventure_chance_mode');
    expect(source).not.toContain('common.toggle_is_adventure_story_mode');
    expect(source).not.toContain('common.toggle_enable_auto_climax_false');
    expect(source).toContain('text-[11px] text-slate-700');
  });

  it('associates climax and custom-instruction labels with their fields', () => {
    expect(source).toContain('htmlFor="adventure-setup-climax-min-turns"');
    expect(source).toContain('id="adventure-setup-climax-min-turns"');
    expect(source).toContain('htmlFor="adventure-setup-custom-instructions"');
    expect(source).toContain('id="adventure-setup-custom-instructions"');
    expect(source).not.toContain('common.enter_adventure_state');
    expect(source).toContain('resize-y focus:border-indigo-700');
  });

  it('provides accurate saved-game and Start action names with robust focus', () => {
    expect(source).toContain("aria-label={t('adventure.resume')}");
    expect(source).toContain("aria-label={t('adventure.start_overwrite')}");
    expect(source).toContain("aria-label={t('adventure.back_to_resume')}");
    expect(source).toContain("aria-label={t('adventure.start')}");
    expect(source).not.toContain("aria-label={t('common.history')}");
    expect(source).not.toContain("aria-label={t('common.generate')}");
    expect(source).toContain('disabled={adventureState.isLoading} aria-busy={adventureState.isLoading}');
    expect(source).toContain('focus-visible:ring-offset-indigo-600');
  });

  it('supports narrow layouts and reduced motion while hiding decoration', () => {
    expect(source).toContain('p-4 sm:p-6 space-y-6 custom-scrollbar');
    expect(source).toContain('text-xl sm:text-2xl font-black uppercase tracking-wide sm:tracking-widest');
    expect(source).toContain('px-8 sm:px-16 py-4');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transform-none');
    expect(source).toContain('<History size={20} aria-hidden="true"/>');
    expect(source).toContain('<ArrowDown className="rotate-90" size={20} aria-hidden="true"/>');
  });

  it('keeps generated Adventure modules synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('"aria-labelledby": "adventure-setup-core-heading"');
    expect(rootModule).toContain('id: "adventure-setup-input-mode"');
    expect(rootModule).toContain('"aria-busy": adventureState.isLoading');
  });
});