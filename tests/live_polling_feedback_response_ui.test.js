import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'prismflow-deploy/node_modules');
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
  if (host) {
    host.remove();
    host = null;
  }
});

describe('Feedback Response teacher composer runtime', () => {
  it('hydrates the Live Center preset inside the existing free-text HostPanel', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await act(async () => {
      root.render(React.createElement(LivePolling.HostPanel, {
        sessionCode: 'FEED1',
        isOpen: true,
        onClose: () => {},
        initialPoll: {
          type: 'freetext',
          prompt: 'Explain the evidence.',
          feedbackEnabled: true,
          feedbackCriteria: 'Use one accurate detail from the lesson.',
          feedbackAudienceMode: 'class',
          afterSubmitMode: 'wait',
        },
        resources: [{ id: 'r1', title: 'Evidence sentence frames', type: 'sentence-frames' }],
        roster: {},
        sessionGroups: {},
        callGemini: async () => 'Specific strength. Concrete next step.',
        onSendToStudent: () => {},
        onSendToGroup: () => {},
      }));
    });

    expect(host.textContent).toContain('Feedback + one revision attempt');
    expect(host.querySelector('input[aria-label="Poll prompt"]').value).toBe('Explain the evidence.');
    expect(host.textContent).toContain('Use one accurate detail from the lesson.');
    expect(host.textContent).toContain('Whole class');
    expect(host.textContent).toContain('Private drafting, teacher-reviewed feedback');
    expect(host.textContent).toContain('Broadcast to 0 guests');
    expect(host.querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(host.querySelector('button[disabled]').textContent).toContain('Broadcast to 0 guests');
  });
});
