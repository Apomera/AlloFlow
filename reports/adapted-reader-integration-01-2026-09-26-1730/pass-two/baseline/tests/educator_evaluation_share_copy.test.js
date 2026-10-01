// Educator Evaluation -> Setup -> Principal-managed Drive share helper:
// the "Copy Code.gs / Index.html / appsscript.json" buttons (2026-09-01).
//
// In the Gemini Canvas iframe navigator.clipboard.writeText is refused by
// permissions policy on every click, so the button used to end in a red
// "Copy failed; open source" chip (the report that opened this pass). The
// button now routes through the app shell's window.alloCopyText (which
// falls back to execCommand('copy'), the path that still works in that
// frame), carries the same fallback inline for the standalone page, and when
// every clipboard path is refused shows the verified source pre-selected so
// a manual Ctrl+C still completes the checklist step.

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

const CODE_GS = readFileSync(resolve(process.cwd(), 'apps_script/educator_evaluation_share/Code.gs'), 'utf8');
let AeCopyShareSource;
let root;
let host;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommand = document.execCommand;

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8')
    + '\nwindow.__aeCopyShareSourceForTest = AeCopyShareSource;';
  const compiled = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [[transformReactJsx, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }]],
  }).code;
  // eslint-disable-next-line no-new-func
  new Function('React', compiled)(React);
  AeCopyShareSource = window.__aeCopyShareSourceForTest;
  delete window.__aeCopyShareSourceForTest;
  if (!AeCopyShareSource) throw new Error('AeCopyShareSource did not compile');
});

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ ok: true, text: async () => CODE_GS }));
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  delete window.alloCopyText;
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
  document.execCommand = originalExecCommand;
  vi.restoreAllMocks();
});

function setClipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', { value: writeText ? { writeText } : undefined, configurable: true, writable: true });
}

async function mountButton(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(AeCopyShareSource, { name: 'Code.gs', label: 'Code.gs', ...props }));
    await new Promise((res) => setTimeout(res, 20));
  });
  return host.querySelector('button.ae-btn');
}

async function clickAndSettle(button) {
  await act(async () => {
    button.click();
    await new Promise((res) => setTimeout(res, 40));
  });
}

describe('Copy Code.gs inside the app shell', () => {
  it('routes through window.alloCopyText, never touching navigator.clipboard directly', async () => {
    const shellCopy = vi.fn(async () => true);
    window.alloCopyText = shellCopy;
    const writeText = vi.fn(async () => { throw new DOMException('Write permission denied.', 'NotAllowedError'); });
    setClipboard(writeText);
    const onCopied = vi.fn();
    const button = await mountButton({ onCopied });
    await clickAndSettle(button);
    expect(shellCopy).toHaveBeenCalledTimes(1);
    expect(shellCopy.mock.calls[0][0]).toContain('function verifyShareHelper');
    expect(writeText).not.toHaveBeenCalled();
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe('Copied Code.gs');
    expect(host.textContent).not.toMatch(/Copy failed/);
  });

  it('prefetches the source on mount so the click copies inside its own gesture', async () => {
    window.alloCopyText = vi.fn(async () => true);
    await mountButton({});
    expect(globalThis.fetch).toHaveBeenCalled();
    const calls = globalThis.fetch.mock.calls.length;
    const button = host.querySelector('button.ae-btn');
    await clickAndSettle(button);
    expect(globalThis.fetch.mock.calls.length).toBe(calls);
  });
});

describe('Copy Code.gs on the standalone page (no shell helper)', () => {
  it('falls back to execCommand("copy") when the Clipboard API is refused', async () => {
    setClipboard(vi.fn(async () => { throw new DOMException('Write permission denied.', 'NotAllowedError'); }));
    document.execCommand = vi.fn(() => true);
    const onCopied = vi.fn();
    const button = await mountButton({ onCopied });
    await clickAndSettle(button);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe('Copied Code.gs');
  });

  it('when every clipboard path is refused, shows the verified source pre-selected instead of a dead chip', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn(() => false);
    const onCopied = vi.fn();
    const button = await mountButton({ onCopied });
    await clickAndSettle(button);
    expect(onCopied).not.toHaveBeenCalled();
    expect(host.textContent).not.toMatch(/Copy failed; open source/);
    const note = host.querySelector('[role="status"]');
    expect(note).toBeTruthy();
    expect(note.textContent).toMatch(/Clipboard is blocked in this window/);
    expect(note.textContent).toMatch(/Ctrl\+C/);
    const textarea = host.querySelector('textarea');
    expect(textarea).toBeTruthy();
    // A textarea normalizes the file's CRLF to LF; compare content, not bytes.
    expect(textarea.value.replace(/\r\n/g, "\n")).toBe(CODE_GS.replace(/\r\n/g, "\n"));
    expect(textarea.readOnly).toBe(true);
    expect(document.activeElement).toBe(textarea);
    expect(host.querySelector('label[for="' + textarea.id + '"]')).toBeTruthy();
    // A manual Ctrl+C from the box completes the checklist step.
    await act(async () => { Simulate.copy(textarea); });
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(host.querySelector('textarea')).toBeNull();
    expect(button.textContent).toBe('Copied Code.gs');
  });

  it('still refuses to hand over source that fails the signature check', async () => {
    globalThis.fetch.mockImplementation(async () => ({ ok: true, text: async () => 'console.log("not the helper")' }));
    window.alloCopyText = vi.fn(async () => true);
    const onCopied = vi.fn();
    const button = await mountButton({ onCopied });
    await clickAndSettle(button);
    expect(window.alloCopyText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.textContent).toMatch(/Unexpected source received; nothing copied/);
  });
});

describe('source pins', () => {
  it('no share-helper copy path calls navigator.clipboard directly any more', () => {
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    const direct = source.match(/navigator\.clipboard\.writeText\(/g) || [];
    // The single remaining call is inside aeCopyToClipboard's own fallback chain.
    expect(direct.length).toBe(1);
    expect(source).toContain('async function aeCopyToClipboard(text)');
    expect(source).toContain('window.alloCopyText');
    expect(source).not.toContain('Copy failed; open source');
  });
});
