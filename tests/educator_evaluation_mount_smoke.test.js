// Educator Evaluation — real React mount smoke.
// Exercises the shared panel used by the Admin Hub and standalone shell while
// keeping assertions focused on navigation, role scoping, and modal routing.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act, Simulate } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));
const { transformSync } = require2(resolve(MODULES_DIR, '@babel/core'));
const transformReactJsx = require2(resolve(MODULES_DIR, '@babel/plugin-transform-react-jsx'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let EducatorEvaluationPanel;
let SourceEducatorEvaluationPanel;
const mounted = [];

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  EducatorEvaluationPanel = window.AlloModules.EducatorEvaluation
    && window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel;
  if (!EducatorEvaluationPanel) throw new Error('EducatorEvaluation did not register');
  const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8')
    + '\nwindow.__aeSourcePanelForTest = EducatorEvaluationPanel;';
  const compiled = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [[transformReactJsx, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }]],
  }).code;
  // eslint-disable-next-line no-new-func
  new Function('React', compiled)(React);
  SourceEducatorEvaluationPanel = window.__aeSourcePanelForTest;
  delete window.__aeSourcePanelForTest;
  if (!SourceEducatorEvaluationPanel) throw new Error('Educator Evaluation source panel did not compile');
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    act(() => { root.unmount(); });
    container.remove();
  }
  localStorage.clear();
  sessionStorage.clear();
});

function mountPanel(props = {}, Panel = EducatorEvaluationPanel) {
  const startMode = Object.prototype.hasOwnProperty.call(props, 'startMode') ? props.startMode : 'sample';
  const renderProps = { ...props };
  delete renderProps.startMode;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(Panel, {
      onClose: () => {},
      addToast: () => {},
      ...renderProps,
    }));
  });
  mounted.push({ root, container });
  if (startMode && !renderProps.repository) {
    clickButton(container, startMode === 'blank' ? 'Start real work locally' : 'Start a guided sample tour');
  }
  return container;
}

function unmountLast() {
  const current = mounted.pop();
  if (!current) return;
  act(() => { current.root.unmount(); });
  current.container.remove();
}

function sampleWorkspaceFixture() {
  mountPanel();
  const workspace = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1'));
  unmountLast();
  localStorage.clear();
  return workspace;
}

function mountRealLocalFixture() {
  const workspace = sampleWorkspaceFixture();
  workspace.config.sampleMode = false;
  localStorage.setItem('allo_educator_evaluation_workspace_v1', JSON.stringify(workspace));
  return mountPanel({ startMode: null });
}

async function flushRemote() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
function click(element) {
  if (!element) throw new Error('Expected a clickable element');
  act(() => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

function clickButton(container, label) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => { const text = (candidate.textContent || '').replace(/\s+/g, ' ').trim(); return text === label || text.startsWith(label); });
  if (!button) throw new Error('No button labeled "' + label + '"');
  click(button);
  return button;
}

function enterInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function labeledInput(scope, text) {
  const label = Array.from(scope.querySelectorAll('label')).find((candidate) => (
    (candidate.querySelector('span')?.textContent || '').trim() === text
  ));
  if (!label) throw new Error('No input labeled "' + text + '"');
  return label.querySelector('input');
}

async function flushRemoteDebounce() {
  await act(async () => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  });
  await flushRemote();
}

async function flushFocusFrame() {
  await act(async () => {
    await new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
  });
}

