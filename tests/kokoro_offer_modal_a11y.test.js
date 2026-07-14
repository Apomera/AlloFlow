import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_kokoro_offer_modal_source.jsx', 'utf8');

describe('Kokoro offer modal accessibility', () => {
  it('provides a named modal dialog and non-interactive backdrop', () => {
    expect(source).toContain('role="presentation" onClick={() => setShowKokoroOfferModal(false)}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="kokoro-offer-title"');
    expect(source).toContain('id="kokoro-offer-title"');
  });
  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(first || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });
  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_kokoro_offer_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_kokoro_offer_modal_module.js', 'utf8'));
  });
});
