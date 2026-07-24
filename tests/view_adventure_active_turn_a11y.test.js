import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure active-turn accessibility', () => {
  it('exposes accurate state and action names for choice and dictation controls', () => {
    expect(source).toContain('aria-pressed={immersiveShowChoices}');
    expect(source).toContain("aria-label={immersiveShowChoices ? t('adventure.return_to_story') : t('adventure.make_a_choice')}");
    expect(source).toContain("aria-label={isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start')} aria-pressed={isDictationMode}");
    expect(source).toContain("motion-reduce:animate-none' : 'bg-white border-indigo-300");
    expect(source).not.toContain("aria-label={t('common.voice_input')}");
  });

  it('prevents duplicate choice and text submissions while a turn is loading', () => {
    expect(source.match(/onClick=\{\(\) => handleAdventureChoice\(opt\)\} disabled=\{adventureState\.isLoading\}/g)).toHaveLength(2);
    expect(source.match(/disabled=\{!adventureTextInput\.trim\(\) \|\| adventureState\.isLoading\}/g)).toHaveLength(2);
    expect(source.match(/if \(e\.key === 'Enter' && !e\.shiftKey && adventureTextInput\.trim\(\) && !adventureState\.isLoading\)/g)).toHaveLength(2);
    expect(source.match(/type="button" data-help-key="adventure_input_send"/g)).toHaveLength(2);
    expect(source).not.toContain('type="button" type="button"');
    expect(source).not.toContain('disabled={adventureState.isLoading} disabled={adventureState.isLoading}');
  });

  it('gives the teacher option editor specific labels and robust controls', () => {
    expect(source).toContain("<input aria-label={t('adventure.option_placeholder', { n: idx + 1 })}");
    expect(source).toContain("aria-label={(t('adventure.tooltips.remove_option') || 'Remove option') + ' ' + (idx + 1)}");
    expect(source).not.toContain("aria-label={t('common.connect')}");
    expect(source).not.toContain("aria-label={t('common.close')}\n                                                            onClick={() => handleRemoveOptionSlot(idx)}");
    expect(source).toContain('min-w-11 min-h-11 p-2 text-red-700');
    expect(source).toContain('min-h-11 flex-grow bg-green-700');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-green-800');
  });

  it('announces pending, failed, and live-vote state while respecting reduced motion', () => {
    expect(source.match(/role="alert" aria-atomic="true"/g)).toHaveLength(2);
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" className="flex justify-start');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" className="mb-4');
    expect(source).toContain('<span aria-live="polite" aria-atomic="true" className={`text-[11px]');
    expect(source).toContain('motion-reduce:transition-none motion-reduce:transform-none');
    expect(source).toContain('<WifiOff size={24} aria-hidden="true" />');
  });

  it('keeps generated Adventure modules synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('"aria-pressed": isDictationMode');
    expect(rootModule).toContain('disabled: !adventureTextInput.trim() || adventureState.isLoading');
    expect(rootModule).toContain('role: "alert"');
  });
});