import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPath = resolve(process.cwd(), 'export_handlers_module.js');
const deployPath = resolve(process.cwd(), 'desktop/web-app/public/export_handlers_module.js');
const source = readFileSync(rootPath, 'utf8');

function loadHandlers() {
  window.AlloModules = {};
  new Function(source)();
  return window.AlloModules.ExportHandlers;
}

function makePreview() {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write('<!doctype html><html lang="en"><head></head><body><main><button aria-label="Run old action">Run</button><img src="example.png" alt="Old chart description"></main></body></html>');
  doc.close();
  return { iframe, doc };
}

function key(win, target, key, shiftKey = false) {
  target.dispatchEvent(new win.KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true
  }));
}

describe('Export A11y Inspector accessible editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('ships identical mirrors and removes native inspector prompts', () => {
    expect(readFileSync(deployPath, 'utf8')).toBe(source);
    expect(source).not.toContain("prompt('Edit ");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("item.el.setAttribute('inert', '')");
    expect(source).toContain("if (ev.key === 'Escape')");
    expect(source).toContain("if (ev.key !== 'Tab') return");
    expect(source).toContain('min-height:44px');
  });

  it('cancels with Escape, restores the preview, and returns focus', () => {
    const handlers = loadHandlers();
    const { iframe, doc } = makePreview();
    handlers.applyA11yInspector({ exportPreviewRef: { current: iframe }, enabled: true });
    const target = doc.querySelector('button[aria-label="Run old action"]');
    const badge = Array.from(doc.querySelectorAll('.a11y-inspect-badge')).find((node) =>
      node.getAttribute('aria-label') === 'Edit aria-label: Run old action'
    );
    badge.click();

    const dialog = doc.querySelector('[role="dialog"]');
    const input = doc.getElementById('a11y-inspect-editor-value');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(input.value).toBe('Run old action');
    expect(doc.activeElement).toBe(input);
    expect(doc.querySelector('main').hasAttribute('inert')).toBe(true);

    input.value = 'Should not save';
    key(iframe.contentWindow, dialog, 'Escape');
    expect(doc.querySelector('[role="dialog"]')).toBeNull();
    expect(target.getAttribute('aria-label')).toBe('Run old action');
    expect(doc.querySelector('main').hasAttribute('inert')).toBe(false);
    expect(doc.activeElement).toBe(badge);
  });

  it('traps focus and saves edited ARIA text with a dirty-state announcement event', () => {
    const handlers = loadHandlers();
    const { iframe, doc } = makePreview();
    let inputEvents = 0;
    doc.body.addEventListener('input', () => { inputEvents += 1; });
    handlers.applyA11yInspector({ exportPreviewRef: { current: iframe }, enabled: true });
    const target = doc.querySelector('button[aria-label="Run old action"]');
    const badge = Array.from(doc.querySelectorAll('.a11y-inspect-badge')).find((node) =>
      node.getAttribute('aria-label') === 'Edit aria-label: Run old action'
    );
    badge.click();

    const dialog = doc.querySelector('[role="dialog"]');
    const form = dialog.querySelector('form');
    const input = dialog.querySelector('input');
    const save = dialog.querySelector('button[type="submit"]');
    save.focus();
    key(iframe.contentWindow, dialog, 'Tab');
    expect(doc.activeElement).toBe(input);
    input.focus();
    key(iframe.contentWindow, dialog, 'Tab', true);
    expect(doc.activeElement).toBe(save);

    input.value = 'Run accessible action';
    form.dispatchEvent(new iframe.contentWindow.Event('submit', { bubbles: true, cancelable: true }));
    expect(target.getAttribute('aria-label')).toBe('Run accessible action');
    expect(badge.getAttribute('aria-label')).toBe('Edit aria-label: Run accessible action');
    expect(doc.body.getAttribute('data-allo-user-edited')).toBe('1');
    expect(inputEvents).toBe(1);
    expect(doc.querySelector('[role="dialog"]')).toBeNull();
    expect(doc.activeElement).toBe(badge);
  });

  it('uses the same accessible editor for image alternative text and cleans it up when inspection closes', () => {
    const handlers = loadHandlers();
    const { iframe, doc } = makePreview();
    handlers.applyA11yInspector({ exportPreviewRef: { current: iframe }, enabled: true });
    const image = doc.querySelector('img');
    const badge = Array.from(doc.querySelectorAll('.a11y-badge-img')).find((node) =>
      node.getAttribute('aria-label') === 'Edit image alternative text: Old chart description'
    );
    badge.click();
    const input = doc.getElementById('a11y-inspect-editor-value');
    expect(input.value).toBe('Old chart description');
    input.value = 'Chart showing steady growth';
    doc.querySelector('.a11y-inspect-editor form').dispatchEvent(
      new iframe.contentWindow.Event('submit', { bubbles: true, cancelable: true })
    );
    expect(image.getAttribute('alt')).toBe('Chart showing steady growth');

    badge.click();
    expect(doc.querySelector('[role="dialog"]')).not.toBeNull();
    handlers.applyA11yInspector({ exportPreviewRef: { current: iframe }, enabled: false });
    expect(doc.querySelector('[role="dialog"]')).toBeNull();
    expect(doc.querySelector('main').hasAttribute('inert')).toBe(false);
  });
});
