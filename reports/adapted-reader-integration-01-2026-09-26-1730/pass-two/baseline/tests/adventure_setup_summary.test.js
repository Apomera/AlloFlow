import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { transformSync } from '@babel/core';
const compiled = transformSync(fs.readFileSync('view_adventure_settings_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
const summary = new Function('React', compiled + ';return adventureSetupSummaryParts;')({});
const base = { t: key => key, adventureInputMode: 'choice', adventureLanguageMode: 'English', adventureState: { episodeTurnLimit: 12, choiceCount: 4, enableAutoClimax: true } };

describe('Adventure setup summary reflects effective settings', () => {
  it('names social practice and the skill without relabeling it as standard adventure', () => {
    expect(summary({ ...base, isSocialStoryMode: true, socialStoryFocus: 'Resolving disagreements' })).toEqual([
      'Social Practice', 'Resolving disagreements', '12 decisions', '4 suggested choices', 'English', 'Final challenge: On'
    ]);
  });
  it('shows open-ended writing and the disabled finale independently', () => {
    expect(summary({ ...base, adventureInputMode: 'debate', adventureFreeResponseEnabled: true, adventureState: { episodeTurnLimit: null, enableAutoClimax: false } }))
      .toEqual(['Evidence Debate', 'Open-ended', 'Write or dictate', 'English', 'Final challenge: Off']);
  });
  it('uses the same target and fallback as Adventure generation for translated stories', () => {
    const translated = { ...base, adventureLanguageMode: 'Spanish + English', currentUiLanguage: 'French', translationMode: 'auto' };
    expect(summary({ ...translated, resolveTranslationPolicy: () => ({ enabled: true, target: 'French' }) })).toContain('Spanish · French translation');
    expect(summary({ ...translated, resolveTranslationPolicy: () => ({ enabled: false, target: null }) })).toContain('Spanish · English translation');
    expect(summary({ ...translated, resolveTranslationPolicy: () => { throw Error('unavailable'); } })).toContain('Spanish · English translation');
    expect(summary({ ...translated, adventureLanguageMode: 'All + English', selectedLanguages: ['Spanish', 'German'], resolveTranslationPolicy: () => ({ enabled: false }) })).toContain('Spanish, German · French translation');
  });
});
