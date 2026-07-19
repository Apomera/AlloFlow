import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const contentEngine = readFileSync('content_engine_source.jsx', 'utf8');
const appSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const wordSoundsSource = readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('source generation language ownership', () => {
  it('uses the UI language for canonical source material', () => {
    expect(contentEngine).toContain("currentUiLanguage = s.currentUiLanguage || 'English';");
    expect(contentEngine).toContain("const effectiveLanguage = currentUiLanguage || 'English';");
    expect(contentEngine).not.toContain('const effectiveLanguage = leveledTextLanguage;');
    expect(contentEngine).toContain("const sourceLanguageInstruction = getSourceLanguageInstruction(effectiveLanguage);");
    expect(contentEngine).toContain('Do not add a translation or bilingual second block.');
    expect(contentEngine).not.toContain('getBilingualPromptInstruction(effectiveLanguage)');
  });

  it('publishes the UI language to the content-engine state bag', () => {
    expect(appSource).toMatch(/__contentEngineState\s*=\s*\{[\s\S]*?generatedContent, currentUiLanguage,/);
  });

  it('gives the Word Sounds disclosures their localized panel name', () => {
    expect(appSource).toContain("aria-label={t('sidebar.tool_wordsounds') || t('word_sounds.title') || 'Word Sounds'}");
    expect(appSource).toContain("aria-expanded={expandedTools.includes('ui-tool-wordsounds')}");
    expect(wordSoundsSource).toContain("tf('word_sounds.title', 'Word Sounds Studio')");
  });
});
