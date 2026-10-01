import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const studio = readFileSync(resolve(process.cwd(), 'studio_module.js'), 'utf8');
const uiStrings = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');

describe('cross-platform lesson deck import', () => {
  it('includes lesson decks in the existing Source upload control', () => {
    expect(anti).toContain('onChange={handleSourceFileUpload}');
    expect(anti).toContain('accept="image/*,application/pdf,.docx,.pptx');
    expect(anti).toContain("aria-label={t('common.upload_file') || 'Upload file'}");
    expect(uiStrings).toContain('"upload_tooltip": "Upload a document, editable PowerPoint lesson deck, image, audio, or video"');
    expect(anti).not.toContain('handleLessonDeckImport');
    expect(anti).not.toContain('showLessonDeckImport');
    expect(anti).not.toContain("t('lesson_import.button') || 'Import lesson deck'");
  });

  it('opens uploaded PPTX as editable slides and leaves other files on the existing document pipeline', () => {
    expect(anti).toContain('const handleSourceFileUpload = (e) => {');
    expect(anti).toContain("fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'");
    expect(anti).toContain("/\\.pptx$/i.test(fileName)");
    expect(anti).toContain('if (!isLessonDeckPptx) return handleFileUpload(e);');
    expect(anti).toContain("setAlloStudioInitialAction('import-lesson-deck')");
    expect(anti).toContain('setAlloStudioInitialFile(file)');
    expect(anti).toContain('setIsAlloStudioOpen(true)');
    expect(anti).toContain('initialFile: alloStudioInitialFile');
  });

  it('imports a host-provided PPTX once and explains the activity boundary honestly', () => {
    expect(studio).toContain("props.initialAction === 'import-lesson-deck'");
    expect(studio).toContain('files: [props.initialFile]');
    expect(studio).toContain("TT('studio.import_pptx', 'Import lesson deck (.pptx)')");
    expect(studio).toContain('proprietary activities');
    expect(studio).toContain('launch them from the Live Dashboard');
  });
});
