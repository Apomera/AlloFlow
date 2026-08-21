import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dispatcherPath = resolve(process.cwd(), 'generate_dispatcher_source.jsx');
const source = readFileSync(dispatcherPath, 'utf8');

describe('generation dispatcher canonical identity handoff', () => {
  it('marks reviewed matrix contexts as derived and carries the input signature', () => {
    expect(source).toContain('contextFingerprintDerived: _generationContextIsDerived');
    expect(source).toContain('contextInputsFingerprint: _generationContextInputsFingerprint');
    expect(source).toContain('configOverride.generationMatrixManaged === true');
    expect(source).toContain('|| !!configOverride.generationIdentity');
  });

  it('projects and persists non-secret provider/model generation identity', () => {
    expect(source).toContain('const _generationProviderProfile = (() => {');
    expect(source).toContain('generationConfig: _resolvedGenerationConfig');
    expect(source).toContain('generationConfigFingerprint: _resolvedGenerationConfigFingerprint');
    expect(source).toContain('fallbackModel: _generationProviderProfile.fallbackModel');
    expect(source).toContain('imageProvider: _generationProviderProfile.imageProvider');
    expect(source).toContain('imageModel: _generationProviderProfile.imageModel');
    expect(source).not.toMatch(/generationConfig[^\n]*apiKey/);
  });

  it('does not stamp a stale reviewed key after runtime provider/config drift', () => {
    expect(source).toContain('_reviewedGenerationConfigFingerprint !== _resolvedGenerationConfigFingerprint');
    expect(source).toContain('{ key: _directCell.generationIdentity, type }');
    expect(source).toContain('reviewedGenerationConfigDrift: _reviewedGenerationConfigDrift');
    expect(source).toContain('reviewedGenerationIdentityKey: _reviewedGenerationConfigDrift');
  });

  it('uses the matrix language normalizer for both cells and fan-out', () => {
    expect(source).toContain('_generationMatrixModule.normalizeLanguageValue(_rawEffectiveLanguage');
    expect(source).toContain('_generationMatrixModule.normalizeLanguageValues(langsToGen, \'English\')');
    expect(source).not.toContain('const uniqueLangs = [...new Set(langsToGen)]');
  });
});
