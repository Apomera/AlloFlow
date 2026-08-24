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

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let EducatorEvaluationPanel;
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
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    act(() => { root.unmount(); });
    container.remove();
  }
  localStorage.clear();
});

function mountPanel(props = {}) {
  const startMode = Object.prototype.hasOwnProperty.call(props, 'startMode') ? props.startMode : 'sample';
  const renderProps = { ...props };
  delete renderProps.startMode;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(EducatorEvaluationPanel, {
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

  it('routes close-button, backdrop, and Escape requests through onClose', () => {
    const onClose = vi.fn();
    const container = mountPanel({ onClose });

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

  it('sends a content-free educator notice and refreshes the authenticated workspace', async () => {
    const sample = sampleWorkspaceFixture();
    const repository = {
      bootstrap: vi.fn().mockResolvedValue({
        ok: true,
        workspace: sample,
        revision: 14,
        currentUser: { email: 'principal@district.example', role: 'evaluator' },
        deployment: { kind: 'apps-script' },
      }),
      saveWorkspace: vi.fn(),
      sendNotification: vi.fn().mockResolvedValue({ ok: true, sent: true, target: 'teacher' }),
    };
    const addToast = vi.fn();
    const container = mountPanel({ repository, addToast });
    await flushRemote();

    clickButton(container, 'Email educator a portal notice');
    await flushRemote();
    expect(repository.sendNotification).toHaveBeenCalledWith({
      teacherId: sample.teachers[0].id,
      target: 'teacher',
    });
    expect(addToast).toHaveBeenCalledWith(
      'A content-free portal notice was emailed to the educator.',
      'success',
    );

    clickButton(container, 'Refresh');
    await flushRemote();
    expect(repository.bootstrap).toHaveBeenCalledTimes(2);
  });

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
    const container = mountPanel({ repository });
    await flushRemote();

    clickButton(container, 'Review & share released summary');
    await flushRemote();
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
    clickButton(container, 'Confirm and grant access');
    await flushRemote();
    expect(shareReleasedEvaluation).toHaveBeenCalledWith({ teacherId: sample.teachers[0].id, reviewToken: 'release-review-123' });
  });

  it('warns before closing only while a remote save remains unconfirmed', async () => {
    const sample = sampleWorkspaceFixture();
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
    const container = mountPanel({ repository });
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
  });
});
