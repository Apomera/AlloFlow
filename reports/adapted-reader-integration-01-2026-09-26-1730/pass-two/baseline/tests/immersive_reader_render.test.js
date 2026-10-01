// Regression guard for the 2026-07-07 crash: FocusReaderOverlay referenced a
// `studentTakeTick` that lives only in KaraokeReaderOverlay's scope, throwing
// "studentTakeTick is not defined" on every render of Focus Mode inside
// SimplifiedView. The `hasStudentTake` declaration had been misplaced into
// FocusReader; it belongs in Karaoke (which owns sentences/sentenceIdx/tick).
// These render smokes assert both overlays mount without a ReferenceError.
// Same harness as quickstart_wizard_render.test.js / reading_library_render.test.js.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, Focus, Karaoke;

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('immersive_reader_module.js');
  Focus = window.AlloModules.FocusReaderOverlay;
  Karaoke = window.AlloModules.KaraokeReaderOverlay;
  if (!Focus) throw new Error('FocusReaderOverlay did not register');
  if (!Karaoke) throw new Error('KaraokeReaderOverlay did not register');
});

let root, host;
afterEach(() => {
  if (root) { try { act(() => root.unmount()); } catch (_) {} root = null; }
  if (host) { host.remove(); host = null; }
});

function render(Comp, props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Comp, props)); });
  return host.innerHTML;
}

describe('immersive reader overlays render without ReferenceError', () => {
  it('FocusReaderOverlay mounts (was crashing on undefined studentTakeTick)', () => {
    const html = render(Focus, {
      text: 'The quick brown fox jumps over the lazy dog. A second sentence here.',
      onClose: () => {},
      isOpen: true,
    });
    expect(html).toContain('Focus Mode');
  });

  it('KaraokeReaderOverlay (student, non-teacher) mounts and wires hasStudentTake', () => {
    const html = render(Karaoke, {
      text: 'The quick brown fox jumps. Another line to read aloud.',
      onClose: () => {},
      isOpen: true,
      getAudioUrl: null,
      isTeacher: false,
    });
    expect(html.length).toBeGreaterThan(0);
  });
});
