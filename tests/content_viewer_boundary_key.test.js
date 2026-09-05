// The content-viewer ErrorBoundary must be KEYED by the resource being shown.
//
// Found 2026-09-05 by loading a pack in the deployed app and opening its reading before the
// deferred module queue had drained: formatInteractiveText threw "PhaseNHelpers module not
// loaded", and from then on EVERY resource the user opened — the anchor chart, Memory Aid
// Studio, Applied Challenge Studio — rendered "Component Error" instead of its content,
// because React reuses one boundary instance and hasError never cleared. The fallback tells
// the user to try "switching views", which without a key does nothing at all.
//
// A key built from the resource id and the active view remounts the boundary on every switch,
// so a transient failure costs one resource view rather than the whole session.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shellFiles = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('content viewer error boundary', () => {
  it.each(shellFiles)('%s keys the content-viewer boundary by resource and view', (file) => {
    const shell = read(file);
    const marker = "fallbackMessage={t('errors.content_viewer')";
    const at = shell.indexOf(marker);
    expect(at, file + ' has no content-viewer boundary').toBeGreaterThan(0);
    expect(shell.split(marker).length - 1, file + ' has more than one content viewer').toBe(1);

    // The key attribute sits on the same tag, before fallbackMessage.
    const tagOpensAt = shell.lastIndexOf('<ErrorBoundary', at);
    const tag = shell.slice(tagOpensAt, at);
    expect(tag, file + ': content-viewer boundary is not keyed').toContain('key={');
    // Resource identity, so opening a different resource remounts the boundary.
    expect(tag, file + ': boundary key ignores the resource').toContain('generatedContent.id');
    // View identity, so the fallback's own "switching views" advice actually works.
    expect(tag, file + ': boundary key ignores the active view').toContain('activeView');
  });
});
