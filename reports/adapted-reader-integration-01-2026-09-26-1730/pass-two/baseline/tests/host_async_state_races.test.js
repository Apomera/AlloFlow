import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function between(startMarker, endMarker) {
  const start = host.indexOf(startMarker);
  const end = host.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing start marker: ${startMarker}`).toBeGreaterThan(-1);
  expect(end, `missing end marker: ${endMarker}`).toBeGreaterThan(start);
  return host.slice(start, end);
}

describe('host async state ownership', () => {
  it('merges an annotation import into the state seen by the updater, not the pre-read render snapshot', () => {
    const block = between(
      'const handleAnnotationImportFile = (e) => {',
      'const handleVoiceRecordingCancel = async () => {',
    );

    expect(block).toContain('setStickers((previous) => {');
    expect(block).toContain('_m.importAnnotations(previous, payload, opts)');
    expect(block).toContain('if (!isCurrent()) return previous');
    expect(block).not.toContain('_m.importAnnotations(stickers, payload, opts)');
    expect(block).not.toContain('setStickers(result.list)');
  });

  it('invalidates and aborts annotation FileReaders on identity changes and unmount', () => {
    const ownerBlock = between(
      'const annotationDocumentIdentity = [',
      'const handleImportAnnotations = () => {',
    );

    expect(ownerBlock).toContain('const annotationLiveDocumentIdentityRef = useRef(annotationDocumentIdentity)');
    expect(ownerBlock).toContain('annotationLiveDocumentIdentityRef.current = annotationDocumentIdentity');
    expect(ownerBlock).toContain('generation: 0');
    expect(ownerBlock).toContain('readers: new Set()');
    expect(ownerBlock).toContain('const cancelAnnotationImports = useCallback(() => {');
    expect(ownerBlock).toContain('owner.generation += 1');
    expect(ownerBlock).toContain('if (activeReader.readyState === 1) activeReader.abort()');
    expect(ownerBlock).toContain('owner.readers.clear()');
    expect(ownerBlock).toContain('if (owner.identity !== annotationDocumentIdentity)');
    expect(ownerBlock).toContain('return () => {');
    expect(ownerBlock).toContain('current.generation += 1');
  });

  it('rejects late annotation callbacks from an obsolete document generation', () => {
    const block = between(
      'const handleAnnotationImportFile = (e) => {',
      'const handleVoiceRecordingCancel = async () => {',
    );

    expect(block).toContain('const generation = owner.generation');
    expect(block).toContain('owner.readers.add(reader)');
    expect(block).toContain('owner.generation === generation');
    expect(block).toContain('owner.identity === identity');
    expect(block).toContain('annotationLiveDocumentIdentityRef.current === identity');
    expect(block).toContain('if (!isCurrent()) return');
    expect(block).toContain('reader.onerror = () => {');
    expect(block).toContain('reader.onabort = finishReader');
    expect(block).toContain('if (isCurrent()) addToast');
  });
});
