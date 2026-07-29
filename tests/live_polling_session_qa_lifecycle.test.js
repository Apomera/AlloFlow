import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const shellSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const livePollingSource = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');
let React;
let ReactDOMClient;
let act;
let LivePolling;
let root;
let hostElement;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  hostElement?.remove();
  hostElement = null;
  delete window.__alloFirebase;
  delete window.__alloWriteToSession;
  vi.restoreAllMocks();
});

function installTransportMocks() {
  const unsubscribe = vi.fn();
  const onSnapshot = vi.fn(() => unsubscribe);
  window.__alloFirebase = {
    db: {},
    doc: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
    collection: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
    setDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    onSnapshot,
  };
  window.__alloWriteToSession = vi.fn(() => Promise.resolve());
  return { onSnapshot, unsubscribe, write: window.__alloWriteToSession };
}

async function renderHost(props) {
  await act(async () => {
    root.render(React.createElement(LivePolling.HostPanel, {
      sessionCode: 'QALIFE',
      roster: {},
      sessionGroups: {},
      onClose: () => {},
      ...props,
    }));
    await Promise.resolve();
  });
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function findButton(text) {
  return Array.from(hostElement.querySelectorAll('button'))
    .find((button) => button.textContent.includes(text));
}

describe('session-wide Q&A background host lifecycle', () => {
  it('keeps the RTC host and presence alive while the panel closes, then disables cleanly', async () => {
    const transport = installTransportMocks();
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    root = ReactDOMClient.createRoot(hostElement);

    await renderHost({ isOpen: false, enableSessionQa: true });
    expect(hostElement.querySelector('[role="dialog"]')).toBeNull();
    expect(transport.onSnapshot).toHaveBeenCalledTimes(1);
    expect(transport.write).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('sessions/QALIFE') }),
      expect.objectContaining({
        livePolling: expect.objectContaining({ hostActive: true }),
      }),
    );

    await renderHost({ isOpen: true, enableSessionQa: true });
    expect(hostElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(hostElement.textContent).toContain('Live Q&A');
    expect(transport.onSnapshot).toHaveBeenCalledTimes(1);
    expect(transport.unsubscribe).not.toHaveBeenCalled();

    await renderHost({ isOpen: false, enableSessionQa: true });
    expect(hostElement.querySelector('[role="dialog"]')).toBeNull();
    expect(transport.onSnapshot).toHaveBeenCalledTimes(1);
    expect(transport.unsubscribe).not.toHaveBeenCalled();
    expect(transport.write.mock.calls.filter(([, patch]) => patch?.livePolling?.hostActive === false))
      .toHaveLength(0);

    await renderHost({ isOpen: false, enableSessionQa: false });
    expect(transport.unsubscribe).toHaveBeenCalledTimes(1);
    expect(transport.write.mock.calls.some(([, patch]) => patch?.livePolling?.hostActive === false))
      .toBe(true);
  });

  it('closes an active poll when its panel closes while preserving the Q&A transport', async () => {
    const transport = installTransportMocks();
    const startSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'start');
    const closePollSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'closePoll');
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    root = ReactDOMClient.createRoot(hostElement);
    const props = {
      isOpen: true,
      enableSessionQa: true,
      initialPoll: {
        type: 'rating',
        prompt: 'Close this live round',
        audienceMode: 'class',
      },
    };

    await renderHost(props);
    const liveHost = startSpy.mock.instances.at(-1);
    await act(async () => {
      liveHost.onGuestConnected('u1', 'Blue Fox');
      await Promise.resolve();
    });
    click(findButton('Broadcast to'));
    expect(liveHost.activePoll).toBeTruthy();
    const activePollId = liveHost.activePoll.id;
    expect(findButton('Close poll')).toBeTruthy();

    await renderHost({ ...props, isOpen: false });
    expect(transport.unsubscribe).not.toHaveBeenCalled();
    expect(closePollSpy).toHaveBeenCalledWith(activePollId);
    expect(liveHost.activePoll).toBeNull();

    await renderHost(props);
    expect(findButton('Close poll')).toBeUndefined();
    expect(findButton('Broadcast to')).toBeTruthy();
  });

  it('resets Q&A across session codes and fences callbacks from the retired transport', async () => {
    installTransportMocks();
    const startSpy = vi.spyOn(LivePolling.PollingHost.prototype, 'start');
    const onActivitySnapshot = vi.fn();
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    root = ReactDOMClient.createRoot(hostElement);

    await renderHost({
      sessionCode: 'QA-A',
      isOpen: true,
      enableSessionQa: true,
      onActivitySnapshot,
    });
    const oldHost = startSpy.mock.instances.at(-1);
    const oldQaState = LivePolling.submitSessionQaQuestion(
      LivePolling.createSessionQaState({ enabled: true }),
      {
        ownerUid: 'u1',
        codename: 'Old Fox',
        text: 'session-a-private-sentinel',
        clientQuestionId: 'old-question',
      },
      100,
      'old',
    );
    await act(async () => {
      oldHost.onGuestConnected('u1', 'Old Fox');
      oldHost.onSessionQaStateChange(oldQaState);
      await Promise.resolve();
    });
    expect(hostElement.textContent).toContain('session-a-private-sentinel');
    expect(onActivitySnapshot.mock.calls.at(-1)[0]).toMatchObject({
      activityId: 'session-qa-QA-A',
      phase: 'collecting',
      audienceUids: ['u1'],
    });

    await renderHost({
      sessionCode: 'QA-B',
      isOpen: true,
      enableSessionQa: true,
      onActivitySnapshot,
    });
    const newHost = startSpy.mock.instances.at(-1);
    expect(newHost).not.toBe(oldHost);
    expect(hostElement.textContent).not.toContain('session-a-private-sentinel');
    expect(onActivitySnapshot.mock.calls.some(([snapshot]) => (
      snapshot.activityId === 'session-qa-QA-A' && snapshot.phase === 'closed'
    ))).toBe(true);
    expect(onActivitySnapshot.mock.calls.some(([snapshot]) => (
      snapshot.activityId === 'session-qa-QA-B' && snapshot.counts && snapshot.counts.submitted > 0
    ))).toBe(false);

    await act(async () => {
      newHost.onGuestConnected('u1', 'New Fox');
      oldHost.onGuestLeft('u1');
      oldHost.onSessionQaStateChange(oldQaState);
      await Promise.resolve();
    });
    expect(hostElement.textContent).toContain('Connected: 1 guest (New Fox)');
    expect(hostElement.textContent).not.toContain('session-a-private-sentinel');
  });

  it('preserves the legacy closed-panel lifecycle when Q&A is not opted in', async () => {
    const transport = installTransportMocks();
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    root = ReactDOMClient.createRoot(hostElement);

    await renderHost({ isOpen: false });
    expect(transport.onSnapshot).not.toHaveBeenCalled();
    expect(transport.write).not.toHaveBeenCalled();
    expect(hostElement.textContent).toBe('');
  });
});

describe('session Q&A shell contract', () => {
  it('states the content-free fallback when the direct channel is unavailable', () => {
    expect(livePollingSource).toContain('Direct connection unavailable - reconnecting. New questions remain in this browser until the connection returns; nothing is uploaded as a fallback.');
  });

    it('pins the ephemeral host opt-in and always-ready hidden guest capability', () => {
    expect(shellSource).toContain('const [liveSessionQaEnabled, setLiveSessionQaEnabled] = useState(false);');
    expect(shellSource).toContain("aria-label={t('live_dock.moderated_qa') || 'Moderated live Q&A'}");
    expect(shellSource).toContain('enableSessionQa: liveSessionQaEnabled');
    expect(shellSource).toContain('// The guest capability is always ready, but its Q&A launcher remains');
    expect(shellSource).toContain('enableSessionQa: true');
    expect(shellSource).toContain("key: 'live-poll-host:' + activeSessionCode");
    expect(shellSource).toContain("key: 'live-poll-guest:' + activeSessionCode + ':' + user.uid");
  });
});
