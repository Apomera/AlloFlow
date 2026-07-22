import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const handlersSource = readFileSync('adventure_handlers_source.jsx', 'utf8');
const handlersModule = readFileSync('adventure_handlers_module.js', 'utf8');
const sessionSource = readFileSync('adventure_session_handlers_source.jsx', 'utf8');
const sessionModule = readFileSync('adventure_session_handlers_module.js', 'utf8');
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');

describe('Adventure cast-review establishing shot', () => {
  it('generates a characterless setting image while cast review is open', () => {
    expect(handlersSource).toContain('callGemini, callGeminiVision, callImagen, addToast');
    expect(handlersSource).toContain('Wide establishing shot introducing this setting:');
    expect(handlersSource).toContain('absolutely no people, no characters, no text');
    expect(handlersSource).toContain('prev.isReviewingCharacters');
    expect(handlersSource).toContain('? { ...prev, sceneImage: url, isImageLoading: false }');
    expect(anti).toMatch(/const _alloAdventureHandlersDeps[\s\S]*callGemini,[\s\S]*callImagen,/);
  });

  it('keeps the generated handler module and deployed copy synchronized', () => {
    expect(handlersModule).toContain('Adventure establishing shot failed');
    expect(readFileSync('prismflow-deploy/public/adventure_handlers_module.js', 'utf8')).toBe(handlersModule);
  });
});

describe('Adventure structured character extraction retry', () => {
  it('tries a JSON extraction before the regex and preserves the final fallback', () => {
    const retryIndex = handlersSource.indexOf('From this opening scene, extract 2–4 characters as JSON.');
    const regexIndex = handlersSource.indexOf('const nameMatches = sceneText.match');
    expect(retryIndex).toBeGreaterThan(-1);
    expect(regexIndex).toBeGreaterThan(retryIndex);
    expect(handlersSource).toContain('const cleanedExtraction = cleanJson(extractionResult)');
    expect(handlersSource).toContain('await resilientJsonParse(cleanedExtraction)');
    expect(handlersSource).toContain("name: 'Your Character', role: 'Protagonist'");
  });
});

describe('Gemini-gated cast reference sheet', () => {
  it('composites up to four portraits only for the Gemini image backend', () => {
    expect(sessionSource).toContain('const createAdventureReferenceSheet = async (characters) =>');
    expect(sessionSource).toContain('.filter(character => character?.portrait)');
    expect(sessionSource).toContain('.slice(0, 4)');
    expect(sessionSource).toContain("document.createElement('canvas')");
    expect(sessionSource).toContain('isGeminiImageBackend && portraitCharacters.length >= 2');
    expect(anti).toContain("isGeminiImageBackend: _isCanvasEnv || String(_aiConfig?.backend || 'gemini').trim().toLowerCase() === 'gemini'");
  });

  it('uses the cast prompt and falls back to the protagonist portrait on composite failure', () => {
    expect(sessionSource).toContain("The attached reference sheet shows this story's cast.");
    expect(sessionSource).toContain('falling back to the protagonist portrait');
    expect(sessionSource).toContain("let referenceBase64 = protagonist?.portrait?.split(',')[1] || null");
    expect(sessionSource).toContain('callGeminiImageEdit(consistencyPrompt, currentBase64, targetWidth, targetQual, referenceBase64)');
  });

  it('keeps the generated session module and deployed copy synchronized', () => {
    expect(sessionModule).toContain('createAdventureReferenceSheet');
    expect(readFileSync('prismflow-deploy/public/adventure_session_handlers_module.js', 'utf8')).toBe(sessionModule);
  });
});

describe('consistent character rollout default', () => {
  it('remains opt-in', () => {
    expect(anti).toContain('adventureConsistentCharacters: false');
  });
});