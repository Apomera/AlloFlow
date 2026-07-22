import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let createRoot;
let adventureUi;
let handlers;
let sessionHandlers;
let originalImage;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloHooks = { useFocusTrap: () => {} };
  if (!window.requestAnimationFrame) window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = clearTimeout;
  originalImage = window.Image;
  loadAlloModule('adventure_module.js');
  loadAlloModule('adventure_handlers_module.js');
  loadAlloModule('adventure_session_handlers_module.js');
  adventureUi = window.AlloModules;
  handlers = window.AlloModules.AdventureHandlers;
  sessionHandlers = window.AlloModules.AdventureSessionHandlers;
});

afterEach(() => {
  handlers.cancelAdventureEstablishingShot();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.Image = globalThis.Image = originalImage;
  document.body.innerHTML = '';
});

describe('Adventure portrait consent and sanitation runtime', () => {
  it('does not accept a selected file until consent, then uploads only the re-encoded image', async () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    let processingCanvas;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, fillRect, fillStyle: '' });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function() {
      processingCanvas = this;
      return 'data:image/jpeg;base64,SANITIZED';
    });
    class LoadedImage {
      set src(value) {
        this._src = value;
        this.naturalWidth = 2000;
        this.naturalHeight = 1000;
        queueMicrotask(() => this.onload?.());
      }
    }
    window.Image = globalThis.Image = LoadedImage;

    const onUploadPortrait = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await React.act(async () => {
      root.render(React.createElement(adventureUi.CastLobby, {
        characters: [{ name: 'Ari', role: 'Protagonist', appearance: 'Blue jacket', portrait: 'data:image/png;base64,OLD' }],
        onUpdateCharacter: vi.fn(),
        onConfirm: vi.fn(),
        onGeneratePortrait: vi.fn(),
        onRefinePortrait: vi.fn(),
        onAddCharacter: vi.fn(),
        onRemoveCharacter: vi.fn(),
        onUploadPortrait,
        t: (key) => key,
      }));
    });

    const input = container.querySelector('input[type="file"]');
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'student-photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await React.act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));

    expect(onUploadPortrait).not.toHaveBeenCalled();
    expect(container.textContent).toContain('the image is sent to the AI provider configured for this app with each scene');

    const useButton = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Use image');
    await React.act(async () => {
      useButton.click();
      await vi.waitFor(() => expect(onUploadPortrait).toHaveBeenCalledOnce());
    });

    expect(onUploadPortrait).toHaveBeenCalledWith(0, 'data:image/jpeg;base64,SANITIZED');
    expect(processingCanvas?.width).toBe(1024);
    expect(processingCanvas?.height).toBe(512);
    expect(fillRect).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalled();
    await React.act(async () => root.unmount());
  });
});

describe('Adventure establishing-shot cancellation runtime', () => {
  it('cancels the preflight before a provider request starts', async () => {
    vi.useFakeTimers();
    const callImagen = vi.fn(async () => 'data:image/png;base64,ESTABLISHING');
    handlers.scheduleAdventureEstablishingShot({
      prompt: 'setting only',
      callImagen,
      setAdventureState: vi.fn(),
      warnLog: vi.fn(),
      delayMs: 250,
    });

    expect(handlers.cancelAdventureEstablishingShot()).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(callImagen).not.toHaveBeenCalled();
  });

  it('suppresses an in-flight result after cast confirmation', async () => {
    vi.useFakeTimers();
    let resolveImage;
    const callImagen = vi.fn(() => new Promise((resolveImagePromise) => { resolveImage = resolveImagePromise; }));
    const setAdventureState = vi.fn();
    handlers.scheduleAdventureEstablishingShot({ prompt: 'setting only', callImagen, setAdventureState, warnLog: vi.fn(), delayMs: 0 });
    await vi.advanceTimersByTimeAsync(0);
    expect(callImagen).toHaveBeenCalledOnce();

    handlers.cancelAdventureEstablishingShot();
    resolveImage('data:image/png;base64,LATE');
    await Promise.resolve();
    await Promise.resolve();
    expect(setAdventureState).not.toHaveBeenCalled();
  });
});

describe('Adventure scene-aware cast consistency runtime', () => {
  const portrait = (name, role = 'Character') => ({ name, role, appearance: name + ' appearance', portrait: 'data:image/png;base64,' + name });

  it('orders scene-present cast first, then the protagonist, then remaining portraits', () => {
    const cast = [portrait('Hero', 'Protagonist'), portrait('Guide'), portrait('Villain'), portrait('Merchant'), portrait('Dragon')];
    const selected = sessionHandlers.selectAdventureReferenceCharacters(cast, ['Villain', 'Dragon']);
    expect(selected.map((character) => character.name)).toEqual(['Villain', 'Dragon', 'Hero', 'Guide']);
  });

  it('falls back to the protagonist portrait when composite creation throws', async () => {
    const warn = vi.fn();
    const protagonist = portrait('Hero', 'Protagonist');
    const result = await sessionHandlers.buildAdventureConsistencyReference({
      portraitCharacters: [protagonist, portrait('Guide')],
      protagonist,
      useReferenceSheet: true,
      createReferenceSheet: vi.fn(async () => { throw new Error('canvas failed'); }),
      warn,
    });

    expect(result.referenceBase64).toBe('Hero');
    expect(result.consistencyPrompt).toContain('reference portrait');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('falling back'), expect.any(Error));
  });
});