import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds source selector keyboard behavior', () => {
  it('uses a named group of native checkboxes for all active source toggles', () => {
    expect(source).toContain('role="group" aria-labelledby="word-sounds-active-sources-label"');
    expect(source.match(/type="checkbox" checked=\{include(?:Glossary|Family|Custom|SightWords|AI)\}/g)?.length).toBe(5);
    expect(source).not.toMatch(/aria-pressed=\{include(?:Glossary|Family|Custom|SightWords|AI)\}/);
    expect(source).not.toContain('<div role="button" tabIndex={0} aria-pressed={include');
  });

  it('keeps the selected glossary card from fragmenting into the Active Sources heading', () => {
    expect(source).toContain('className={`block min-h-11 p-3 rounded-xl border-2 transition-all cursor-pointer');
  });

  it('describes the current Word Sounds preload volume accurately', () => {
    expect(source).toContain('Preloading can synthesize dozens of audio clips per word');
    expect(source).toContain('prompts, choices, phonemes, syllables, and feedback');
    expect(source).not.toContain('~5 audio clips per word');
  });

  it('uses native disabled and checked state for the lesson-plan toggle', () => {
    expect(source).toContain('type="checkbox" checked={includeLessonPlan} disabled={sessionType === \'assessment\'}');
    expect(source).not.toContain('aria-disabled={sessionType === \'assessment\'} aria-pressed={includeLessonPlan}');
    expect(source).not.toContain("sessionType !== 'assessment' && (e.key === 'Enter' || e.key === ' ')");
    expect(source.match(/focus-within:ring-2/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('synchronizes both generated module copies', () => {
    expect(fs.readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8')).toBe(fs.readFileSync('word_sounds_setup_module.js', 'utf8'));
    expect(fs.readFileSync('_build_word_sounds_setup_module.js', 'utf8')).toContain('// WCAG 2.2 AA: Accessibility CSS');
  });

  it('uses a safe-default accessible dialog for voice-pack deletion', () => {
    expect(source).not.toContain("window.confirm(T('word_sounds.voice_pack_confirm_delete'");
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="voice-pack-delete-title" aria-describedby="voice-pack-delete-message"');
    expect(source).toContain('ref={deletePackCancelRef}');
    expect(source).toContain('deletePackCancelRef.current?.focus()');
    expect(source).toContain('onKeyDownCapture={handleDeletePackDialogKeyDown}');
  });

  it('keeps deletion separate from requesting consent', () => {
    expect(source).toContain('const performDeletePack = () => {');
    expect(source).toContain('const deletePack = () => {');
    expect(source).toContain('setShowDeletePackConfirm(true)');
    expect(source).toContain('onClick={performDeletePack}');
  });
  it('focus-manages the setup-source review dialog', () => {
    expect(source).toContain('ref={reviewDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="word-sounds-review-title" aria-describedby="word-sounds-review-description"');
    expect(source).toContain('reviewBackRef.current?.focus()');
    expect(source).toContain('onClick={requestBackToSetup}');
  });

  it('removes every browser confirmation from setup source', () => {
    expect(source).not.toMatch(/\bwindow\.confirm\s*\(/);
    expect(source).toContain('aria-labelledby="probe-end-title" aria-describedby="probe-end-message"');
    expect(source).toContain('probeCancelRef.current?.focus()');
  });});
