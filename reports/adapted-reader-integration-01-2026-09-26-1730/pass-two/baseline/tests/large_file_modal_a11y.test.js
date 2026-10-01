import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('large_file_source.jsx', 'utf8');

describe('Large-file transcription modal accessibility', () => {
  it('uses a named and described modal with a presentation-only backdrop', () => {
    expect(source).toContain('role="presentation"');
    expect(source).toContain('ref={dialogRef}');
    expect(source).toContain('aria-labelledby="large-file-modal-title"');
    expect(source).toContain('aria-describedby="large-file-description"');
  });

  it('contains focus, closes with Escape only when idle, and restores focus', () => {
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('if (!processingRef.current)');
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
    expect(source).toContain('onClick={() => { if (!isProcessing) onClose(); }}');
  });

  it('exposes processing updates and chunk progress programmatically', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow={chunkTotal > 0 ? progressPercent : undefined}');
    expect(source).toContain('const chunkTotal = Math.max(0, Number(totalChunks) || 0);');
    expect(source).toContain('const chunkProgress = Math.max(0, Math.min(chunkTotal, Number(progress) || 0));');
    expect(source).toContain('aria-valuetext={progressValueText}');
  });

  it('supports reflow, reduced motion, and visible fallback focus', () => {
    expect(source).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(source).toContain('flex flex-col sm:flex-row gap-3');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).not.toContain('duration-200 focus:outline-none');
  });

  it('keeps busy confirmation focusable and preserves visible control names', () => {
    expect(source).toContain('onClick={() => { if (!isProcessing) onConfirm(); }}');
    expect(source).toContain('aria-disabled={isProcessing}');
    expect(source).toContain('aria-busy={isProcessing}');
    expect(source).toContain("aria-label={t?.('common.close') || 'Close'}");
    expect(source.match(/type="button"/g)).toHaveLength(3);
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('min-w-11 min-h-11');
    expect(source.match(/focus-visible:ring-2/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("{'\\u00D7'}");
    expect(source).toContain("{'\\u23F3'}");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/large_file_module.js', 'utf8')).toBe(fs.readFileSync('large_file_module.js', 'utf8'));
  });
});
