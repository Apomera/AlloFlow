import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const built = readFileSync('view_export_preview_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8');

describe('Document Builder text-entry dialogs', () => {
  it('uses the shared hardened prompt for preset names and links', () => {
    expect(source).toContain('const promptForBuilderText = React.useCallback(async');
    expect(source).toContain("title: 'Save export preset'");
    expect(source).toContain("title: 'Insert link'");
    expect(source).not.toContain("const name = prompt('Preset name:')");
    expect(source).not.toContain("const url = prompt('Link URL:')");
  });

  it('keeps unsafe URL feedback inside the dialog validation flow', () => {
    expect(source).toContain('validate: (value) => {');
    expect(source).toContain('Only web (http/https), mailto:, tel:, and internal links are allowed.');
    expect(source).not.toContain("alert('Only web (http/https)");
  });

  it('restores the editable iframe selection after the asynchronous prompt', () => {
    expect(source).toContain('selection.getRangeAt(0).cloneRange()');
    expect(source).toContain('selection.removeAllRanges(); selection.addRange(savedRange);');
    expect(source).toContain('contentWindow?.focus()');
  });

  it('keeps generated and deployed export-preview modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('promptForBuilderText');
    expect(built).not.toContain("const name = prompt('Preset name:')");
  });
});
