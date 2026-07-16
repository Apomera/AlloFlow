import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('adventure_source.jsx', 'utf8');

describe('Adventure Cast Lobby portrait upload validation', () => {
  it('replaces blocking and silent validation with persistent inline errors', () => {
    expect(source).not.toContain("alert('Image too large (max 5MB)");
    expect(source).toContain("rejectUpload('Only image files can be used for character portraits.')");
    expect(source).toContain("rejectUpload('Image too large (max 5MB). Please use a smaller image.')");
    expect(source).toContain("reader.onerror = () => rejectUpload('This image could not be read. Please choose a different image.')");
    expect(source).toContain('role="alert" aria-atomic="true"');
  });

  it('associates both upload paths with the character-specific error', () => {
    expect(source.match(/aria-describedby=\{portraitUploadError\?\.charIdx === i \? `adventure-portrait-upload-error-\$\{i\}` : undefined\}/g)?.length)
      .toBeGreaterThanOrEqual(4);
    expect(source).toContain('id={`adventure-portrait-upload-error-${i}`}');
    expect(source).toContain('{portraitUploadError.message}');
  });

  it('allows correction and avoids stale character errors', () => {
    expect(source).toContain("input.value = ''");
    expect(source).toContain('setPortraitUploadError(null);');
    expect(source).toContain('onClick={() => { setPortraitUploadError(null); onRemoveCharacter(i); }}');
    expect(source).toContain('onClick={() => { setPortraitUploadError(null); portraitFileRefs.current[i]?.click(); }}');
    expect(source).toContain("onClick={() => { setPortraitUploadError(null); portraitFileRefs.current['new-' + i]?.click(); }}");
  });

  it('keeps authoritative and deployed source/module copies synchronized', () => {
    expect(readFileSync('prismflow-deploy/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(readFileSync('prismflow-deploy/public/adventure_module.js', 'utf8'))
      .toBe(readFileSync('adventure_module.js', 'utf8'));
  });
});
