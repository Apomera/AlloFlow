import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Hub;
let Component;
let pack;
let root;
let host;
let originalFetch;
let manifestFixture;

async function fixtureFetch(url) {
  if (String(url).includes('pack_manifest.json')) {
    return { ok: true, status: 200, json: async () => manifestFixture };
  }
  return { ok: false, status: 404, json: async () => ({}) };
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Component = Hub.TestPrepHub;
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-audiology-5343');
  manifestFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
  originalFetch = global.fetch;
  global.fetch = window.fetch = fixtureFetch;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  localStorage.clear();
  global.fetch = window.fetch = originalFetch;
});

async function mountAndOpenPack() {
  global.fetch = window.fetch = fixtureFetch;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {} }));
  });
  const card = host.querySelector(`[data-test-prep-pack-id="${pack.id}"]`);
  expect(card).toBeTruthy();
  const openButton = Array.from(card.querySelectorAll('button')).find((button) => button.textContent.includes('Open practice pack'));
  expect(openButton).toBeTruthy();
  await act(async () => { openButton.click(); });
}

async function waitForText(text, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!host.textContent.includes(text) && Date.now() < deadline) {
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 20)); });
  }
  expect(host.textContent).toContain(text);
}

function savedSession(identity) {
  return {
    packId: pack.id,
    mode: 'standard',
    label: 'Saved revision fixture',
    itemIds: pack.items.slice(0, 2).map((item) => item.id),
    questionIndex: 1,
    answers: { [pack.items[0].id]: pack.items[0].answerIndex },
    confidence: {},
    updatedAt: 100,
    ...(identity || {}),
  };
}

describe('Test Prep saved-session revision UI', () => {
  it('offers resume for an exact current content identity', async () => {
    localStorage.setItem(
      'alloflow_test_prep_session_v1',
      JSON.stringify(savedSession(Hub.resolvePackContentIdentity(pack))),
    );

    await mountAndOpenPack();
    await waitForText('Resume saved practice');
    expect(host.textContent).not.toContain('cannot be resumed safely');
  });

  it('retains a legacy session with an explanation and explicit discard control', async () => {
    localStorage.setItem('alloflow_test_prep_session_v1', JSON.stringify(savedSession()));

    await mountAndOpenPack();
    await waitForText('cannot be resumed safely');
    expect(host.textContent).toContain('It remains stored until you discard it or start a new session.');
    expect(host.textContent).not.toContain('Resume saved practice');
    expect(localStorage.getItem('alloflow_test_prep_session_v1')).not.toBeNull();

    const discardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Discard'));
    expect(discardButton).toBeTruthy();
    await act(async () => { discardButton.click(); });
    expect(localStorage.getItem('alloflow_test_prep_session_v1')).toBeNull();
  });
});
