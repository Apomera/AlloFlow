import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

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

  // Behavioral since the 2026-09-30 wording pass (model vs clips, already-running guard):
  // click Download Voice against each loader outcome and read the toasts it raises.
  it('reports every loader outcome through the accessible toast channel', async () => {
    const React = require(resolve('desktop/web-app/node_modules/react'));
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule('view_kokoro_offer_modal_module.js');
    const { KokoroOfferModal } = window.AlloModules.KokoroOfferModal;
    const run = async (setup) => {
      delete window.__kokoroTTSDownloading; delete window._kokoroTTS; delete window.__loadKokoroTTS;
      setup();
      const toasts = [], setSelectedVoice = vi.fn(), close = vi.fn();
      const host = document.createElement('div'); document.body.append(host);
      const root = createRoot(host);
      await React.act(async () => root.render(React.createElement(KokoroOfferModal, { setShowKokoroOfferModal: close, setSelectedVoice, addToast: (m, k) => toasts.push([k, m]) })));
      const button = [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Download Voice');
      await React.act(async () => { button.click(); await Promise.resolve(); await Promise.resolve(); });
      await React.act(async () => root.unmount()); host.remove();
      expect(close).toHaveBeenCalledWith(false);
      return { toasts, setSelectedVoice, downloading: window.__kokoroTTSDownloading };
    };
    const noLoader = await run(() => {});
    expect(noLoader.toasts).toEqual([['error', expect.stringMatching(/loader is unavailable/)]]);
    const busy = await run(() => { window.__kokoroTTSDownloading = true; window.__loadKokoroTTS = vi.fn(); });
    expect(busy.toasts).toEqual([['info', expect.stringMatching(/already running/)]]);
    expect(window.__loadKokoroTTS).not.toHaveBeenCalled();
    const ready = await run(() => { window.__loadKokoroTTS = vi.fn(async () => { window._kokoroTTS = { ready: true }; return true; }); });
    expect(ready.toasts.map(([k]) => k)).toEqual(['info', 'success']);
    expect(ready.toasts[0][1]).toMatch(/~88MB/);
    expect(ready.setSelectedVoice).toHaveBeenCalledWith('af_heart');
    expect(ready.downloading).toBe(false);
    const notReady = await run(() => { window.__loadKokoroTTS = vi.fn(async () => false); });
    expect(notReady.toasts.map(([k]) => k)).toEqual(['info', 'error']);
    expect(notReady.setSelectedVoice).not.toHaveBeenCalled();
    expect(notReady.downloading).toBe(false);
    const failed = await run(() => { window.__loadKokoroTTS = vi.fn(async () => { throw new Error('network'); }); });
    expect(failed.toasts.map(([k]) => k)).toEqual(['info', 'error']);
    expect(failed.setSelectedVoice).not.toHaveBeenCalled();
    expect(failed.downloading).toBe(false);
    delete window.__kokoroTTSDownloading; delete window._kokoroTTS; delete window.__loadKokoroTTS;
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_kokoro_offer_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_kokoro_offer_modal_module.js', 'utf8'));
  });
});
