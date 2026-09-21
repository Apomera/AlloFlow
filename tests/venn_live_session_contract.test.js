import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hostPaths = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const rendererSource = readFileSync('view_renderers_source.jsx', 'utf8');
const outlineSource = readFileSync('view_outline_source.jsx', 'utf8');
// The teacher half of the Venn broadcast (validate, then attach gameData to the
// arm) was extracted out of the host monolith into this handler module. The
// student half — receive, validate, apply — still lives in the host.
const hostHandlersSource = readFileSync('host_handlers_source.jsx', 'utf8');

describe('Venn live-session activity lifecycle', () => {
  it('validates and attaches Venn game data before arming students', () => {
    // Teacher side. This lived in the host until the broadcast was extracted;
    // the assertions follow the code rather than pinning its old address.
    expect(hostHandlersSource).toContain('__d.normalizeInteractiveVennGameData(activityConfig?.gameData)');
    expect(hostHandlersSource).toContain("if (type === 'venn')");
    // An incomplete Venn must fail loudly here, not arm an unplayable activity.
    expect(hostHandlersSource).toContain('if (!__d.isPlayableInteractiveVennData(gameData)) throw new Error');
    expect(hostHandlersSource).toContain('interactiveOrganizer = { ...interactiveOrganizer, gameData }');
  });

  it.each(hostPaths)('%s applies only playable Venn data it receives', path => {
    const host = readFileSync(path, 'utf8');
    expect(host).toContain('normalizeInteractiveVennGameData');
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
    // Venn now launches through the shared organizer-start helper instead of a
    // bespoke broadcast call, but it must still carry the teacher's edited zones.
    expect(rendererSource).toContain("_startOrganizerGame('venn', handleSetIsVennPlayingToTrue, { gameData: vennGameData })");
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
