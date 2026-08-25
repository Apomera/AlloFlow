import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const helperStart = source.indexOf('const _BUILDER_STYLE_GALLERY');
const helperEnd = source.indexOf('function ExportPreviewView');
const preflight = new Function(source.slice(helperStart, helperEnd) + '\nreturn _builderExportPreflight;')();

describe('format-specific export preflight', () => {
  it('warns when downloaded HTML still references internet-hosted assets', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Export checks';
    document.body.innerHTML = '<h1>Export checks</h1><img src="https://example.test/diagram.png" alt="Diagram"><audio src="https://example.test/audio.mp3"></audio>';

    const issues = preflight(document, 'html').issues;
    expect(issues.map((issue) => issue.code)).toContain('html-remote-assets');
    expect(issues.find((issue) => issue.code === 'html-remote-assets')).toMatchObject({ severity: 'warning', count: 2 });
  });

  it('warns when a worksheet retains controls or lacks paper response space', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Worksheet';
    document.body.innerHTML = '<h1>Worksheet</h1><div class="quiz-box"><div class="question"><label>Answer <input type="text"></label></div></div>';

    const codes = preflight(document, 'worksheet').issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(['worksheet-controls', 'worksheet-response-space']));
  });

  it('accepts an explicit printable response marker as the worksheet fallback', () => {
    document.documentElement.lang = 'en-US';
    document.title = 'Worksheet';
    document.body.innerHTML = '<h1>Worksheet</h1><div class="quiz-box"><div class="question"><span class="alloflow-print-blank" data-allo-print-response="blank"></span></div></div>';

    const codes = preflight(document, 'worksheet').issues.map((issue) => issue.code);
    expect(codes).not.toContain('worksheet-controls');
    expect(codes).not.toContain('worksheet-response-space');
  });
});
