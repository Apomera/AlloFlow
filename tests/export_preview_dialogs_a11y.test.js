import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const source = fs.readFileSync('view_export_preview_source.jsx', 'utf8');

describe('Document Builder dialog accessibility', () => {
  it('places the main dialog role on its focus-managed panel', () => {
    expect(source).toContain('role="presentation"\n            onClick={(e) => { if (e.target === e.currentTarget) setShowExportPreview(false); }}');
    expect(source).toContain('ref={exportDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="document-builder-title"');
    expect(source).not.toContain('el.__focusTrap');
  });

  // The trap's targets moved into the shared _builderKeyboardTargets (2026-09), and Escape now
  // unwinds settings, focus mode and the open ribbon before it closes the builder.
  it('uses one main focus trap that includes the editable iframe', () => {
    const targetsSrc = sliceBetween(source, 'function _builderKeyboardTargets(container) {', '\n}\n', { file: 'view_export_preview_source.jsx', label: '_builderKeyboardTargets', includeEnd: true });
    const targets = new Function(targetsSrc + '; return _builderKeyboardTargets;')();
    const box = document.createElement('div');
    box.innerHTML = '<button id="a">A</button><input id="off" disabled><iframe id="frame" title="Editable document preview"></iframe>'
      + '<div hidden><button id="hid">H</button></div><textarea id="t"></textarea><span id="neg" tabindex="-1">x</span>';
    document.body.append(box);
    const rects = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function () { return [{}]; };
    try { expect(targets(box).map((el) => el.id)).toEqual(['a', 'frame', 't']); }
    finally { Element.prototype.getClientRects = rects; box.remove(); }
    expect(source).toContain('const getFocusable = () => _builderKeyboardTargets(dialog);');
    const onKey = sliceBetween(source, 'const getFocusable = () => _builderKeyboardTargets(dialog);', "if (event.key !== 'Tab') return;", { file: 'view_export_preview_source.jsx', label: 'focus trap key handler' });
    expect(onKey).toContain("if (event.key === 'Escape') {\n        event.preventDefault();");
    expect(onKey).toContain('} else setShowExportPreview(false);');
    expect(source).toContain("if (event.key !== 'Tab') return");
  });

  it('uses an independent named and described image dialog', () => {
    expect(source).toContain('ref={imageDialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="image-description-title" aria-describedby="image-description-help"');
    expect(source).toContain('id="image-description-help"');
    expect(source).toContain('event.stopPropagation(); closeImageDialog()');
  });

  it('hides and inerts the builder while image description is active', () => {
    // f5b045fc9 (2026-09-20): the backup-import dialog inerts the builder the same way.
    expect(source).toContain('inert={pendingImageFile || pendingBackup ? true : undefined} aria-hidden={pendingImageFile || pendingBackup ? \'true\' : undefined}');
  });

  it('stacks settings and preview regions at narrow widths', () => {
    expect(source).toContain('flex flex-col lg:flex-row');
    // ad77aa5b0 (2026-09-10) replaced the Tailwind column classes with a grid: settings take a
    // 20rem column beside the editor, and under 1024px one column that the settings panel fills.
    const css = sliceBetween(source, 'const _BUILDER_RESPONSIVE_LAYOUT_CSS = `', null, { file: 'view_export_preview_source.jsx', label: 'builder layout CSS' });
    const narrow = sliceBetween(css, '@media(max-width:1023px) {', '@media(max-width:639px) {', { file: 'view_export_preview_source.jsx', label: 'narrow layout media block' });
    expect(css).toContain('.allo-docsuite .builder-dialog[data-builder-settings-open="true"] { grid-template-columns:minmax(0,1fr) 20rem; }');
    expect(narrow).toContain('.allo-docsuite .builder-dialog[data-builder-settings-open="true"] { grid-template-columns:minmax(0,1fr); }');
    expect(narrow).toContain('.allo-docsuite .builder-dialog[data-builder-settings-open="true"] > .builder-settings-panel { grid-column:1; }');
    expect(source).toContain('<style>{_BUILDER_RESPONSIVE_LAYOUT_CSS}</style>');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8')).toBe(fs.readFileSync('view_export_preview_module.js', 'utf8'));
  });
});
