import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});
afterAll(() => { vi.unstubAllGlobals(); });

const commandById = (ctx, id) => AC.buildAlloCommands(ctx, { includeGated: true })
  .find((command) => command.id === id);

describe('AlloBot surface command runtime routing', () => {
  it('routes Research Suite separately from Assessment Center and dashboard', async () => {
    const ctx = {
      setIsResearchSuiteOpen: vi.fn(),
      setShowClassAnalytics: vi.fn(),
      goToDashboard: vi.fn(),
    };
    const researchRoute = await AC.routeUtterance(ctx, 'open research suite', { allowAi: false, preview: true });
    expect(researchRoute).toMatchObject({ commandId: 'open_research_suite', via: 'deterministic' });
    commandById(ctx, 'open_research_suite').run(ctx, {});
    expect(ctx.setShowClassAnalytics).toHaveBeenCalledWith(false);
    expect(ctx.setIsResearchSuiteOpen).toHaveBeenCalledWith(true);

    const assessmentRoute = await AC.routeUtterance(ctx, 'assessment center', { allowAi: false, preview: true });
    expect(assessmentRoute).toMatchObject({ commandId: 'open_class_analytics', via: 'deterministic' });
    const dashboardRoute = await AC.routeUtterance(ctx, 'dashboard', { allowAi: false, preview: true });
    expect(dashboardRoute).toMatchObject({ commandId: 'go_dashboard', via: 'deterministic' });
  });

  it('routes Return to Start to the safe host navigation capability', async () => {
    const returnToStart = vi.fn();
    const ctx = { returnToStart };
    const route = await AC.routeUtterance(ctx, 'return to start', { allowAi: false, preview: true });
    expect(route).toMatchObject({ commandId: 'return_to_start', via: 'deterministic' });
    commandById(ctx, 'return_to_start').run(ctx, {});
    expect(returnToStart).toHaveBeenCalledTimes(1);
  });

  it('routes Stop audio and glossary audio review to their real capabilities', async () => {
    const stopReading = vi.fn();
    const stopCtx = { stopReading };
    const stopRoute = await AC.routeUtterance(stopCtx, 'skip audio', { allowAi: false, preview: true });
    expect(stopRoute).toMatchObject({ commandId: 'stop_reading', via: 'deterministic' });
    commandById(stopCtx, 'stop_reading').run(stopCtx, {});
    expect(stopReading).toHaveBeenCalledTimes(1);

    const toggleContentEditing = vi.fn(() => 'glossary');
    const glossaryCtx = { contentLoaded: true, toggleContentEditing };
    const glossaryRoute = await AC.routeUtterance(glossaryCtx, 'glossary audio review', { allowAi: false, preview: true });
    expect(glossaryRoute).toMatchObject({ commandId: 'toggle_content_editing', via: 'deterministic' });
    commandById(glossaryCtx, 'toggle_content_editing').run(glossaryCtx, {});
    expect(toggleContentEditing).toHaveBeenCalledTimes(1);
  });
});
