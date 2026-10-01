import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let LivePolling;
let root;
let host;

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
  host?.remove();
  host = null;
  delete window.__alloFirebase;
  delete window.__alloWriteToSession;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

function installTransportMocks() {
  window.__alloFirebase = {
    db: {},
    doc: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
    collection: vi.fn((db, ...segments) => ({ path: segments.join('/') })),
    setDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    onSnapshot: vi.fn(() => vi.fn()),
  };
  window.__alloWriteToSession = vi.fn(() => Promise.resolve());
}

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function renderHost(sessionGroups) {
  await act(async () => {
    root.render(React.createElement(LivePolling.HostPanel, {
      sessionCode: 'GROUPS',
      isOpen: true,
      onClose: () => {},
      roster: {},
      sessionGroups,
    }));
    await Promise.resolve();
  });
}

describe('Live Polling existing-group routing composer', () => {
  it('shows canonical session groups immediately and keeps them when a local addition is written', async () => {
    installTransportMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await renderHost({
      'support-path': { name: 'Workshop' },
      'extension-path': { name: 'Extension Studio' },
    });

    const routingButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Routing rules'));
    click(routingButton);

    const addRuleButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Add rule'));
    expect(addRuleButton.disabled).toBe(false);
    click(addRuleButton);

    let target = host.querySelector('select[aria-label="Target group"]');
    expect(Array.from(target.options)
      .filter((option) => option.value)
      .map((option) => [option.value, option.textContent])).toEqual([
      ['support-path', 'Workshop'],
      ['extension-path', 'Extension Studio'],
    ]);
    expect(target.value).toBe('support-path');

    const nameInput = host.querySelector('input[aria-label="New group name"]');
    setInputValue(nameInput, 'Discussion Crew');
    const addGroupButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Add group'));
    click(addGroupButton);

    const groupWrite = window.__alloWriteToSession.mock.calls
      .map(([, patch]) => patch)
      .find((patch) => Object.keys(patch || {}).some((key) => key.startsWith('groups.')));
    const groupWriteKey = Object.keys(groupWrite).find((key) => key.startsWith('groups.'));
    const localGroupId = groupWriteKey.split('.')[1];

    target = host.querySelector('select[aria-label="Target group"]');
    expect(target.value).toBe('support-path');
    expect(Array.from(target.options).some((option) => (
      option.value === localGroupId && option.textContent === 'Discussion Crew'
    ))).toBe(true);
    expect(Array.from(target.options).find((option) => option.value === 'support-path').textContent)
      .toBe('Workshop');

    await renderHost({
      'support-path': { name: 'Workshop' },
      'extension-path': { name: 'Extension Studio' },
      [localGroupId]: { name: 'Canonical Discussion Crew' },
    });

    target = host.querySelector('select[aria-label="Target group"]');
    const caughtUpOptions = Array.from(target.options).filter((option) => option.value === localGroupId);
    expect(caughtUpOptions).toHaveLength(1);
    expect(caughtUpOptions[0].textContent).toBe('Canonical Discussion Crew');
    expect(target.value).toBe('support-path');

    await renderHost({
      'support-path': { name: 'Workshop' },
      'extension-path': { name: 'Extension Studio' },
    });
    target = host.querySelector('select[aria-label="Target group"]');
    expect(Array.from(target.options).some((option) => option.value === localGroupId)).toBe(false);
  });
});
