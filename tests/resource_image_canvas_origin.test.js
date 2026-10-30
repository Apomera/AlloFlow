// @vitest-environment-options {"url": "https://abc123-scf.usercontent.goog/canvas/index.html"}
// "Draw with Excalidraw" from a Gemini Canvas page: the Whiteboard is on the CDN,
// so the slot handshake is cross-origin and must be pinned to the CDN origin.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const SCENE = { type: 'excalidraw', version: 2, elements: [{ id: 'box', type: 'rectangle', x: 0, y: 0, width: 80, height: 60 }], files: {}, appState: {} };
const CDN = 'https://alloflow-cdn.pages.dev';
let H;
beforeAll(() => {
  global.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('image_asset_editor_module.js');
  H = window.AlloModules.ResourceImageTools;
});
describe('resource drawing from a Canvas origin', () => {
  it('opens the CDN Whiteboard, names this origin, and trusts only the CDN popup', async () => {
    expect(window.location.origin).toBe('https://abc123-scf.usercontent.goog');
    const popup = { postMessage: vi.fn(), focus: vi.fn(), closed: false };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup), onSave = vi.fn().mockResolvedValue(true), onError = vi.fn();
    const cancel = H.openResourceDrawing({ scene: SCENE, title: 'River', onSave, onError });
    expect(onError).not.toHaveBeenCalled(); expect(open).toHaveBeenCalledOnce();
    const url = new URL(open.mock.calls[0][0]), token = url.searchParams.get('imageSlot');
    expect(url.origin + url.pathname).toBe(CDN + '/whiteboard/whiteboard.html');
    expect(url.searchParams.get('host')).toBe(window.location.origin);
    const send = (type, extra = {}, origin = CDN, source = popup) => window.dispatchEvent(new MessageEvent('message', { origin, source, data: { type, token, ...extra } }));
    send('alloasset-hello', {}, window.location.origin); expect(popup.postMessage).not.toHaveBeenCalled();
    send('alloasset-hello', { token: 'wrong' }); expect(popup.postMessage).not.toHaveBeenCalled();
    send('alloasset-hello'); expect(popup.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'alloasset-ack', scene: SCENE, token }), CDN);
    send('alloasset-save', { png: PNG, scene: SCENE }, CDN, window); expect(onSave).not.toHaveBeenCalled();
    send('alloasset-save', { png: PNG, scene: SCENE }); await Promise.resolve();
    expect(onSave).toHaveBeenCalledWith({ dataUrl: PNG, scene: SCENE });
    expect(popup.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'alloasset-saved' }), CDN);
    cancel(); open.mockRestore();
  });
});
