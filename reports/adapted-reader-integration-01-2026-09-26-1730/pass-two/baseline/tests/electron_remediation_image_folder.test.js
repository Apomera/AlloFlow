import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'desktop/electron/main.cjs'), 'utf8');
const section = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
};

describe('Electron remediation folder image intake', () => {
  it('allowlists only supported document and image extensions with canonical MIME types', () => {
    const declaration = section('const REMEDIATION_MIME_BY_EXT = Object.freeze({', "handleTrustedIpc('remediation:select-folder'");
    const literal = declaration.match(/Object\.freeze\((\{[\s\S]*?\})\)/)?.[1];
    expect(literal).toBeTruthy();
    const mapping = new Function(`return (${literal});`)();

    expect(mapping).toEqual({
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    });
    expect(declaration).toContain('const REMEDIATION_EXTS = new Set(Object.keys(REMEDIATION_MIME_BY_EXT));');
    expect(mapping).not.toHaveProperty('.svg');
    expect(mapping).not.toHaveProperty('.gif');
  });

  it('publishes MIME on folder records and on-demand byte reads without weakening the allowlist', () => {
    const folderHandler = section("handleTrustedIpc('remediation:select-folder'", "handleTrustedIpc('remediation:read-file-base64'");
    const readHandler = source.slice(source.indexOf("handleTrustedIpc('remediation:read-file-base64'"));

    expect(folderHandler).toContain('mimeType: REMEDIATION_MIME_BY_EXT[ext]');
    expect(readHandler).toContain('!REMEDIATION_EXTS.has(path.extname(filePath).toLowerCase())');
    expect(readHandler).toContain('const mimeType = REMEDIATION_MIME_BY_EXT[path.extname(filePath).toLowerCase()];');
    expect(readHandler).toContain("return { base64: buf.toString('base64'), sizeBytes: buf.length, mimeType };");
  });
});
