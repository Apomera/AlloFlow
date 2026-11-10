import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds source selector keyboard behavior', () => {
  it('uses a named group of native checkboxes for all active source toggles', () => {
    expect(source).toContain('role="group" aria-labelledby="word-sounds-active-sources-label"');
    // 2026-11-10: Word Family, Sight Words and both syllable banks became one labelled native select with an Add button.
    expect(source.match(/type="checkbox" checked=\{include(?:Glossary|Custom|AI)\}/g)?.length).toBe(3);
    expect(source).not.toMatch(/checked=\{include(?:Family|SightWords|SyllableWords|SyllableCountWords)\}/);
    expect(source).toContain('<label htmlFor="ws-ready-list-select"');
    expect(source).toMatch(/<select id="ws-ready-list-select" aria-describedby="ws-ready-list-help"/);
    expect(source).toMatch(/<optgroup key=\{group\.id\} label=\{tf\(group\.labelKey, group\.label\)\}>/);
    expect(source).toMatch(/<button type="button" onClick=\{addReadyList\} disabled=\{!readyListPick\} data-ws-ready-list-add="true"/);
    expect(source).toContain("aria-label={tf('word_sounds.ready_list_remove_named', 'Remove list: {name}', { name })}");
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

  // 2026-11-10 (plan first): the lesson-plan toggle is gone (a lesson always has a plan). The one
  // checkbox beside the plan, free roaming, is a native checkbox with native checked and disabled state.
  it('uses native disabled and checked state for the free-roaming checkbox', () => {
    expect(source).toContain('<input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-violet-700" checked={!!freeRoaming || !includeLessonPlan} disabled={!includeLessonPlan}');
    expect(source).not.toContain('checked={includeLessonPlan}');
    expect(source).not.toContain('aria-disabled={sessionType === \'assessment\'} aria-pressed={includeLessonPlan}');
    expect(source).not.toContain("sessionType !== 'assessment' && (e.key === 'Enter' || e.key === ' ')");
    // The source checkboxes keep a visible focus ring; the picker's select and buttons have their own.
    expect(source.match(/focus-within:ring-2/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/focus-visible:ring-2 focus-visible:ring-pink-600/g)?.length).toBeGreaterThanOrEqual(3);
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
  // The setup-source review dialog and its probe-end confirmation lived in
  // the fossil review panel deleted 2026-08-11; the live review dialog is
  // the misc_components panel, hosted by the player modal.
  it('removes every browser confirmation from setup source', () => {
    expect(source).not.toMatch(/\bwindow\.confirm\s*\(/);
  });});
