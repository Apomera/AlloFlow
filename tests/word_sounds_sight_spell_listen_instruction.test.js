// Sight & Spell hides the word and plays it, so its spoken instruction must say "listen", not "look"
// (2026-11-08). The bank's inst_orthography recording says "look at the word and choose the correct
// spelling"; inst_spelling_bee says "listen to the word and spell it", which is what the learner does.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const files = ['word_sounds_module.js', 'word_sounds_readiness_contract.js', 'module_scope_extras_module.js',
  'view_word_sounds_preview_module.js', 'host_handlers_module.js', 'word_sounds_take_home_loader.js', 'word_sounds_take_home/adapters/orthography.js'];

describe('Sight & Spell instruction', () => {
  for (const file of files) {
    it(file + ' maps it to the "listen" recording', () => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/orthography\s*:\s*["']inst_orthography["']/);
      expect(src).not.toMatch(/bankClip\('instructions', 'inst_orthography'\)/);
      expect(src).toMatch(/orthography\s*:\s*["']inst_spelling_bee["']|bankClip\('instructions', 'inst_spelling_bee'\)/);
    });
  }
  it('the practice view never shows the word, only a play button', () => {
    const src = readFileSync('word_sounds_module.js', 'utf8');
    const view = src.slice(src.indexOf('    const OrthographyView = React.memo('), src.indexOf('    const OrthographyView = React.memo(') + 12000);
    expect(view).toContain('ts("word_sounds.hear_word_again") || "Hear Word Again"');
  });
});
