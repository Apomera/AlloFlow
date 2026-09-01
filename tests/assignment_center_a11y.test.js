import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_assignment_center_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let AssignmentCenterModal;
let root;
let host;
let opener;

const noop = () => {};
const t = () => '';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = { X: () => null };
  loadAlloModule('view_assignment_center_module.js');
  AssignmentCenterModal = window.AlloModules.AssignmentCenter.AssignmentCenterModal;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  if (opener) opener.remove();
  opener = null;
  vi.restoreAllMocks();
});

const baseRow = (overrides = {}) => ({
  viewKey: 'row-1',
  lifecycle: 'active',
  lifecycleLabel: 'Active',
  title: 'A long assignment title that must wrap',
  resourceCount: 2,
  hasSharedActivity: true,
  activityType: 'survey',
  activityState: 'ready',
  participantCount: 3,
  pendingCount: 1,
  approvedCount: 2,
  hiddenCount: 0,
  expiresLabel: 'September 30',
  linkLabel: 'Private assignment link',
  canExtend: true,
  canDuplicate: true,
  canRevoke: true,
  onManage: noop,
  onCopyLink: noop,
  onExtend: noop,
  onDuplicate: noop,
  onRevoke: noop,
  onRemoveRecord: noop,
  ...overrides,
});

async function renderDialog({ survey = false, rows = [], refreshing = false } = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open Share and Collect';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const closed = vi.fn();

  function Fixture() {
    const [open, setOpen] = React.useState(true);
    const [items, setItems] = React.useState(survey ? [
      { viewKey: 'q1', text: 'First question', type: 'likert', steps: 5 },
      { viewKey: 'q2', text: 'Second question', type: 'numeric', min: 0, max: 10 },
    ] : []);
    if (!open) return null;
    return React.createElement(AssignmentCenterModal, {
      t,
      isOpen: open,
      activityEnabled: survey,
      activityType: survey ? 'survey' : 'word_cloud',
      activityPrompt: survey ? 'How did this week go?' : '',
      activityIdentityMode: survey ? 'codename' : '',
      surveyItems: items,
      surveyInfo: '',
      surveyHostingAvailable: true,
      hostedMutationAvailable: true,
      rowViews: rows,
      visibleRowViews: rows,
      filter: 'all',
      refreshing,
      onClose: () => {
        closed();
        setOpen(false);
      },
      onActivityChange: noop,
      onSurveyItemChange: noop,
      onSurveyItemRemove: (index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)),
      onSurveyItemAdd: noop,
      onPollAskChange: noop,
      onSuggestPollTimes: noop,
      onCreateLink: noop,
      onFilterChange: noop,
      onRefresh: noop,
      onExportCsv: noop,
    });
  }

  await act(async () => {
    root.render(React.createElement(Fixture));
  });
  await act(async () => {
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
  });
  return { closed, dialog: host.querySelector('[role="dialog"]') };
}

describe('Assignment Center accessibility', () => {
  it('describes the dialog, contains keyboard focus, closes, and restores its opener', async () => {
    const { closed, dialog } = await renderDialog();
    expect(dialog.getAttribute('aria-describedby')).toBe('assignment-control-center-description');
    const first = dialog.querySelector('button:not([disabled])');
    const focusables = Array.from(dialog.querySelectorAll(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'
    ));
    const last = focusables.at(-1);
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    await act(async () => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('keeps the visible filter label and exposes changing summary state', async () => {
    const { dialog } = await renderDialog({ rows: [baseRow()], refreshing: true });
    const filter = Array.from(dialog.querySelectorAll('select'))
      .find((select) => select.value === 'all');
    expect(filter.hasAttribute('aria-label')).toBe(false);
    expect(filter.labels[0].textContent).toContain('Show');
    const summary = dialog.querySelector('[role="status"][aria-label="Assignment status summary"]');
    expect(summary?.getAttribute('aria-live')).toBe('polite');
    expect(summary?.getAttribute('aria-atomic')).toBe('true');
    const refresh = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Refreshing'));
    expect(refresh?.getAttribute('aria-busy')).toBe('true');
  });

  it('moves focus to the next survey question after removing the focused row', async () => {
    const { dialog } = await renderDialog({ survey: true });
    const remove = dialog.querySelector('button[aria-label="Remove question 1"]');
    remove.focus();
    await act(async () => {
      remove.click();
    });
    await act(async () => {
      await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    });
    expect(document.activeElement).toBe(dialog.querySelector('input[value="Second question"]'));
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('labels assignment articles and announces activity and action failures', async () => {
    const { dialog } = await renderDialog({
      rows: [baseRow({
        activityState: 'error',
        actionError: 'The deadline could not be updated.',
      })],
    });
    const article = dialog.querySelector('article');
    const title = dialog.querySelector('#assignment-center-row-title-0');
    expect(article.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.className).toContain('break-words');
    expect(title.className).not.toContain('truncate');
    expect(dialog.querySelector('[data-assignment-activity-status="error"]').getAttribute('role')).toBe('alert');
    expect(Array.from(dialog.querySelectorAll('[role="alert"]'))
      .some((element) => element.textContent.includes('deadline could not be updated'))).toBe(true);
  });

  it('uses narrow reflow layouts for survey controls', () => {
    expect(source).toContain('className="min-w-0 flex-1 rounded-md');
    expect(source).toContain('grid grid-cols-1 gap-2 sm:grid-cols-2');
    expect(source).toContain('className="mt-1 w-full rounded-md border border-sky-200');
    expect(source).toContain('data-assignment-add-question="true"');
  });
});
