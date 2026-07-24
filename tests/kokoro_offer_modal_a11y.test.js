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
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
  });
  it('associates its explanation and supports reflow and reduced motion', () => {
    expect(source).toContain('aria-describedby="kokoro-offer-reason kokoro-offer-description kokoro-offer-note"');
    expect(source).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('flex flex-col sm:flex-row gap-3');
    expect(source.match(/type="button"/g)).toHaveLength(2);
    expect(source.match(/min-h-11/g)).toHaveLength(2);
    expect(source.match(/focus-visible:ring-2/g)).toHaveLength(2);
    expect(source).not.toContain('duration-200 focus:outline-none');
    expect(source).toContain("{'\\uD83C\\uDFA4'}");
  });

  it('reports every loader outcome through the accessible toast channel', () => {
    expect(source).toContain("typeof window.__loadKokoroTTS !== 'function'");
    expect(source).toContain("addToast('Downloading Kokoro voice model (~40MB)...', 'info')");
    expect(source).toContain("addToast('Kokoro voice ready! Switching to offline voice.', 'success')");
    expect(source).toContain('.catch(() => {');
    expect(source).toContain("addToast('Download failed; please try again later.', 'error')");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_kokoro_offer_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_kokoro_offer_modal_module.js', 'utf8'));
  });
});
