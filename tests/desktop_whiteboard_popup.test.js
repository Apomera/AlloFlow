// Desktop: the Whiteboard must open as an Electron child window, or it lands in
// the OS browser with no window.opener and can never hand a drawing back
// (2026-10-29: "Draw with Excalidraw" and the Educator Hub Whiteboard both did).
// isAllowedWhiteboardPage is lifted from main.cjs and run against fixed ports.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const electron = readFileSync('desktop/electron/main.cjs', 'utf8');

function liftAllowed() {
  const start = electron.indexOf("const WHITEBOARD_CDN_ORIGIN = 'https://alloflow-cdn.pages.dev';");
  const end = electron.indexOf('function configurePrivateApiRequestHeaders(');
  expect(start, 'whiteboard allow-list not found').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('getCommandCenterUrl', 'getBundledAppOrigin',
    electron.slice(start, end) + '\nreturn isAllowedWhiteboardPage;')(
    () => 'http://127.0.0.1:32175', () => 'http://localhost:32175');
}

describe('desktop Whiteboard child window', () => {
  const ok = liftAllowed();

  it('allows the bundled and CDN Whiteboard pages the app actually opens', () => {
    const slot = '?imageSlot=6f1c2d3e-aaaa-bbbb-cccc-0123456789ab&host=' + encodeURIComponent('http://localhost:32175') + '&v=4';
    expect(ok('http://localhost:32175/app/whiteboard/whiteboard.html' + slot)).toBe(true);
    expect(ok('http://127.0.0.1:32175/app/whiteboard/whiteboard.html' + slot)).toBe(true);
    expect(ok('https://alloflow-cdn.pages.dev/whiteboard/whiteboard.html?v=4&host=' + encodeURIComponent('http://localhost:32175'))).toBe(true);
    expect(ok('https://alloflow-cdn.pages.dev/whiteboard/whiteboard?v=4')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(ok('http://localhost:9999/app/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('http://localhost:32175/app/index.html')).toBe(false);
    expect(ok('http://localhost:32175/api/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('http://localhost:32175/app/whiteboard/whiteboard.html?v=4&redirect=x')).toBe(false);
    expect(ok('http://localhost:32175/app/whiteboard/whiteboard.html#x')).toBe(false);
    expect(ok('http://user:pw@localhost:32175/app/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('https://alloflow-cdn.pages.dev/app/')).toBe(false);
    expect(ok('https://alloflow-cdn.pages.dev.evil.example/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('http://alloflow-cdn.pages.dev/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('https://preview.alloflow-cdn.pages.dev/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('file:///C:/whiteboard/whiteboard.html')).toBe(false);
    expect(ok('not a url')).toBe(false);
  });

  it('opens it as a locked-down child and keeps its navigation and popups in bounds', () => {
    const handler = electron.slice(electron.indexOf('if (isAllowedWhiteboardPage(url)) {'), electron.indexOf('// In-app popup views'));
    expect(handler).toContain("action: 'allow'");
    for (const pref of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true', 'nodeIntegrationInSubFrames: false', 'webSecurity: true', 'devTools: false']) expect(handler).toContain(pref);
    expect(handler).not.toContain('preload');
    const child = electron.slice(electron.indexOf('if (isAllowedWhiteboardPage(details && details.url)) {'), electron.indexOf('if (!isAllowedAlloSheetPopup(details && details.url)) return;'));
    expect(child).toContain("return { action: 'deny' };");
    expect(child).toContain('if (isAllowedWhiteboardPage(url)) return;');
    expect(child).toContain('event.preventDefault();');
    // the Whiteboard window is never registered as a token-bearing AlloSheet window
    expect(child).not.toContain('trustedAlloSheetWebContents.set');
  });
});
