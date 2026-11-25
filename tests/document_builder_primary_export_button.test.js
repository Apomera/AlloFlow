import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The Document Builder's main action (print / download for the chosen format)
// used to live only inside the closed Export menu. It is now also a visible
// primary button directly beside the menu trigger on desktop-width headers.
// The menu keeps the same action and every other format.

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const source = read('view_export_preview_source.jsx');
const builds = [
  'view_export_preview_module.js',
  'desktop/web-app/public/view_export_preview_module.js',
  'desktop/app-build/view_export_preview_module.js',
  'desktop/web-app/build/view_export_preview_module.js',
].map((file) => ({ file, text: read(file) }));

const actionsStart = source.indexOf('<div className="builder-workspace-actions">');
const menuStart = source.indexOf('<details id="builder-export-menu"');
const menuEnd = source.indexOf("t('a11y.toggle_theme')", menuStart);
const headerBeforeMenu = source.slice(actionsStart, menuStart);
const menu = source.slice(menuStart, menuEnd);

describe('Document Builder primary export button', () => {
  it('sits in the header directly before the Export menu and runs the same export', () => {
    expect(actionsStart).toBeGreaterThan(-1);
    expect(menuStart).toBeGreaterThan(actionsStart);
    const at = headerBeforeMenu.indexOf('<button type="button" data-builder-export-primary');
    expect(at).toBeGreaterThan(-1);
    const button = headerBeforeMenu.slice(at);
    expect(button).toContain('onClick={runExportFromPreview}');
    expect(button).toContain('disabled={exportActionDisabled}');
    expect(button).toContain('aria-busy={exportActionBusy}');
    expect(button).toContain('data-help-key="doc_builder_export_action"');
    expect(button).toContain('{exportActionLabel}</button>');
    // Styled as the header primary (the colours the Export trigger uses).
    expect(button).toContain('bg-indigo-700');
    expect(button).toContain('hover:bg-indigo-800');
    // Nothing between the button and the menu trigger.
    expect(source).toMatch(/\{exportActionLabel\}<\/button>\s*<details id="builder-export-menu"/);
    // It is the only header button added: Document settings and Focus mode stay first.
    expect(headerBeforeMenu.indexOf('Document settings</button>')).toBeLessThan(at);
    expect(headerBeforeMenu.indexOf("'Focus mode'")).toBeLessThan(at);
  });

  it('keeps the action and every format inside the Export menu, with its Escape handling', () => {
    expect(menu.startsWith('<details id="builder-export-menu" className="builder-header-menu" onKeyDownCapture={handleBuilderMenuEscape}>')).toBe(true);
    expect(menu).toContain('<button type="button" data-help-key="doc_builder_export_action" onClick={runExportFromPreview}');
    expect(menu).toContain("{exportActionBusy ? 'Preparing export...' : exportActionLabel}</button>");
    for (const format of [
      "runOfficeExport('docx')", "runOfficeExport('odt')", "runPackageExport('qti')", "runPackageExport('h5p')",
      "runPackageExport('ims')", 'onClick={sendDocToDrive}', 'Electronic Braille (.brf)',
    ]) expect(menu, format).toContain(format);
    // The menu-closing code still targets the details element, which the new button is outside of.
    expect(source).toContain("dialog?.querySelector('#builder-export-menu[open]')");
    expect(source.split("'#builder-export-menu[open], .builder-status-details[open], #builder-quick-access-customize[open]'").length - 1).toBe(2);
  });

  it('uses one label for the header button and the menu item, per format', () => {
    const start = source.indexOf('const exportActionLabel = ');
    const end = source.indexOf('const exportActionDisabled = ', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const expression = source.slice(start, end);
    const label = (mode, pptxLoaded = true, t = () => '') =>
      new Function('exportPreviewMode', 'pptxLoaded', 't', expression + '\nreturn exportActionLabel;')(mode, pptxLoaded, t);
    expect(label('print')).toBe('Print / Save as PDF');
    expect(label('worksheet')).toBe('Print / Save as PDF');
    expect(label('html')).toBe('Download HTML');
    expect(label('slides')).toBe('Export Slides');
    expect(label('slides', false)).toBe('Loading...');
    expect(label('print', true, (key) => '[' + key + ']')).toBe('[export_preview.action_print_pdf]');
    expect(label('html', true, (key) => '[' + key + ']')).toBe('[export_preview.action_download_html]');
    expect(label('slides', true, (key) => '[' + key + ']')).toBe('[export_preview.action_export_slides]');
    // The label keys are read in one place only.
    for (const key of ['action_print_pdf', 'action_download_html', 'action_export_slides']) {
      expect(source.split("t('export_preview." + key + "')").length - 1, key).toBe(1);
    }
    const disabled = source.slice(end, source.indexOf('\n', end));
    expect(disabled).toContain("exportActionBusy || !!altExportBusy || (exportPreviewMode === 'slides' && !pptxLoaded)");
  });

  it('shows the button only where the header has room (1024px and wider)', () => {
    const cssStart = source.indexOf('const _BUILDER_RESPONSIVE_LAYOUT_CSS = `');
    const css = source.slice(cssStart, source.indexOf('`;', cssStart));
    expect(css).toContain('.allo-docsuite .builder-export-primary { display:none; }');
    const wide = css.slice(css.indexOf('@media(min-width:1024px) {'));
    expect(wide.indexOf('.allo-docsuite .builder-export-primary { display:inline-flex;')).toBeGreaterThan(-1);
    // Below 1024px the header is unchanged: the Export trigger is still the filled primary.
    expect(menu).toContain('<summary className="min-h-9 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 cursor-pointer list-none">');
  });

  it('is in the built module and all three mirrors', () => {
    for (const { file, text } of builds) {
      expect(text, file).toContain('"data-builder-export-primary": true');
      expect(text, file).toContain('.allo-docsuite .builder-export-primary { display:none; }');
      expect(text, file).toContain('disabled: exportActionDisabled');
      expect(text === builds[0].text, file + ' matches root module').toBe(true);
    }
  });
});
