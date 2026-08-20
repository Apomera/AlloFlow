import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const studio = readFileSync(resolve(process.cwd(), 'studio_module.js'), 'utf8');
const uiStrings = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');

describe('cross-platform lesson deck import', () => {
  it('offers an accessible PowerPoint/PDF chooser from the Source panel', () => {
    expect(anti).toContain("t('lesson_import.button') || 'Import lesson deck'");
    expect(anti).toContain('aria-labelledby="lesson-deck-import-title"');
    expect(anti).toContain('accept="application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"');
    expect(anti).toContain('accept="application/pdf,.pdf"');
    expect(anti).toContain('Curipod, Nearpod, Pear Deck, Google Slides');
    expect(uiStrings).toContain('"lesson_import": {');
    expect(uiStrings).toContain('"button": "Import lesson deck"');
  });

  it('opens PPTX as editable slides and sends PDF through the existing document pipeline', () => {
    expect(anti).toContain("setAlloStudioInitialAction('import-lesson-deck')");
    expect(anti).toContain('setAlloStudioInitialFile(file)');
    expect(anti).toContain('initialFile: alloStudioInitialFile');
    expect(anti).toContain("return handleFileUpload({ target: { files: [file], value: '' }");
  });

  it('imports a host-provided PPTX once and explains the activity boundary honestly', () => {
    expect(studio).toContain("props.initialAction === 'import-lesson-deck'");
    expect(studio).toContain('files: [props.initialFile]');
    expect(studio).toContain("TT('studio.import_pptx', 'Import lesson deck (.pptx)')");
    expect(studio).toContain('proprietary activities');
    expect(studio).toContain('launch them from the Live Dashboard');
  });
});
