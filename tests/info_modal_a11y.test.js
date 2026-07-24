import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_info_modal_source.jsx', 'utf8');

describe('Info modal accessibility', () => {
  it('uses a named modal dialog and non-interactive backdrop', () => {
    expect(source).toContain('<div role="presentation"');
    expect(source).not.toContain('<div role="button" tabIndex={0}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="info-modal-title"');
    expect(source).toContain('id="info-modal-title"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('implements the five-section selector as a keyboard-operable tablist', () => {
    expect(source).toContain('role="tablist"');
    expect(source.match(/id="info-tab-[^"]+" role="tab"/g)).toHaveLength(5);
    expect(source.match(/aria-selected=\{infoModalTab ===/g)).toHaveLength(5);
    expect(source.match(/aria-controls="info-modal-panel"/g)).toHaveLength(5);
    expect(source).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(source).toContain('role="tabpanel"');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_info_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_info_modal_module.js', 'utf8'));
  });

  it('names the dialog purpose and locks background scrolling while open', () => {
    expect(source).toContain('aria-describedby="info-modal-description"');
    expect(source).toContain('id="info-modal-description" className="sr-only"');
    expect(source).toContain("const previousBodyOverflow = body?.style.overflow || ''");
    expect(source).toContain("if (body) body.style.overflow = 'hidden'");
    expect(source).toContain('if (body) body.style.overflow = previousBodyOverflow');
  });

  it('keeps collapsed disclosure content out of the focus trap', () => {
    expect(source).toContain("'button:not([disabled]), summary, [href]");
    expect(source).toContain(`element.closest('[hidden], [inert], [aria-hidden="true"]')`);
    expect(source).toContain('while (ancestor && ancestor !== dialog)');
    expect(source).toContain("ancestor.matches?.('details:not([open])')");
    expect(source).toContain("ancestor.querySelector(':scope > summary')");
    expect(source).toContain('if (element !== directSummary) return false');
    expect(source).toContain('const closeHandlerRef = React.useRef(handleSetShowInfoModalToFalse)');
    expect(source).toContain('closeHandlerRef.current?.()');
  });

  it('makes every modal button non-submitting and respects reduced motion', () => {
    const buttonTags = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttonTags.length).toBeGreaterThan(0);
    expect(buttonTags.filter((tag) => !/\btype=/.test(tag))).toEqual([]);
    expect(source).toContain('motion-safe:animate-in');
    expect(source).toContain('motion-reduce:transform-none');
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('uses a full-height mobile sheet and restores the centered desktop dialog', () => {
    expect(source).toContain('items-stretch sm:items-center');
    expect(source).toContain('p-0 sm:p-4');
    expect(source).toContain('rounded-none sm:rounded-2xl');
    expect(source).toContain('h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh]');
    expect(source).toContain('flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain');
    expect(source).toContain('min-h-11 min-w-11 shrink-0 inline-flex');
  });

  it('keeps the active section visible and starts changed content at the top', () => {
    expect(source).toContain('const tabListRef = React.useRef(null)');
    expect(source).toContain('const panelRef = React.useRef(null)');
    expect(source).toContain('if (panel) panel.scrollTop = 0');
    expect(source).toContain('querySelector(\'[role="tab"][aria-selected="true"]\')');
    expect(source).toContain("activeTab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })");
    expect(source).toContain('aria-orientation="horizontal"');
    expect(source.match(/shrink-0 sm:flex-1 min-w-\[7rem\]/g)).toHaveLength(5);
  });
});
