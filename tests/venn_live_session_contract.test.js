import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hostPaths = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const rendererSource = readFileSync('view_renderers_source.jsx', 'utf8');
const outlineSource = readFileSync('view_outline_source.jsx', 'utf8');

describe('Venn live-session activity lifecycle', () => {
  it.each(hostPaths)('%s transports bounded, finalized Venn game data to students', path => {
    const host = readFileSync(path, 'utf8');
    expect(host).toContain('normalizeInteractiveVennGameData');
    expect(host).toContain("if (type === 'venn')");
    expect(host).toContain('interactiveOrganizer = { ...interactiveOrganizer, gameData }');
    expect(host).toContain("if (remote.type === 'venn')");
    expect(host).toContain('setVennGameData(syncedGameData)');
    expect(host).toContain('isPlayableInteractiveVennData(syncedGameData)');
  });

  it.each(hostPaths)('%s treats teacher initialization as setup rather than launch', path => {
    const host = readFileSync(path, 'utf8');
    const setup = host.slice(host.indexOf('const handleInitializeVenn ='), host.indexOf('const handleAddVennItem ='));
    expect(setup).toContain('setIsInteractiveVenn(true)');
    expect(setup).toContain('broadcastInteractiveOrganizer(null)');
    expect(setup).not.toContain("broadcastInteractiveOrganizer('venn')");
  });

  it('launches only a complete activity and publishes the teacher-edited answer zones', () => {
    expect(rendererSource).toContain('const isVennGameReady =');
    expect(rendererSource).toContain('disabled={!isVennGameReady}');
    expect(rendererSource).toContain("_broadcastInteractiveOrganizer('venn', { gameData: vennGameData })");
    expect(rendererSource).toContain('Add at least one card to each region and four cards total');
  });

  it('clears the remote Venn arm when the teacher returns to static mode', () => {
    expect(outlineSource).toContain("typeof broadcastInteractiveOrganizer === 'function'");
    expect(outlineSource).toContain('broadcastInteractiveOrganizer(null)');
    for (const path of hostPaths) {
      expect(readFileSync(path, 'utf8')).toContain('handleInitializeVenn, handleInitializeMap, broadcastInteractiveOrganizer');
    }
  });

  it('keeps generated browser modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_renderers_module.js', 'utf8'))
      .toBe(readFileSync('view_renderers_module.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/view_outline_module.js', 'utf8'))
      .toBe(readFileSync('view_outline_module.js', 'utf8'));
  });
});
