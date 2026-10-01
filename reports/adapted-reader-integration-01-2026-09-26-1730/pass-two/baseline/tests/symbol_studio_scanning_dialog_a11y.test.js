import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Symbol Studio scanning and dialog accessibility', () => {
  const source = read('symbol_studio_module.js');
  const scanLabel = source.indexOf('Partner-assisted scanning overlay');
  const scanStart = source.lastIndexOf('//', scanLabel);
  const modalStart = source.indexOf('// Focus trap handler for modal', scanStart);
  const scan = source.slice(scanStart, modalStart);
  const modal = source.slice(modalStart, source.indexOf('window.AlloModules =', modalStart));

  it('exposes the scanning surface as a named and described modal dialog', () => {
    expect(scan).toContain("role: 'dialog'");
    expect(scan).toContain("'aria-modal': 'true'");
    expect(scan).toContain("'aria-labelledby': 'ss-scan-title'");
    expect(scan).toContain("'aria-describedby': 'ss-scan-help'");
    expect(scan).toContain("id: 'ss-scan-title'");
    expect(scan).toContain("id: 'ss-scan-help'");
  });

  it('focuses scanning once per opening and restores the invoking Scan button', () => {
    expect(source).toContain('var scanOverlayRef = useRef(null)');
    expect(source).toContain('scanOpenerRef.current = b.id');
    expect(source).toContain("'data-scan-board-id': b.id");
    expect(source).toContain('ref: scanOverlayRef');
    expect(scan).not.toContain('ref: function (el) { if (el) el.focus(); }');
    expect(source).toContain("document.querySelectorAll('[data-scan-board-id]')");
  });

  it('preserves native control and Tab behavior while retaining switch shortcuts', () => {
    expect(scan).toContain('if (ev.target !== ev.currentTarget) return');
    expect(scan).not.toContain("ev.code === 'Tab'");
    expect(scan).toContain("ev.key === 'Tab'");
    expect(scan).toContain('lastControl : firstControl).focus()');
    expect(scan).toContain("ev.code === 'ArrowRight' || ev.code === 'ArrowDown'");
    expect(scan).toContain("'aria-keyshortcuts': scanManual");
    expect(scan).toContain('Use Right or Down Arrow to advance; Space or Enter to select.');
  });

  it('provides visible focus in forced colors and reflows the scanning grid', () => {
    expect(source).toContain('.ss-focus-visible:focus-visible,.ss-focus-visible *:focus-visible{outline:3px');
    expect(source).toContain('@media(forced-colors:active)');
    expect(scan).not.toContain("outline: 'none'");
    expect(scan).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'");
    expect(scan).toContain("flexWrap: 'wrap'");
    expect(scan).toContain("role: 'group'");
    expect(scan).toContain("return e('button', {");
    expect(scan).not.toContain("role: 'gridcell'");
  });

  it('places primary dialog semantics on the focus-managed panel', () => {
    expect(modal).toContain("role: 'presentation'");
    expect(modal).toContain("'aria-labelledby': 'ss-dialog-title'");
    expect(modal).toContain("'aria-describedby': 'ss-dialog-description'");
    expect(modal).toContain("id: 'ss-dialog-description'");
    expect(modal).toContain('focusable.indexOf(document.activeElement) === -1');
    expect(modal).toContain("ev.stopPropagation(); onClose && onClose()");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/symbol_studio_module.js'));
  });
});
