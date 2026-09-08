import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';

const bundle = readFileSync('view_pdf_audit_module.js', 'utf8');

describe('Builder shared Office module browser delivery', () => {
  it('is a classic browser script even though the shared review helper also supports CommonJS', () => {
    expect(() => new Script(bundle)).not.toThrow();
    expect(bundle).not.toMatch(/export default require_/);
  });

  it('loads the actual built module and registers Office and preservation-review functions', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://builder-bundle.test/', runScripts: 'outside-only' });
    try {
      dom.window.eval(readFileSync('desktop/web-app/node_modules/react/umd/react.development.js', 'utf8'));
      dom.window.eval(bundle);
      const modules = dom.window.AlloModules;
      expect(typeof modules.PdfAuditView).toBe('function');
      expect(typeof modules.PdfPreservationReview).toBe('function');
      expect(typeof modules.AccessibleOfficeExport.build).toBe('function');
      expect(modules.RemediationReview).toBeTruthy();
      expect(typeof modules.AltFormatExports.braille).toBe('function');
      expect(typeof modules.DocumentNarrationExports.naturalText).toBe('function');
    } finally {
      dom.window.close();
    }
  });
});