describe('EducatorEvaluationPanel', () => {
  it('offers a first-run choice and loads simulated data when selected', () => {
    const container = mountPanel({ startMode: null });

    expect(container.querySelector('.ae-onboarding-overlay')).toBeTruthy();
    expect(container.textContent).toContain('Choose how to start Educator Evaluation');
    expect(container.textContent).toContain('Start real work locally');
    expect(container.textContent).toContain('Start a guided sample tour');
    expect(container.textContent).toContain('Choose a record path');
    clickButton(container, 'Start a guided sample tour');

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.textContent).toContain('Educator Growth & Evaluation');
    expect(container.textContent).toContain('Simulated data');
    expect(container.textContent).toContain('Evaluation overview');
    expect(container.textContent).toContain('Teachers evaluated');
    expect(container.textContent).toContain('Weight in final evaluation');
    expect(container.querySelectorAll('.ae-donut')).toHaveLength(2);
    expect(container.textContent).toContain('2 / 8');
    expect(container.textContent).toContain('Finalized');
    expect(container.textContent).toContain('Awaiting teacher');
    expect(container.textContent).toContain('Awaiting evaluator');
    expect(container.textContent).toContain('Overdue');
    // The workspace defaults to Maine, whose generic plan is practice-only, so
    // the weighting card reads 100% Professional Practice rather than PA's
    // 70% Observation and Practice split.
    expect(container.textContent).toContain('100%');
    expect(container.textContent).toContain('Professional Practice');
    expect(container.textContent).not.toContain('Observation & Practice');
    expect(container.textContent).toContain('Guided sample · 1 of 7');
    expect(container.textContent).toContain('1 of 7');

    const stored = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1'));
    expect(stored.config.sampleMode).toBe(true);
    expect(stored.teachers).toHaveLength(8);
  }, 15000);

  it('accepts the host translator for the localized onboarding shell while preserving fallback copy', () => {
    const container = mountPanel({
      startMode: null,
      t: (key) => {
        if (key === 'educator_evaluation.choose_how_to_start_educator_evaluation_1ttmet2') return 'Localized evaluation start';
        if (key === 'educator_evaluation.finalized_4cmc2p') return 'Localized finalized';
        return undefined;
      },
    });

    expect(container.textContent).toContain('Localized evaluation start');
    expect(container.textContent).toContain('Start real work locally');
    clickButton(container, 'Start a guided sample tour');
    expect(container.textContent).toContain('Localized finalized');
  });

  it('can start with a blank on-device workspace instead of simulated records', () => {
    const container = mountPanel({ startMode: null });
    clickButton(container, 'Start real work locally');

    expect(container.textContent).toContain('Private on-device workspace');
    expect(container.textContent).not.toContain('Teacher 01');
    expect(container.textContent).toContain('No educators yet');
    expect(container.textContent).toContain('Set up your first real cycle');
    expect(container.textContent).toContain('0 / 3 ready');
    expect(container.textContent).toContain('Choose an approved record path');
    clickButton(container, 'Choose record path');
    expect(container.querySelector('#ae-tab-about').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-record-path-setup')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1'));
    expect(localStorage.getItem('allo_educator_evaluation_onboarding_v1')).toBe('blank');
    expect(stored.config.sampleMode).toBe(false);
    expect(stored.teachers).toHaveLength(0);
  });

  it('keeps the add-educator form as a draft until Save and lets Cancel leave no record', () => {
    const container = mountPanel({ startMode: 'blank' });
    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, '+ Add educator');

    const addCard = container.querySelector('[aria-labelledby="ae-add-educator-title"]');
    const fields = addCard.querySelectorAll('input');
    enterInput(fields[0], 'Draft Educator');
    enterInput(fields[1], 'DRAFT-01');
    clickButton(container, 'Cancel');

    expect(container.querySelector('[aria-labelledby="ae-add-educator-title"]')).toBeNull();
    expect(container.textContent).not.toContain('Draft Educator');
    const stored = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1'));
    expect(stored.teachers).toHaveLength(0);
    expect(stored.audit).toHaveLength(0);
  });

  it('clicks through every evaluator tab without losing the tab-panel contract', () => {
    const container = mountPanel();
    const routes = [
      ['staff', 'Staff and evaluation assignments'],
      ['walkthroughs', 'Walkthrough observations'],
      ['formal', 'Formal comprehensive observations'],
      ['spm', 'SPM / SLO'],
      ['audit', 'Audit, reports, and handoff'],
      ['about', 'Setup, sources, and sharing'],
      ['overview', 'Evaluation overview'],
    ];

    for (const [id, heading] of routes) {
      click(container.querySelector('#ae-tab-' + id));
      const tab = container.querySelector('#ae-tab-' + id);
      const panel = container.querySelector('#ae-panel');
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(panel.getAttribute('aria-labelledby')).toBe('ae-tab-' + id);
      expect(panel.textContent).toContain(heading);
    }
  });

  it('scopes teacher view to one educator and removes organization-wide controls', () => {
    const container = mountRealLocalFixture();
    clickButton(container, 'Educator preview');

    expect(container.querySelector('.ae-role button[aria-pressed="true"]').textContent).toBe('Educator preview');
    expect(container.textContent).toContain('Read-only educator preview');
    expect(Array.from(container.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent)).toEqual([
      'My evaluation', 'My trends', 'My evidence', 'Formal observation', 'SPM / SLO', 'Timeline', 'About',
    ]);
    expect(container.textContent).toContain('My evaluation');
    expect(container.textContent).not.toContain('Teachers evaluated');
    expect(container.textContent).not.toContain('Roster status');
    expect(container.textContent).not.toContain('Selected educator');
    expect(container.querySelector('#ae-tab-staff')).toBeNull();
    expect(container.querySelectorAll('.ae-donut')).toHaveLength(1);

    click(container.querySelector('#ae-tab-walkthroughs'));
    expect(container.querySelector('#ae-panel').textContent).toContain('Walkthrough observations');
    expect(container.textContent).not.toContain('+ Start walkthrough');

    click(container.querySelector('#ae-tab-formal'));
    expect(container.querySelector('#ae-panel').textContent).toContain('Formal comprehensive observations');
    expect(container.textContent).not.toContain('+ Assign formal observation');

    click(container.querySelector('#ae-tab-spm'));
    expect(container.querySelector('#ae-panel').textContent).toContain('SPM / SLO');

    click(container.querySelector('#ae-tab-audit'));
    expect(container.querySelector('#ae-panel').textContent).toContain('My evaluation timeline');
    expect(container.textContent).toContain('My copy');
    expect(container.textContent).toContain('Download my summary HTML');
    expect(container.querySelector('[aria-label="Filter audit timeline"]')).toBeNull();
    expect(container.textContent).not.toContain('All educators');
    expect(container.textContent).not.toContain('Export and transfer');
    expect(container.textContent).not.toContain('Export workspace JSON');
    expect(container.textContent).not.toContain('Export status CSV');
    expect(container.textContent).not.toContain('Choose JSON export');
    expect(container.textContent).not.toContain('Replace sample with blank workspace');

    click(container.querySelector('#ae-tab-about'));
    // Educators get their own heading here; the evaluator wording is asserted
    // in the tab-contract test above.
    expect(container.querySelector('#ae-panel').textContent).toContain('About this workspace');
    expect(container.querySelector('#ae-panel').textContent).not.toContain('Setup, sources, and sharing');
    expect(container.querySelector('#ae-panel fieldset').disabled).toBe(true);
  });

  it('makes educator-owned controls visibly read-only in a local educator preview', () => {
    const container = mountRealLocalFixture();
    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, 'Teacher 03');
    clickButton(container, 'Educator preview');

    const statementSection = Array.from(container.querySelectorAll('section'))
      .find((section) => section.textContent.includes('Your statement for the record'));
    const statement = statementSection.querySelector('textarea');
    const save = Array.from(statementSection.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Save statement'));
    expect(statement.readOnly).toBe(true);
    expect(save.disabled).toBe(true);
    expect(statementSection.textContent).toContain('Preview only. The educator can write this statement');
  });

  it('flushes local work before routing close-button, backdrop, and Escape requests through onClose', () => {
    const onClose = vi.fn();
    const container = mountPanel({ onClose }, SourceEducatorEvaluationPanel);

    click(container.querySelector('[aria-label="Close Educator Growth and Evaluation"]'));
    expect(onClose).toHaveBeenCalledTimes(1);

    click(container.querySelector('.ae-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('blocks every in-app close route when a local save fails and points to recovery actions', () => {
    const workspace = sampleWorkspaceFixture();
    workspace.config.sampleMode = false;
    localStorage.setItem('allo_educator_evaluation_workspace_v1', JSON.stringify(workspace));
    const onClose = vi.fn();
    const container = mountPanel({ startMode: null, onClose }, SourceEducatorEvaluationPanel);
    const originalSetItem = window.Storage.prototype.setItem;
    const storageSpy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'allo_educator_evaluation_workspace_v1') throw new window.DOMException('Storage quota reached', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    });

    try {
      click(container.querySelector('#ae-tab-staff'));
      clickButton(container, '+ Add educator');
      const addCard = container.querySelector('[aria-labelledby="ae-add-educator-title"]');
      const fields = addCard.querySelectorAll('input');
      enterInput(fields[0], 'Unsaved Educator');
      enterInput(fields[1], 'T-UNSAVED');
      clickButton(container, 'Save educator');

      click(container.querySelector('[aria-label="Close Educator Growth and Evaluation"]'));
      expect(onClose).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Close blocked. Use Retry save or Download emergency backup before closing.');
      expect(container.textContent).toContain('Retry save');
      expect(container.textContent).toContain('Download emergency backup');

      click(container.querySelector('.ae-overlay'));
      act(() => {
        document.dispatchEvent(new window.KeyboardEvent('keydown', {
          key: 'Escape', bubbles: true, cancelable: true,
        }));
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Close blocked because changes are not saved.');
    } finally {
      storageSpy.mockRestore();
    }
  });

  it('keeps every local and sample record hidden until remote identity verification finishes', async () => {
    const sample = sampleWorkspaceFixture();
    localStorage.setItem('allo_educator_evaluation_workspace_v1', JSON.stringify(sample));
    let finishBootstrap;
    const repository = {
      bootstrap: vi.fn(() => new Promise((resolveBootstrap) => { finishBootstrap = resolveBootstrap; })),
      saveWorkspace: vi.fn(),
    };
    const container = mountPanel({ repository });

    expect(container.textContent).toContain('Loading your district evaluation workspace');
    expect(container.textContent).toContain('Records remain hidden until identity and assignments are verified.');
    expect(container.textContent).not.toContain(sample.teachers[0].name);
    expect(container.textContent).not.toContain('Simulated data');
    expect(container.querySelector('#ae-panel')).toBeNull();

    finishBootstrap({
      ok: true,
      workspace: sample,
      revision: 4,
      currentUser: { email: 'principal@district.example', role: 'evaluator' },
      deployment: { kind: 'apps-script' },
    });
    await flushRemote();

    expect(container.textContent).toContain('District Google account');
    expect(container.textContent).toContain('principal@district.example');
    expect(container.textContent).toContain(sample.teachers[0].name);
    expect(container.textContent).not.toContain('Sample workspace');

    click(container.querySelector('#ae-tab-staff'));
    expect(container.querySelector('#ae-panel').textContent).toContain('Staff and cycle profiles');
    expect(container.textContent).not.toContain('+ Add educator');
    const leadEvaluatorLabel = Array.from(container.querySelectorAll('label')).find((label) => label.textContent.includes('Lead evaluator display label'));
    expect(leadEvaluatorLabel).toBeTruthy();
    expect(leadEvaluatorLabel.querySelector('input').readOnly).toBe(true);
    expect(container.textContent).toContain('This display label does not grant or revoke access.');

    click(container.querySelector('#ae-tab-audit'));
    expect(container.textContent).toContain('Direct downloads, imports, and reset stay disabled in the portal.');
    expect(container.textContent).not.toContain('Export status CSV');
    expect(container.textContent).not.toContain('Workflow summary HTML');

    click(container.querySelector('#ae-tab-about'));
    expect(container.querySelector('#ae-panel fieldset').disabled).toBe(true);
    expect(container.textContent).toContain('District configuration is read-only here.');
  });

  it('fails closed on bootstrap errors, exposes no records, and retries identity verification', async () => {
    const sample = sampleWorkspaceFixture();
    const repository = {
      bootstrap: vi.fn()
        .mockRejectedValueOnce(new Error('Managed Google identity is unavailable.'))
        .mockResolvedValueOnce({
          ok: true,
          workspace: sample,
          revision: 9,
          currentUser: { email: 'principal@district.example', role: 'evaluator' },
          deployment: { kind: 'apps-script' },
        }),
      saveWorkspace: vi.fn(),
    };
    const container = mountPanel({ repository });
    await flushRemote();

    expect(container.querySelector('[role="alert"]').textContent).toContain('The secure workspace could not be opened');
    expect(container.textContent).toContain('Managed Google identity is unavailable.');
    expect(container.textContent).not.toContain(sample.teachers[0].name);
    expect(container.querySelector('#ae-panel')).toBeNull();

    clickButton(container, 'Try again');
    await flushRemote();

    expect(repository.bootstrap).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('principal@district.example');
    expect(container.textContent).toContain(sample.teachers[0].name);
  });

  it('locks an authenticated teacher to their assigned records and removes local transfer controls', async () => {
    const sample = sampleWorkspaceFixture();
    const ownTeacher = sample.teachers[0];
    const otherTeacher = sample.teachers[1];
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 11,
        currentUser: { email: 'teacher.one@district.example', role: 'teacher', teacherId: ownTeacher.id },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
    };
    const container = mountPanel({ repository });
    await flushRemote();

    expect(container.textContent).toContain('District Google account');
    expect(container.textContent).toContain('teacher.one@district.example');
    expect(container.textContent).toContain('Educator access');
    expect(container.textContent).toContain(ownTeacher.name);
    expect(container.textContent).not.toContain(otherTeacher.name);
    expect(container.querySelector('.ae-role')).toBeNull();
    expect(container.querySelector('#ae-tab-staff')).toBeNull();

    click(container.querySelector('#ae-tab-audit'));
    expect(container.textContent).toContain('My evaluation timeline');
    expect(container.textContent).not.toContain('Export workspace JSON');
    expect(container.textContent).not.toContain('Choose JSON export');
    expect(container.textContent).not.toContain('Replace sample with blank workspace');
    expect(container.textContent).not.toContain('Download my summary HTML');
    expect(container.textContent).toContain('Direct downloads, imports, and reset stay disabled in the portal.');
  });

  it('ignores a cross-teacher deep link and keeps the authenticated teacher in an allowed view', async () => {
    const sample = sampleWorkspaceFixture();
    const ownTeacher = sample.teachers[0];
    const otherTeacher = sample.teachers[1];
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 12,
        currentUser: { email: 'teacher.one@district.example', role: 'teacher', teacherId: ownTeacher.id },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
    };
    const container = mountPanel({
      repository,
      initialRoute: { view: 'walkthroughs', teacherId: otherTeacher.id, recordId: 'foreign-record' },
    });
    await flushRemote();

    expect(container.querySelector('#ae-tab-walkthroughs').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#ae-panel').textContent).toContain('Walkthrough observations');
    expect(container.textContent).not.toContain(otherTeacher.name);
    expect(container.textContent).not.toContain('+ Start walkthrough');
    click(container.querySelector('#ae-tab-overview'));
    expect(container.textContent).toContain(ownTeacher.name);
    expect(container.textContent).not.toContain(otherTeacher.name);
  });

  it('reviews one content-free notice, blocks double activation, and focuses the exact completed receipt', async () => {
    const sample = sampleWorkspaceFixture();
    let finishSend;
    const reviewNotification = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'notice-review-completed',
        expiresAt: '2026-08-27T20:10:00.000Z',
        teacherId: sample.teachers[0].id,
        target: 'teacher',
        recipient: 'teacher.one@district.example',
        recipientDisplayName: 'Teacher One',
        educatorName: sample.teachers[0].name,
        portalUrl: 'https://script.google.com/macros/s/NOTICE-COMPLETED/exec',
      },
    });
    const sendNotification = vi.fn(() => new Promise((resolveSend) => { finishSend = resolveSend; }));
    const getNotificationOutcome = vi.fn().mockResolvedValue({
      ok: true,
      status: 'no_unresolved',
      reviewUsable: false,
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 14,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    expect(getNotificationOutcome).toHaveBeenCalledWith({
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(reviewNotification).toHaveBeenCalledWith({
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    const dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('teacher.one@district.example');
    expect(dialog.textContent).toContain('https://script.google.com/macros/s/NOTICE-COMPLETED/exec');
    expect(dialog.textContent).toContain('No educator name, ratings, evidence, comments, evaluation content, or attachments.');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    expect(document.activeElement).toBe(confirmation);
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    const sendButton = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Confirm and send notice'));
    act(() => {
      sendButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      sendButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith({
      teacherId: sample.teachers[0].id,
      target: 'teacher',
      reviewToken: 'notice-review-completed',
      acknowledged: true,
    });
    expect(dialog.querySelector('[aria-busy="true"]')).toBeTruthy();

    finishSend({
      ok: true,
      status: 'completed',
      idempotent: false,
      recipient: 'teacher.one@district.example',
      message: 'Exact receipt: one content-free educator notice was completed.',
    });
    await flushRemote();
    await act(async () => { await new Promise((resolveFocus) => setTimeout(resolveFocus, 25)); });
    const receipt = Array.from(container.querySelectorAll('.ae-operation-notice[tabindex="-1"]')).find((node) => node.textContent.includes('Exact notice receipt'));
    expect(receipt).toBeTruthy();
    expect(receipt.getAttribute('role')).toBe('status');
    expect(receipt.textContent).toContain('Exact receipt: one content-free educator notice was completed.');
    expect(document.activeElement).toBe(receipt);
    const lockedButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Notice sent'));
    expect(lockedButton.disabled).toBe(true);
    click(lockedButton);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('locks a lost notice response and recovers only through an exact delivery-unknown outcome check', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'notice-review-lost-response',
        expiresAt: '2026-08-27T20:10:00.000Z',
        teacherId: sample.teachers[0].id,
        target: 'teacher',
        recipient: 'teacher.one@district.example',
        recipientDisplayName: 'Teacher One',
        educatorName: sample.teachers[0].name,
        portalUrl: 'https://script.google.com/macros/s/NOTICE-LOST-RESPONSE/exec',
      },
    });
    const sendNotification = vi.fn().mockRejectedValue(new Error('Connection closed after the notice request.'));
    const getNotificationOutcome = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 'no_unresolved', reviewUsable: false })
      .mockResolvedValue({
        ok: true,
        status: 'delivery_unknown',
        idempotent: true,
        message: 'Exact receipt: the delivery provider has not confirmed a final outcome.',
      });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 15,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    const dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    clickButton(container, 'Confirm and send notice');
    await flushRemote();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('The notice response was lost. Do not resend this notice.');
    expect(Array.from(container.querySelectorAll('button')).filter((button) => button.textContent.includes('Email educator a portal notice'))).toHaveLength(0);
    clickButton(container, 'Check exact notice outcome');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenCalledTimes(2);
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(1, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
      reviewToken: 'notice-review-lost-response',
    });
    expect(container.textContent).toContain('Exact receipt: the delivery provider has not confirmed a final outcome.');
    expect(container.textContent).toContain('Outcome · delivery unknown');
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const lockedButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Notice outcome locked'));
    expect(lockedButton.disabled).toBe(true);
  });

  it('carries explicit repeat approval through recipient selection after canonical prior completion', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 'recipient_selection_required',
        recipients: [
          { email: 'evaluator.one@district.example', displayName: 'Evaluator One' },
          { email: 'evaluator.two@district.example', displayName: 'Evaluator Two' },
        ],
      })
      .mockResolvedValue({
        ok: true,
        review: {
          token: 'notice-review-after-prior-completion',
          expiresAt: '2026-08-28T20:10:00.000Z',
          teacherId: sample.teachers[0].id,
          target: 'evaluator',
          recipient: 'evaluator.two@district.example',
          recipientDisplayName: 'Evaluator Two',
          educatorName: sample.teachers[0].name,
          portalUrl: 'https://script.google.com/macros/s/NOTICE-AFTER-COMPLETION/exec',
        },
      });
    const sendNotification = vi.fn();
    const getNotificationOutcome = vi.fn().mockResolvedValue({
      ok: true,
      status: 'completed',
      idempotent: true,
      repeatEligible: true,
      message: 'Exact receipt: the prior reviewed notice completed.',
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 16,
        currentUser: { email: 'teacher.one@district.example', role: 'teacher', teacherId: sample.teachers[0].id },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email evaluator a portal notice');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenCalledTimes(1);
    expect(getNotificationOutcome).toHaveBeenCalledWith({
      teacherId: sample.teachers[0].id,
      target: 'evaluator',
    });
    expect(reviewNotification).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Exact receipt: the prior reviewed notice completed.');

    clickButton(container, 'Prepare another reviewed notice');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenCalledTimes(1);
    expect(reviewNotification).toHaveBeenNthCalledWith(1, {
      teacherId: sample.teachers[0].id,
      target: 'evaluator',
    });
    let dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    expect(dialog.textContent).toContain('Choose the authorized notice recipient');
    const recipientSelect = dialog.querySelector('select');
    act(() => { Simulate.change(recipientSelect, { target: { value: 'evaluator.two@district.example' } }); });
    clickButton(container, 'Continue to notice review');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenCalledTimes(1);
    expect(reviewNotification).toHaveBeenCalledTimes(2);
    expect(reviewNotification).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'evaluator',
      recipient: 'evaluator.two@district.example',
    });
    expect(sendNotification).not.toHaveBeenCalled();
    dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('https://script.google.com/macros/s/NOTICE-AFTER-COMPLETION/exec');
  });
  it('discovers an unresolved notice tokenlessly after remount and never prepares or resends it', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn();
    const sendNotification = vi.fn();
    const getNotificationOutcome = vi.fn().mockResolvedValue({
      ok: true,
      status: 'delivery_unknown',
      idempotent: true,
      message: 'Exact receipt: an earlier notice remains unresolved.',
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 16,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };

    mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();
    expect(getNotificationOutcome).not.toHaveBeenCalled();
    unmountLast();

    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();
    clickButton(container, 'Email educator a portal notice');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenNthCalledWith(1, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(reviewNotification).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Exact receipt: an earlier notice remains unresolved.');
    const lockedButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Notice outcome locked'));
    expect(lockedButton.disabled).toBe(true);

    clickButton(container, 'Check exact notice outcome');
    await flushRemote();
    expect(getNotificationOutcome).toHaveBeenCalledTimes(2);
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(Object.prototype.hasOwnProperty.call(getNotificationOutcome.mock.calls[1][0], 'reviewToken')).toBe(false);
    expect(reviewNotification).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('unlocks a notice only after pre-dispatch refusal and tokenless no-unresolved verification', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'notice-review-pre-dispatch',
        expiresAt: '2026-08-28T20:10:00.000Z',
        teacherId: sample.teachers[0].id,
        target: 'teacher',
        recipient: 'teacher.one@district.example',
        recipientDisplayName: 'Teacher One',
        educatorName: sample.teachers[0].name,
        portalUrl: 'https://script.google.com/macros/s/NOTICE-PRE-DISPATCH/exec',
      },
    });
    const sendNotification = vi.fn().mockResolvedValue({
      ok: false,
      code: 'mail_quota_exhausted',
      error: 'The daily mail quota is exhausted.',
      preDispatch: true,
    });
    const getNotificationOutcome = vi.fn().mockResolvedValue({
      ok: true,
      status: 'no_unresolved',
      reviewUsable: false,
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 17,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    const dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    clickButton(container, 'Confirm and send notice');
    await flushRemote();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(getNotificationOutcome).toHaveBeenCalledTimes(2);
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(container.textContent).toContain('The district repository refused this notice before mail dispatch. Nothing was sent; you may prepare a fresh review.');
    expect(container.textContent).toContain('The daily mail quota is exhausted.');
    expect(container.textContent).not.toContain('Exact notice receipt');
    const retryButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Email educator a portal notice'));
    expect(retryButton).toBeTruthy();
    expect(retryButton.disabled).toBe(false);

    click(retryButton);
    await flushRemote();
    expect(getNotificationOutcome).toHaveBeenCalledTimes(3);
    expect(reviewNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it('locks a pre-dispatch recovery-required response when tokenless scope verification is delivery unknown', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'notice-review-pre-dispatch-recovery',
        expiresAt: '2026-08-28T20:10:00.000Z',
        teacherId: sample.teachers[0].id,
        target: 'teacher',
        recipient: 'teacher.one@district.example',
        recipientDisplayName: 'Teacher One',
        educatorName: sample.teachers[0].name,
        portalUrl: 'https://script.google.com/macros/s/NOTICE-PRE-DISPATCH-RECOVERY/exec',
      },
    });
    const sendNotification = vi.fn().mockResolvedValue({
      ok: false,
      code: 'notification_recovery_required',
      error: 'A prior operation requires exact recovery.',
      preDispatch: true,
    });
    const getNotificationOutcome = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 'no_unresolved', reviewUsable: false })
      .mockResolvedValue({
        ok: true,
        status: 'delivery_unknown',
        idempotent: true,
        message: 'Exact scoped receipt: an earlier notice remains unresolved.',
      });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 18,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    const dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    clickButton(container, 'Confirm and send notice');
    await flushRemote();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(getNotificationOutcome).toHaveBeenCalledTimes(2);
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(1, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(container.textContent).toContain('Exact notice receipt');
    expect(container.textContent).toContain('Exact scoped receipt: an earlier notice remains unresolved.');
    expect(container.textContent).not.toContain('Nothing was sent; you may prepare a fresh review.');
    expect(Array.from(container.querySelectorAll('button')).filter((button) => button.textContent.includes('Email educator a portal notice'))).toHaveLength(0);
    const lockedButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Notice outcome locked'));
    expect(lockedButton).toBeTruthy();
    expect(lockedButton.disabled).toBe(true);
    expect(reviewNotification).toHaveBeenCalledTimes(1);
  });
  it('unlocks a transport-ambiguous notice only when an exact outcome check confirms not started', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewNotification = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'notice-review-confirmed-not-started',
        expiresAt: '2026-08-28T20:10:00.000Z',
        teacherId: sample.teachers[0].id,
        target: 'teacher',
        recipient: 'teacher.one@district.example',
        recipientDisplayName: 'Teacher One',
        educatorName: sample.teachers[0].name,
        portalUrl: 'https://script.google.com/macros/s/NOTICE-NOT-STARTED/exec',
      },
    });
    const sendNotification = vi.fn().mockRejectedValue(new Error('Connection closed before the response arrived.'));
    const getNotificationOutcome = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 'no_unresolved', reviewUsable: false })
      .mockResolvedValue({
        ok: true,
        status: 'not_started',
        reviewUsable: false,
        message: 'Exact outcome: no mail dispatch began.',
      });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 18,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewNotification,
      sendNotification,
      getNotificationOutcome,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    const dialog = container.querySelector('[aria-labelledby="ae-notification-review-title"]');
    const confirmation = dialog.querySelector('input[type="checkbox"]');
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    clickButton(container, 'Confirm and send notice');
    await flushRemote();
    expect(container.textContent).toContain('The notice response was lost. Do not resend this notice.');
    expect(container.textContent).toContain('Exact notice receipt');

    clickButton(container, 'Check exact notice outcome');
    await flushRemote();

    expect(getNotificationOutcome).toHaveBeenCalledTimes(2);
    expect(getNotificationOutcome).toHaveBeenNthCalledWith(2, {
      teacherId: sample.teachers[0].id,
      target: 'teacher',
      reviewToken: 'notice-review-confirmed-not-started',
    });
    expect(container.textContent).toContain('Exact outcome: no mail dispatch began.');
    expect(container.textContent).not.toContain('Exact notice receipt');
    const retryButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Email educator a portal notice'));
    expect(retryButton).toBeTruthy();
    expect(retryButton.disabled).toBe(false);
    expect(reviewNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
  it('discards an AI reflection that returns after the evaluator switches educators and audits only the current request', async () => {
    const sample = sampleWorkspaceFixture();
    const firstTeacher = sample.teachers[0];
    const secondTeacher = sample.teachers[1];
    sample.config.aiReflectionEnabled = true;
    sample.walkthroughs.push(
      {
        id: 'ai-scope-first',
        teacherId: firstTeacher.id,
        createdAt: '2026-08-20T12:00:00.000Z',
        date: '2026-08-20',
        startedAt: '2026-08-20T12:00:00.000Z',
        durationMin: 8,
        announced: 'unannounced',
        lessonPhase: 'middle',
        subject: 'First scope',
        evidence: 'FIRST EDUCATOR AI EVIDENCE',
        interpretation: '',
        componentTags: ['1a'],
        publishedAt: '2026-08-20T13:00:00.000Z',
        version: 1,
      },
      {
        id: 'ai-scope-second',
        teacherId: secondTeacher.id,
        createdAt: '2026-08-21T12:00:00.000Z',
        date: '2026-08-21',
        startedAt: '2026-08-21T12:00:00.000Z',
        durationMin: 8,
        announced: 'unannounced',
        lessonPhase: 'middle',
        subject: 'Second scope',
        evidence: 'SECOND EDUCATOR AI EVIDENCE',
        interpretation: '',
        componentTags: ['2a'],
        publishedAt: '2026-08-21T13:00:00.000Z',
        version: 1,
      },
    );
    let resolveFirst;
    let resolveSecond;
    const previousCallGemini = window.callGemini;
    window.callGemini = vi.fn()
      .mockImplementationOnce(() => new Promise((resolveRequest) => { resolveFirst = resolveRequest; }))
      .mockImplementationOnce(() => new Promise((resolveRequest) => { resolveSecond = resolveRequest; }));
    const saveWorkspace = vi.fn((payload) => Promise.resolve({
      ok: true,
      revision: 42,
      workspace: payload.workspace,
    }));
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 41,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace,
    };

    try {
      const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
      await flushRemote();

      clickButton(container, 'Ask for alternative readings');
      await flushRemote();
      expect(window.callGemini).toHaveBeenCalledTimes(1);
      expect(window.callGemini.mock.calls[0][0]).toContain('FIRST EDUCATOR AI EVIDENCE');

      const educatorSelect = Array.from(container.querySelectorAll('label'))
        .find((label) => label.textContent.includes('Selected educator'))
        .querySelector('select');
      act(() => {
        Simulate.change(educatorSelect, { target: { value: secondTeacher.id } });
      });
      const currentButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Ask for alternative readings'));
      expect(currentButton).toBeTruthy();
      expect(currentButton.disabled).toBe(false);

      click(currentButton);
      await flushRemote();
      expect(window.callGemini).toHaveBeenCalledTimes(2);
      expect(window.callGemini.mock.calls[1][0]).toContain('SECOND EDUCATOR AI EVIDENCE');
      const workingCard = Array.from(container.querySelectorAll('.ae-note.ae-info'))
        .find((card) => card.textContent.includes('Second read on your own reasoning'));
      expect(workingCard.querySelector('[role="status"]').textContent).toContain('scoped to this educator');

      await act(async () => {
        resolveSecond('CURRENT SECOND EDUCATOR RESPONSE');
        await Promise.resolve();
        await Promise.resolve();
      });
      await flushRemote();
      expect(container.textContent).toContain('CURRENT SECOND EDUCATOR RESPONSE');
      expect(container.textContent).toContain('Alternative reading ready for this educator.');

      await act(async () => {
        resolveFirst('STALE FIRST EDUCATOR RESPONSE');
        await Promise.resolve();
        await Promise.resolve();
      });
      await flushRemote();
      expect(container.textContent).not.toContain('STALE FIRST EDUCATOR RESPONSE');
      expect(container.textContent).toContain('CURRENT SECOND EDUCATOR RESPONSE');

      await flushRemoteDebounce();
      expect(saveWorkspace).toHaveBeenCalledTimes(1);
      expect(saveWorkspace.mock.calls[0][0].mutation).toMatchObject({
        teacherId: secondTeacher.id,
        event: 'CONFIG_UPDATED',
        entityType: 'evaluation',
        entityId: secondTeacher.id,
      });
    } finally {
      if (previousCallGemini === undefined) delete window.callGemini;
      else window.callGemini = previousCallGemini;
    }
  }, 15000);
  it('reviews the authoritative recipient before granting released-summary access', async () => {
    const sample = sampleWorkspaceFixture();
    sample.teachers[0].finalizedAt = '2026-08-12T12:00:00.000Z';
    sample.teachers[0].cycleStatus = 'finalized';
    const reviewReleasedEvaluation = vi.fn().mockResolvedValue({
      ok: true,
      review: {
        token: 'release-review-123',
        educatorName: sample.teachers[0].name,
        recipient: 'teacher.one@district.example',
        finalizedAt: sample.teachers[0].finalizedAt,
        action: 'create',
        actorWillReceiveAccess: true,
      },
    });
    const shareReleasedEvaluation = vi.fn().mockResolvedValue({
      ok: true,
      created: true,
      idempotent: false,
      recoveryPending: false,
      doc: { id: 'doc-1', url: 'https://docs.google.com/document/d/doc-1', sharedAt: '2026-08-13T12:00:00.000Z' },
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 22,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewReleasedEvaluation,
      shareReleasedEvaluation,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    const releaseButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Review & share released summary'));
    act(() => {
      releaseButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      releaseButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await flushRemote();
    expect(reviewReleasedEvaluation).toHaveBeenCalledTimes(1);
    expect(reviewReleasedEvaluation).toHaveBeenCalledWith({ teacherId: sample.teachers[0].id });
    expect(shareReleasedEvaluation).not.toHaveBeenCalled();
    const dialog = container.querySelector('[aria-labelledby="ae-release-title"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('teacher.one@district.example');
    expect(dialog.textContent).toContain('Nothing has been shared');
    expect(dialog.querySelector('.ae-release-actions .ae-btn-primary').disabled).toBe(true);

    const confirmation = dialog.querySelector('input[type="checkbox"]');
    act(() => { Simulate.change(confirmation, { target: { checked: true } }); });
    expect(dialog.querySelector('.ae-release-actions .ae-btn-primary').disabled).toBe(false);
    const confirmButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Confirm and grant access'));
    act(() => {
      confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      confirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await flushRemote();
    expect(shareReleasedEvaluation).toHaveBeenCalledTimes(1);
    expect(shareReleasedEvaluation).toHaveBeenCalledWith({ teacherId: sample.teachers[0].id, reviewToken: 'release-review-123' });
  });

  it('cancels a released-summary confirmation when the selected educator no longer matches its review', async () => {
    const sample = sampleWorkspaceFixture();
    const reviewedTeacher = sample.teachers[0];
    const otherTeacher = sample.teachers[1];
    reviewedTeacher.finalizedAt = '2026-08-12T12:00:00.000Z';
    reviewedTeacher.cycleStatus = 'finalized';
    const shareReleasedEvaluation = vi.fn();
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 22,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      reviewReleasedEvaluation: vi.fn().mockResolvedValue({
        ok: true,
        review: {
          token: 'release-review-stale',
          educatorName: reviewedTeacher.name,
          recipient: 'teacher.one@district.example',
          finalizedAt: reviewedTeacher.finalizedAt,
          action: 'create',
          actorWillReceiveAccess: true,
        },
      }),
      shareReleasedEvaluation,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    clickButton(container, 'Review & share released summary');
    await flushRemote();
    const educatorSelect = Array.from(container.querySelectorAll('label'))
      .find((label) => label.textContent.includes('Selected educator'))
      .querySelector('select');
    act(() => {
      Simulate.change(educatorSelect, { target: { value: otherTeacher.id } });
    });

    const dialog = container.querySelector('[aria-labelledby="ae-release-title"]');
    act(() => {
      Simulate.change(dialog.querySelector('input[type="checkbox"]'), { target: { checked: true } });
    });
    clickButton(container, 'Confirm and grant access');
    await flushRemote();

    expect(shareReleasedEvaluation).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-labelledby="ae-release-title"]')).toBeNull();
    expect(container.textContent).toContain('selected educator no longer matches this disclosure review');
    expect(container.textContent).toContain('nothing was shared');
  });
  it('serializes a latest profile snapshot when another edit lands during an active remote save', async () => {
    const sample = sampleWorkspaceFixture();
    sample.config.sampleMode = false;
    const teacher = sample.teachers[2];
    const originalAssignment = teacher.assignment;
    const payloads = [];
    let activeRequests = 0;
    let maxActiveRequests = 0;
    let finishFirstSave;
    const saveWorkspace = vi.fn((payload) => {
      const savedPayload = JSON.parse(JSON.stringify(payload));
      payloads.push(savedPayload);
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      if (payloads.length === 1) {
        return new Promise((resolveSave) => {
          finishFirstSave = () => {
            activeRequests -= 1;
            resolveSave({ ok: true, revision: 31, workspace: savedPayload.workspace });
          };
        });
      }
      activeRequests -= 1;
      return Promise.resolve({ ok: true, revision: 32, workspace: savedPayload.workspace });
    });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 30,
        currentUser: { email: 'principal@district.example', role: 'admin' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();

    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, teacher.name);
    let selectedCard = Array.from(container.querySelectorAll('section'))
      .find((section) => section.querySelector('h3')?.textContent === 'Selected educator');
    enterInput(labeledInput(selectedCard, 'Name'), 'Queued Name');
    await flushRemoteDebounce();

    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#ae-panel').getAttribute('aria-busy')).toBe('true');
    selectedCard = Array.from(container.querySelectorAll('section'))
      .find((section) => section.querySelector('h3')?.textContent === 'Selected educator');
    enterInput(labeledInput(selectedCard, 'Assignment'), 'Queued Assignment');
    await flushRemoteDebounce();

    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    expect(labeledInput(selectedCard, 'Name').value).toBe('Queued Name');
    expect(labeledInput(selectedCard, 'Assignment').value).toBe('Queued Assignment');
    await act(async () => {
      finishFirstSave();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushRemote();

    expect(saveWorkspace).toHaveBeenCalledTimes(2);
    expect(maxActiveRequests).toBe(1);
    expect(payloads.map((payload) => payload.expectedVersion)).toEqual([30, 31]);
    expect(payloads[0].workspace.teachers.find((item) => item.id === teacher.id)).toMatchObject({ name: 'Queued Name', assignment: originalAssignment });
    expect(payloads[1].workspace.teachers.find((item) => item.id === teacher.id)).toMatchObject({ name: 'Queued Name', assignment: 'Queued Assignment' });
    selectedCard = Array.from(container.querySelectorAll('section'))
      .find((section) => section.querySelector('h3')?.textContent === 'Selected educator');
    expect(labeledInput(selectedCard, 'Name').value).toBe('Queued Name');
    expect(labeledInput(selectedCard, 'Assignment').value).toBe('Queued Assignment');
    expect(container.querySelector('#ae-panel').getAttribute('aria-busy')).not.toBe('true');
  }, 20000);

  it('moves focus into concurrent-edit recovery and restores it after either resolution', async () => {
    const initial = sampleWorkspaceFixture();
    initial.config.sampleMode = false;
    const teacher = initial.teachers[2];
    const districtOne = JSON.parse(JSON.stringify(initial));
    districtOne.teachers.find((item) => item.id === teacher.id).assignment = 'District Assignment One';
    const districtTwo = JSON.parse(JSON.stringify(districtOne));
    districtTwo.teachers.find((item) => item.id === teacher.id).building = 'District Building Two';
    const bootstrapPayloads = [initial, districtOne, districtTwo];
    let bootstrapCall = 0;
    let saveCall = 0;
    let finishReplay;
    const saveWorkspace = vi.fn((payload) => {
      saveCall += 1;
      if (saveCall <= 2) {
        const error = new Error('Another session saved first.');
        error.code = 'conflict';
        return Promise.reject(error);
      }
      const saved = JSON.parse(JSON.stringify(payload.workspace));
      return new Promise((resolveSave) => {
        finishReplay = () => resolveSave({ ok: true, revision: 73, workspace: saved });
      });
    });
    const repository = {
      bootstrap: vi.fn(() => {
        const workspace = bootstrapPayloads[Math.min(bootstrapCall, bootstrapPayloads.length - 1)];
        const revision = 70 + bootstrapCall;
        bootstrapCall += 1;
        return Promise.resolve({ ok: true, workspace: JSON.parse(JSON.stringify(workspace)), revision,
          currentUser: { email: 'principal@district.example', role: 'admin' }, deployment: { kind: 'apps-script' } });
      }),
      saveWorkspace,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();
    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, teacher.name);
    const selectedCard = () => Array.from(container.querySelectorAll('section'))
      .find((section) => section.querySelector('h3')?.textContent === 'Selected educator');
    const conflictTitle = () => container.querySelector('#ae-conflict-title');
    const conflictButtons = () => Array.from(conflictTitle().closest('section').querySelectorAll('button'));

    enterInput(labeledInput(selectedCard(), 'Name'), 'Discarded conflict attempt');
    await flushRemoteDebounce();
    await flushRemote();
    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    expect(conflictTitle()).toBeTruthy();
    expect(conflictTitle().tabIndex).toBe(-1);
    expect(document.activeElement).toBe(conflictTitle());
    expect(container.querySelector('#ae-panel').hasAttribute('inert')).toBe(true);
    expect(conflictButtons().map((button) => button.textContent.trim())).toEqual([
      'Use district version', 'Reapply only my non-conflicting work',
    ]);
    expect(conflictButtons().every((button) => button.tabIndex === 0 && !button.closest('[inert]'))).toBe(true);
    act(() => { conflictButtons()[0].focus(); });
    expect(document.activeElement).toBe(conflictButtons()[0]);
    click(conflictButtons()[0]);
    await flushFocusFrame();
    expect(container.querySelector('#ae-conflict-title')).toBeNull();
    expect(container.querySelector('#ae-panel').hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('#ae-tab-staff'));

    expect(labeledInput(selectedCard(), 'Assignment').value).toBe('District Assignment One');
    enterInput(labeledInput(selectedCard(), 'Name'), 'Safely replayed name');
    await flushRemoteDebounce();
    await flushRemote();
    expect(saveWorkspace).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(conflictTitle());
    expect(container.querySelector('#ae-panel').hasAttribute('inert')).toBe(true);
    expect(conflictButtons().map((button) => button.textContent.trim())).toEqual([
      'Use district version', 'Reapply only my non-conflicting work',
    ]);
    const replayButton = conflictButtons()[1];
    act(() => { replayButton.focus(); });
    click(replayButton);
    await flushRemote();
    await flushFocusFrame();
    expect(saveWorkspace).toHaveBeenCalledTimes(3);
    expect(typeof finishReplay).toBe('function');
    expect(document.activeElement).toBe(container.querySelector('#ae-tab-staff'));
    await act(async () => {
      finishReplay();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushRemote();
    await flushFocusFrame();
    expect(document.activeElement).toBe(container.querySelector('#ae-tab-staff'));
    expect(container.querySelector('#ae-panel').hasAttribute('inert')).toBe(false);
    expect(labeledInput(selectedCard(), 'Name').value).toBe('Safely replayed name');
    expect(labeledInput(selectedCard(), 'Assignment').value).toBe('District Assignment One');
    expect(labeledInput(selectedCard(), 'Building').value).toBe('District Building Two');
  }, 30000);

  it('locks annual-rollover controls and preserves the exact receipt after a recovery-pending outcome', async () => {
    const sample = sampleWorkspaceFixture();
    sample.config.sampleMode = false;
    sample.config.academicYear = '2026-27';
    let finishPerform;
    const reviewAnnualRollover = vi.fn().mockResolvedValue({ ok: true, review: {
      token: 'rollover-review-ui-lock', expiresAt: '2026-08-27T20:10:00.000Z',
      currentAcademicYear: '2026-27', nextAcademicYear: '2027-28',
      counts: { activeEducators: 8, finalizedCycles: 2, openCycles: 1, releasedDocuments: 1,
        retainedCycleSnapshots: 2, records: { walkthroughs: 2, observations: 1, spms: 1, comments: 1, total: 5 } },
    } });
    const performAnnualRollover = vi.fn(() => new Promise((resolvePerform) => { finishPerform = resolvePerform; }));
    const reconcileAnnualRollover = vi.fn()
      .mockRejectedValueOnce(new Error('Recovery recheck is temporarily unavailable.'))
      .mockResolvedValueOnce({ ok: true, status: 'recovery_pending', recoveryPending: true,
        archive: { id: 'archive-ui-lock', url: 'https://drive.google.com/file/d/archive-ui-lock/view' } })
      .mockResolvedValueOnce({ ok: true, status: 'archive_only', recoveryPending: true, resumable: true,
        archive: { id: 'archive-ui-lock', url: 'https://drive.google.com/file/d/archive-ui-lock/view' } });
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({ ok: true, workspace: sample, revision: 40,
        currentUser: { email: 'admin@district.example', role: 'admin' }, deployment: { kind: 'apps-script' } }),
      saveWorkspace: vi.fn(), reviewAnnualRollover, performAnnualRollover, reconcileAnnualRollover,
    };
    const container = mountPanel({ repository }, SourceEducatorEvaluationPanel);
    await flushRemote();
    click(container.querySelector('#ae-tab-about'));
    const section = container.querySelector('#ae-rollover-title').closest('section');
    const yearInput = labeledInput(section, 'Next academic year (YYYY-YY)');
    const reviewButton = clickButton(container, 'Review annual rollover');
    click(reviewButton);
    await flushRemote();
    expect(reviewAnnualRollover).toHaveBeenCalledTimes(1);

    const acknowledgments = section.querySelectorAll('input[type="checkbox"]');
    act(() => {
      Simulate.change(acknowledgments[0], { target: { checked: true } });
      Simulate.change(acknowledgments[1], { target: { checked: true } });
    });
    const confirmButton = clickButton(container, 'Create archive & start 2027-28');
    click(confirmButton);
    click(confirmButton);
    await flushRemote();
    expect(performAnnualRollover).toHaveBeenCalledTimes(1);
    expect(yearInput.matches(':disabled')).toBe(true);
    expect(reviewButton.matches(':disabled')).toBe(true);
    click(reviewButton);
    expect(reviewAnnualRollover).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishPerform({ ok: true, status: 'recovery_pending', recoveryPending: true,
        message: 'Exact rollover receipt retained for recovery.', fromAcademicYear: '2026-27', toAcademicYear: '2027-28',
        archive: { id: 'archive-ui-lock', url: 'https://drive.google.com/file/d/archive-ui-lock/view' } });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(section.textContent).toContain('Exact rollover receipt retained for recovery.');
    expect(section.querySelector('a[href="https://drive.google.com/file/d/archive-ui-lock/view"]')).toBeTruthy();
    expect(yearInput.matches(':disabled')).toBe(true);
    expect(reviewButton.matches(':disabled')).toBe(true);
    const rechecks = Array.from(section.querySelectorAll('button')).filter((button) => button.textContent.trim() === 'Recheck interrupted rollover');
    expect(rechecks).toHaveLength(1);
    expect(rechecks[0].matches(':disabled')).toBe(false);
    enterInput(yearInput, '2030-31');
    click(reviewButton);
    expect(section.textContent).toContain('Exact rollover receipt retained for recovery.');
    expect(reviewAnnualRollover).toHaveBeenCalledTimes(1);
    expect(performAnnualRollover).toHaveBeenCalledTimes(1);
    click(rechecks[0]);
    await flushRemote();
    expect(reconcileAnnualRollover).toHaveBeenCalledTimes(1);
    expect(section.textContent).toContain('Exact rollover receipt retained for recovery.');
    expect(section.querySelector('a[href="https://drive.google.com/file/d/archive-ui-lock/view"]')).toBeTruthy();
    expect(Array.from(section.querySelectorAll('button')).filter((button) => button.textContent.trim() === 'Recheck interrupted rollover')).toHaveLength(1);
    click(Array.from(section.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Recheck interrupted rollover'));
    await flushRemote();
    expect(reconcileAnnualRollover).toHaveBeenCalledTimes(2);
    expect(section.textContent).toContain('Exact rollover receipt retained for recovery.');
    expect(yearInput.matches(':disabled')).toBe(true);
    expect(reviewButton.matches(':disabled')).toBe(true);
    const pendingRechecks = Array.from(section.querySelectorAll('button')).filter((button) => button.textContent.trim() === 'Recheck interrupted rollover');
    expect(pendingRechecks).toHaveLength(1);
    expect(pendingRechecks[0].matches(':disabled')).toBe(false);
    click(pendingRechecks[0]);
    await flushRemote();
    expect(reconcileAnnualRollover).toHaveBeenCalledTimes(3);
    expect(section.textContent).toContain('fresh review may now be started');
    expect(section.querySelector('a[href="https://drive.google.com/file/d/archive-ui-lock/view"]')).toBeTruthy();
    expect(yearInput.matches(':disabled')).toBe(false);
    expect(reviewButton.matches(':disabled')).toBe(false);
    expect(reviewAnnualRollover).toHaveBeenCalledTimes(1);
    click(reviewButton);
    await flushRemote();
    expect(reviewAnnualRollover).toHaveBeenCalledTimes(2);
  }, 20000);

  it('warns before closing and blocks every in-app close route while a remote save remains unconfirmed', async () => {
    const sample = sampleWorkspaceFixture();
    const onClose = vi.fn();
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 15,
        currentUser: { email: 'principal@district.example', role: 'admin' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(() => new Promise(() => {})),
    };
    const container = mountPanel({ repository, onClose }, SourceEducatorEvaluationPanel);
    await flushRemote();

    const savedEvent = new window.Event('beforeunload', { cancelable: true });
    window.dispatchEvent(savedEvent);
    expect(savedEvent.defaultPrevented).toBe(false);

    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, '+ Add educator');
    const addCard = container.querySelector('[aria-labelledby="ae-add-educator-title"]');
    const fields = addCard.querySelectorAll('input');
    enterInput(fields[0], 'New Educator');
    enterInput(fields[1], 'T-NEW');
    clickButton(container, 'Save educator');
    await flushRemote();
    expect(repository.saveWorkspace).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#ae-panel').getAttribute('aria-busy')).toBe('true');
    const savingEvent = new window.Event('beforeunload', { cancelable: true });
    window.dispatchEvent(savingEvent);
    expect(savingEvent.defaultPrevented).toBe(true);

    click(container.querySelector('[aria-label="Close Educator Growth and Evaluation"]'));
    click(container.querySelector('.ae-overlay'));
    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Close blocked while a district save is still pending.');
  });

  it('keeps failed remote changes recoverable across in-app close and browser-unload attempts', async () => {
    const sample = sampleWorkspaceFixture();
    const onClose = vi.fn();
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 18,
        currentUser: { email: 'principal@district.example', role: 'admin' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn().mockRejectedValue(new Error('District write failed.')),
    };
    const container = mountPanel({ repository, onClose }, SourceEducatorEvaluationPanel);
    await flushRemote();

    click(container.querySelector('#ae-tab-staff'));
    clickButton(container, '+ Add educator');
    const addCard = container.querySelector('[aria-labelledby="ae-add-educator-title"]');
    const fields = addCard.querySelectorAll('input');
    enterInput(fields[0], 'Recovery Educator');
    enterInput(fields[1], 'T-RECOVERY');
    clickButton(container, 'Save educator');
    await flushRemote();
    await flushRemote();

    expect(container.textContent).toContain('Last change is not confirmed: District write failed.');
    const failedEvent = new window.Event('beforeunload', { cancelable: true });
    window.dispatchEvent(failedEvent);
    expect(failedEvent.defaultPrevented).toBe(true);
    click(container.querySelector('[aria-label="Close Educator Growth and Evaluation"]'));
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Close blocked because the last district change is not confirmed.');
  });

  it('still allows closing an initial remote failure gate because no edits were accepted', async () => {
    const onClose = vi.fn();
    const repository = {
      bootstrap: vi.fn().mockRejectedValue(new Error('Managed identity unavailable.')),
      saveWorkspace: vi.fn(),
    };
    const container = mountPanel({ repository, onClose }, SourceEducatorEvaluationPanel);
    await flushRemote();

    const failedEvent = new window.Event('beforeunload', { cancelable: true });
    window.dispatchEvent(failedEvent);
    expect(failedEvent.defaultPrevented).toBe(false);
    click(container.querySelector('[aria-label="Close Educator Growth and Evaluation"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
