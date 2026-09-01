import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_end_session_preview_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let EndSessionPreview;
let root;
let host;
let opener;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_end_session_preview_module.js');
  EndSessionPreview = window.AlloModules.EndSessionPreview.EndSessionPreview;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  if (opener) opener.remove();
  opener = null;
  window.__alloFocusTrapStack = [];
  delete window.__alloT;
  vi.restoreAllMocks();
});

function useHostFocusTrap(ref, isOpen, onEscape) {
  const escapeRef = React.useRef(onEscape);
  escapeRef.current = onEscape;
  React.useEffect(() => {
    if (!isOpen || !ref.current) return undefined;
    const surface = ref.current;
    const previouslyFocused = document.activeElement;
    const getFocusable = () => Array.from(surface.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = getFocusable();
      const first = focusables[0];
      const last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const focusables = getFocusable();
    (focusables[0] || surface).focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, ref]);
}

const basePreview = (rich = false, busy = false) => {
  const summary = {
    participants: { 'Azure Fox': {}, 'Green Owl': {} },
    absentCodenames: ['Silver Pine'],
    unmatchedCodenames: rich ? ['Mystery Falcon'] : [],
  };
  if (rich) {
    summary.insightBrief = {
      activityCount: 2,
      submissions: 3,
      revisions: 1,
      followUpCodenames: ['Azure Fox'],
      byKind: [],
      evidenceCohorts: [{
        code: 'support',
        label: 'Launch support',
        count: 2,
        intent: 'support',
        recommendedAction: 'Offer a worked example.',
        codenames: ['Azure Fox', 'Green Owl'],
      }],
      groups: [],
      nextMoves: [],
    };
  }
  return {
    summary,
    busy,
    followUpBusy: '',
    followUpResourceId: 'resource-1',
    followUpResources: rich ? [{ id: 'resource-1', title: 'Fractions review' }] : [],
    followUpStatus: '',
    deliveryGuard: rich,
    deliverySummary: null,
  };
};

async function renderDialog({ rich = false, busy = false } = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open end-session review';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const closed = vi.fn();

  function Fixture() {
    const [open, setOpen] = React.useState(true);
    const [preview, setPreview] = React.useState(() => basePreview(rich, busy));
    const [note, setNote] = React.useState('');
    const dialogRef = React.useRef(null);
    useHostFocusTrap(dialogRef, open, () => {
      if (preview.busy || preview.followUpBusy) return;
      closed();
      setOpen(false);
    });
    if (!open) return null;
    return React.createElement(EndSessionPreview, {
      preview,
      note,
      dialogRef,
      canSaveSummary: true,
      groupNamesById: {},
      copyToClipboard: vi.fn(),
      getConnectedCount: (codenames) => codenames.length,
      onFollowUpResourceChange: (value) => setPreview((current) => ({
        ...current,
        followUpResourceId: value,
      })),
      onSendCohort: vi.fn(),
      onNoteChange: setNote,
      onKeepOpen: () => setOpen(false),
      onComplete: () => setOpen(false),
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

const luminance = (hex) => {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
};

const contrast = (first, second) => {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe('End Session Preview accessibility', () => {
  it('coordinates delayed entry focus with the host trap and restores the opener', async () => {
    const { closed, dialog } = await renderDialog();
    expect(document.activeElement).toBe(dialog);
    expect(dialog.scrollTop).toBe(0);
    expect(dialog.getAttribute('aria-describedby')).toBe('end-session-summary-description');

    const focusables = Array.from(dialog.querySelectorAll(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'
    ));
    const first = focusables[0];
    const last = focusables.at(-1);
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    await act(async () => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(opener);
  });

  it('keeps busy review open on Escape', async () => {
    const { closed, dialog } = await renderDialog({ rich: true, busy: true });
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
  });

  it('keeps visible follow-up labels in accessible names', async () => {
    const { dialog } = await renderDialog({ rich: true });
    const select = dialog.querySelector('select');
    expect(select.hasAttribute('aria-label')).toBe(false);
    expect(select.labels[0].textContent).toContain('Follow-up resource');
    const send = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Send to 2'));
    expect(send.getAttribute('aria-label')).toContain('Send to 2');
  });

  it('scopes accessibility themes, stacks summary cards, and uses a conforming amber action', () => {
    expect(source).toContain('className="allo-docsuite bg-white');
    expect(source).toContain('grid grid-cols-1 sm:grid-cols-3');
    expect(source.match(/<summary tabIndex=\{0\}/g)).toHaveLength(2);
    expect(source).toContain('bg-amber-700 text-white');
    expect(contrast('b45309', 'ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
