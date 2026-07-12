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
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('if (!processingRef.current)');
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
    expect(source).toContain('onClick={() => { if (!isProcessing) onClose(); }}');
  });

  it('exposes processing updates and chunk progress programmatically', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow={progressPercent}');
    expect(source).toContain('aria-valuetext={`${progress} of ${totalChunks} chunks, ${progressPercent}%`}');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/large_file_module.js', 'utf8')).toBe(fs.readFileSync('large_file_module.js', 'utf8'));
  });
});
