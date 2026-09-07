import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// "ResizeObserver loop completed with undelivered notifications" (2026-09-07).
// The browser emits it when an observer callback changes layout in the frame it
// was notified. AlloFlow's own error handlers already drop the message, but the
// Gemini Canvas host logs it as "[GLOBAL] …" before our listeners run, so the fix
// is to stop the emission: the bootloader wraps window.ResizeObserver so every
// callback is delivered on the next animation frame. Proved in Chromium with a
// self-feeding observer (scratch spec ro_loop_proof): notice present without the
// guard, absent with it, callbacks still delivered, disconnect cancels a pending
// frame. This gate pins the guard in all three shipped copies of the bootloader.

const COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('ResizeObserver loop guard in the bootloader', () => {
  it('is installed once, before the global error hook, in every copy', () => {
    COPIES.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const guard = src.indexOf("!window.__alloResizeObserverDeferred) {");
      const hook = src.indexOf("!window.__alloGlobalErrorHooked) {");
      expect(guard, p + ': guard present').toBeGreaterThan(-1);
      expect(hook, p + ': error hook present').toBeGreaterThan(-1);
      expect(guard, p + ': guard precedes the error hook').toBeLessThan(hook);
      expect(src.match(/__alloResizeObserverDeferred = true/g).length, p + ': installed exactly once').toBe(1);
      // Defers via rAF, coalesces, and cancels a pending frame on disconnect.
      expect(src).toContain('frame = raf(() => {');
      expect(src).toContain("observer.disconnect = () => {");
      expect(src).toContain('__AlloDeferredResizeObserver.prototype = __AlloNativeResizeObserver.prototype;');
      expect(src).toContain('window.ResizeObserver = __AlloDeferredResizeObserver;');
    });
  });

  it('keeps the existing message filters in the app-side handlers', () => {
    const src = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(src.match(/\/ResizeObserver loop \/\.test\(msg\)/g).length).toBeGreaterThanOrEqual(2);
  });
});
