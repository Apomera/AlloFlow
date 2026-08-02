import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge import recovery', () => {
  it('validates bounded package versions and snapshots before applying them', () => {
    expect(source).toContain('const STORYFORGE_MAX_IMPORT_BYTES = 120 * 1024 * 1024;');
    expect(source).toContain('const validateStoryForgeImport = (value) =>');
    expect(source).toContain("if (version > STORYFORGE_PROJECT_VERSION) return { valid: false, code: 'newer-version', version };");
    expect(source).toContain("if (!hasStoryData) return { valid: false, code: 'missing-snapshot' };");
    expect(source).toContain('if (file.size > STORYFORGE_MAX_IMPORT_BYTES)');
  });

  it('protects active work with an accessible manifest-aware confirmation', () => {
    expect(source).toContain('if (hasMeaningfulDraft())');
    expect(source).toContain('const requestImportConfirmation = (candidate)');
    expect(source).toContain('id="sf-import-confirm-title"');
    expect(source).toContain('Replace and import');
    expect(source).toContain("finishImportConfirmation('checkpoint')");
    expect(source).toContain("saveRevisionCheckpoint('Before import')");
    expect(source).toContain('_storyForgeUseFocusTrap(importConfirmationDialogRef, !!importConfirmation');
    expect(deployed).toBe(built);
  });
});