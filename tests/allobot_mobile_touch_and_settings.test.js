import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

let React;
let createRoot;
let AlloBot;
let mountedRoots;

function loadAlloBotFromBuiltModule() {
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AlloBot;
  delete window.AlloModules.AlloBotModule;
  const src = readFileSync(resolve(process.cwd(), 'allobot_module.js'), 'utf8');
  new Function(src)();
  return window.AlloModules.AlloBot;
}

function installCoarseMatchMedia(coarse = true) {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(hover: none), (pointer: coarse)' ? coarse : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

function touchEvt(type, x, y) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y };
  Object.defineProperty(ev, type === 'touchend' ? 'changedTouches' : 'touches', { value: [point] });
  if (type !== 'touchend') Object.defineProperty(ev, 'changedTouches', { value: [point] });
  return ev;
}

async function mountBot(props = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  await React.act(async () => {
    root.render(React.createElement(AlloBot, {
      canPlayIntro: false,
      hasSeenBotIntro: true,
      idleSleepMs: 60 * 60 * 1000,
      soundEnabled: false,
      ...props,
    }));
  });
  return { container, root };
}

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (!window.requestAnimationFrame) window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = clearTimeout;
  installCoarseMatchMedia(true);
  AlloBot = loadAlloBotFromBuiltModule();
});

beforeEach(() => {
  mountedRoots = new Set();
  localStorage.clear();
  installCoarseMatchMedia(true);
});

afterEach(async () => {
  for (const r of [...mountedRoots]) {
    await React.act(async () => r.unmount());
  }
  mountedRoots.clear();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('AlloBot mobile touch-to-reveal controls and Settings button', () => {
  it('hides corner buttons by default on phone, reveals them on first tap, lets Settings be tapped, and opens chat on second tap', async () => {
    const onClick = vi.fn();
    const onVoiceSettingsClick = vi.fn();
    const onToggleMute = vi.fn();
    const onMicClick = vi.fn();

    const bot = await mountBot({ onClick, onVoiceSettingsClick, onToggleMute, onMicClick });
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const settingsBtn = bot.container.querySelector('[data-help-key="bot_settings_btn"]');

    // 1. On phone mount: buttons are hidden & non-blocking
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-hidden');
    expect(surface.getAttribute('data-allobot-touch-controls')).toBe('hidden');
    expect(settingsBtn.className).toContain('opacity-0');
    expect(settingsBtn.className).toContain('pointer-events-none');

    // 2. First tap on AlloBot reveals the 4 touchable buttons (does NOT jump straight to chat)
    await React.act(async () => {
      surface.dispatchEvent(touchEvt('touchstart', 300, 40));
      surface.dispatchEvent(touchEvt('touchend', 302, 41));
    });
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-open');
    expect(surface.getAttribute('data-allobot-touch-controls')).toBe('open');
    expect(settingsBtn.className).toContain('opacity-100');
    expect(settingsBtn.className).toContain('pointer-events-auto');
    expect(onClick).not.toHaveBeenCalled();

    // 3. Tapping Settings fires onVoiceSettingsClick and closes the touch ring cleanly
    await React.act(async () => {
      settingsBtn.dispatchEvent(touchEvt('touchstart', 280, 20));
      settingsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onVoiceSettingsClick).toHaveBeenCalledTimes(1);
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-hidden');

    // 4. Tap AlloBot once to open controls, then tap AlloBot a second time to open chat
    await React.act(async () => {
      surface.dispatchEvent(touchEvt('touchstart', 300, 40));
      surface.dispatchEvent(touchEvt('touchend', 300, 40));
    });
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-open');
    await React.act(async () => {
      surface.dispatchEvent(touchEvt('touchstart', 300, 40));
      surface.dispatchEvent(touchEvt('touchend', 300, 40));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-hidden');

    // 5. Tapping outside AlloBot dismisses open touch controls
    await React.act(async () => {
      surface.dispatchEvent(touchEvt('touchstart', 300, 40));
      surface.dispatchEvent(touchEvt('touchend', 300, 40));
    });
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-open');
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    await React.act(async () => {
      outside.dispatchEvent(touchEvt('touchstart', 10, 400));
    });
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('touch-hidden');
  });

  it('hoists Voice and Text settings portals outside headerCollapsed so Settings opens in compact mobile header mode', () => {
    const headerSrc = readFileSync('view_header_source.jsx', 'utf8');
    const collapsedStart = headerSrc.indexOf('{!headerCollapsed && (');
    const voicePortalAt = headerSrc.indexOf('{showVoiceSettings && _headerPortal(');
    const textPortalAt = headerSrc.indexOf('{showTextSettings && _headerPortal(');
    const hoistedMarker = headerSrc.indexOf('Hoisted outside !headerCollapsed');

    expect(collapsedStart).toBeGreaterThan(-1);
    expect(hoistedMarker).toBeGreaterThan(collapsedStart);
    expect(textPortalAt).toBeGreaterThan(hoistedMarker);
    expect(voicePortalAt).toBeGreaterThan(hoistedMarker);
  });

  it('removes forced permanent opacity:1 from desktop/web-app/src/index.css and keeps allobot + header deliverables 4-way mirrored and 3-host SRI synced', () => {
    const indexCss = readFileSync('desktop/web-app/src/index.css', 'utf8');
    const botCssBlock = indexCss.slice(indexCss.indexOf("[data-help-key='bot_sleep_btn']"));
    expect(botCssBlock).not.toContain('opacity: 1 !important');
    expect(botCssBlock).not.toContain('top: -12px !important');

    const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
    const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');
    const files = ['allobot_module.js', 'view_header_module.js'];
    const dirs = ['.', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

    for (const f of files) {
      const rootBuf = readFileSync(f);
      const h256 = sha256(rootBuf);
      const sri = sha384(rootBuf);
      for (const d of dirs) {
        expect(sha256(readFileSync(d === '.' ? f : `${d}/${f}`)), `${d}/${f}`).toBe(h256);
      }
      for (const host of hosts) {
        const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
        expect(embedded.assets[f].bytes, `${host} ${f}`).toBe(rootBuf.length);
        expect(embedded.assets[f].integrity, `${host} ${f}`).toBe(sri);
      }
    }
  });
});
