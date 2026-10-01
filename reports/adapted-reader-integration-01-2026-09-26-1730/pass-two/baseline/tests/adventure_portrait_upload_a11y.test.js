import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('adventure_source.jsx', 'utf8');

describe('Adventure Cast Lobby portrait upload validation', () => {
  it('replaces blocking and silent validation with persistent inline errors', () => {
    expect(source).not.toContain("alert('Image too large (max 5MB)");
    expect(source).toContain("rejectUpload('Only image files can be used for character portraits.')");
    expect(source).toContain("rejectUpload('Image too large (max 5MB). Please use a smaller image.')");
    expect(source).toContain("message: 'This image could not be prepared securely. Please choose a different image.'");
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
    expect(source).toContain('onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); onRemoveCharacter(i); }}');
    expect(source).toContain('onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); portraitFileRefs.current[i]?.click(); }}');
    expect(source).toContain("onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); portraitFileRefs.current['new-' + i]?.click(); }}");
  });

  it('requires an accessible disclosure confirmation before reading or accepting the file', () => {
    const fileHandler = source.slice(
      source.indexOf('const handlePortraitFileChange'),
      source.indexOf('useEffect(() => {', source.indexOf('const handlePortraitFileChange')),
    );
    expect(fileHandler).toContain('setPendingPortraitUpload({ charIdx, file, input })');
    expect(fileHandler).not.toContain('new FileReader()');
    expect(source).toContain('const acceptPendingPortraitUpload = async () =>');
    expect(source).toContain('onClick={acceptPendingPortraitUpload}');
    expect(source).toContain('onClick={() => clearPendingPortraitUpload(true)}');
    expect(source).toContain('the image is sent to the AI provider configured for this app with each scene');
    expect(source).toContain('Use image');
    expect(source).toContain('role="group" aria-labelledby={`adventure-portrait-consent-${i}`}');
    expect(source).toContain('requestAnimationFrame(() => portraitConsentButtonRef.current?.focus())');
  });
  it('re-encodes uploads through a bounded canvas before local storage or provider use', () => {
    expect(source).toContain('const sanitizeAdventurePortraitFile =');
    expect(source).toContain('const boundedDimension = Math.max(320, Math.min(2048');
    expect(source).toContain("canvas.toDataURL('image/jpeg'");
    expect(source).toContain('const sanitizedPortrait = await sanitizeAdventurePortraitFile(pending.file)');
    expect(source).toContain('onUploadPortrait(pending.charIdx, sanitizedPortrait)');
    expect(source).toContain('Preparing image securely…');
    expect(source).toContain("disabled={isPortraitSanitizing} aria-describedby={isPortraitSanitizing ? 'adventure-portrait-sanitizing-status' : undefined}");
  });
  it('keeps authoritative and deployed source/module copies synchronized', () => {
    expect(readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(readFileSync('desktop/web-app/public/adventure_module.js', 'utf8'))
      .toBe(readFileSync('adventure_module.js', 'utf8'));
  });
});
