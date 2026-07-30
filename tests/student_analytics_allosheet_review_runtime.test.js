import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let ReactDOMClient;
let Panel;
let root;
let host;
let background;
let priorActFlag;

function buttonWithText(container, text) {
  return Array.from(container.querySelectorAll('button')).find(button =>
    button.textContent.replace(/\s+/g, ' ').includes(text)
  );
}

function dispatchReactHandler(target, preferredHandlers = ['onClick', 'onChange']) {
  const propsKey = Object.keys(target).find(key => key.startsWith('__reactProps$'));
  const props = propsKey && target[propsKey];
  const handlerName = props && preferredHandlers.find(
    name => typeof props[name] === 'function',
  );
  if (!handlerName) {
    throw new Error('React interaction handler is unavailable on the target element.');
  }
  return props[handlerName]({
    currentTarget: target,
    target,
    preventDefault() {},
    stopPropagation() {},
  });
}

function dispatchKey(target, key) {
  const event = new window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/react-dom/client',
  ));
  globalThis.React = window.React = React;
  globalThis.X = window.X = () => null;
  window.ReactDOM = require(resolve(
    process.cwd(),
    'desktop/web-app/node_modules/react-dom',
  ));
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('student_analytics_module.js');
  Panel = window.AlloModules.StudentAnalytics;
});

afterEach(async () => {
  if (root) {
    await React.act(async () => {
      root.unmount();
    });
  }
  if (host) host.remove();
  if (background) background.remove();
  root = null;
  host = null;
  background = null;
  if (priorActFlag === undefined) {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  } else {
    globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
  }
  priorActFlag = undefined;
  vi.restoreAllMocks();
});

describe('Student Analytics AlloSheet source review runtime', () => {
  it('requires source confirmation, isolates the app, and remains locked until secure receipt', async () => {
    priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let resolveOpen;
    const pendingOpen = new Promise(resolvePromise => {
      resolveOpen = resolvePromise;
    });
    const onOpenAlloSheet = vi.fn(() => pendingOpen);
    const onClose = vi.fn();

    background = document.createElement('div');
    background.setAttribute('data-testid', 'outside-assessment-center');
    background.innerHTML = '<button type="button">Outside action</button>';
    document.body.appendChild(background);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await React.act(async () => {
      root.render(React.createElement(Panel, {
        isOpen: true,
        onClose,
        theme: 'light',
        t: key => key,
        probeHistory: {
          'PRIVATE RUNTIME LEARNER': [{
            activity: 'orf',
            date: '2026-07-20T12:00:00.000Z',
            wcpm: 75,
            grade: '3',
            student: 'PRIVATE RUNTIME LEARNER',
            transcript: 'PRIVATE RUNTIME TRANSCRIPT',
          }],
        },
        interventionLogs: {
          'PRIVATE RUNTIME LEARNER': [{
            program: 'PRIVATE RUNTIME PROGRAM',
            frequency: 'daily',
            minutes: 20,
            groupSize: 1,
            startDate: '2026-07-01',
            notes: 'PRIVATE RUNTIME NOTE',
          }],
        },
        rtiGoals: {
          'PRIVATE RUNTIME LEARNER': {
            metric: 'orf',
            baseline: 60,
            baselineDate: '2026-07-01',
            target: 90,
            targetDate: '2026-10-01',
          },
        },
        addToast: vi.fn(),
        loadProbeBanks: () => Promise.resolve(),
        onOpenAlloSheet,
      }));
      await Promise.resolve();
    });

    const studentDataTab = buttonWithText(document.body, 'Student Data');
    expect(studentDataTab).toBeTruthy();
    await React.act(async () => {
      dispatchReactHandler(studentDataTab);
      await Promise.resolve();
    });

    const opener = buttonWithText(document.body, 'Open in AlloSheet');
    expect(opener, document.body.textContent).toBeTruthy();
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
    opener.focus();
    await React.act(async () => {
      opener.click();
      await new Promise(resolveTimer => window.setTimeout(resolveTimer, 0));
    });

    let dialog = document.body.querySelector(
      '[role="dialog"][aria-labelledby="sa-allosheet-review-title"]',
    );
    expect(dialog, document.body.textContent).toBeTruthy();
    await React.act(async () => {
      await new Promise(resolveTimer => window.setTimeout(resolveTimer, 0));
    });
    expect(document.activeElement).toBe(dialog);
    expect(background.inert).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(onOpenAlloSheet).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain(
      'No learner codes are included. If any nonzero tier group is smaller than five',
    );
    expect(dialog.textContent).toContain(
      'learner-level tiers, reasons, recommendations, alerts, and automatic decisions.',
    );

    const activeScope = dialog.querySelector(
      'input[name="sa-allosheet-scope"][value="active-student"]',
    );
    expect(activeScope).toBeTruthy();
    await React.act(async () => {
      dispatchReactHandler(activeScope, ['onChange']);
      await Promise.resolve();
    });
    dialog = document.body.querySelector(
      '[role="dialog"][aria-labelledby="sa-allosheet-review-title"]',
    );
    expect(dialog.textContent).toContain(
      'Random transfer-local learner codes are still identifiers, not de-identification.',
    );
    const confirm = buttonWithText(dialog, 'Confirm and open AlloSheet');
    expect(confirm.disabled).toBe(false);

    await React.act(async () => {
      dispatchReactHandler(confirm);
      await Promise.resolve();
    });
    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    const artifact = onOpenAlloSheet.mock.calls[0][0];
    expect(artifact.privacy).toMatchObject({
      scope: 'active-student',
      identifierIncluded: true,
      transferEnablesAI: false,
    });
    expect(artifact.capabilities).toEqual({ writeBack: false, aiEnabled: false });
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE RUNTIME');

    dialog = document.body.querySelector(
      '[role="dialog"][aria-labelledby="sa-allosheet-review-title"]',
    );
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(buttonWithText(dialog, 'Cancel').disabled).toBe(true);
    expect(buttonWithText(dialog, 'Waiting for AlloSheet...').disabled).toBe(true);
    const escapeWhileBusy = dispatchKey(dialog, 'Escape');
    expect(escapeWhileBusy.defaultPrevented).toBe(true);
    expect(document.body.querySelector(
      '[aria-labelledby="sa-allosheet-review-title"]',
    )).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await React.act(async () => {
      resolveOpen(true);
      await pendingOpen;
      await Promise.resolve();
    });
    expect(document.body.querySelector(
      '[aria-labelledby="sa-allosheet-review-title"]',
    )).toBeNull();
    expect(background.inert).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
  });
});
