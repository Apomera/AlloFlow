// The tour (TourOverlay in MiscPanels) and Help Mode popups (SpotlightTourView) load in the background queue.
// Found 2026-11-17 in a browser run of the served app: pressing "Take the app tour", or clicking a control in
// Help Mode, in the first minute showed nothing at all, because neither asked for its module. Pressing them
// with the module promoted showed the tour within a second. The host now asks for both when they start.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ANTI = readFileSync(process.env.TOUR_PROMOTE_HOST || 'AlloFlowANTI.txt', 'utf8');
const start = ANTI.indexOf('  // The tour draws with TourOverlay (MiscPanels), Help Mode with SpotlightTourView.');
const body = start < 0 ? '' : ANTI.slice(ANTI.indexOf('useEffect(', start), ANTI.indexOf('}, [runTour, isHelpMode]);', start) + '}, [runTour, isHelpMode]);'.length);

function run(state, loaded = {}) {
  const asked = [];
  const window = { AlloModules: { ...loaded }, __alloPromoteModule: (name) => asked.push(name) };
  let effect;
  new Function('useEffect', 'window', 'runTour', 'isHelpMode', body)((fn) => { effect = fn; }, window, state.runTour, state.isHelpMode);
  effect();
  return asked;
}

describe('tour and Help Mode ask for their popup modules', () => {
  it('exists after the tour state it reads', () => {
    expect(start).toBeGreaterThan(ANTI.indexOf('const [runTour, setRunTour] = useState(false);'));
    expect(body).toContain('[runTour, isHelpMode]');
  });
  it('starting the tour asks for the tour overlay, the AI Guide button it points at, and the spotlight', () => {
    // 2026-11-18: the browser run skipped the AI Guide step; that button's module loaded 10-30 s in.
    expect(run({ runTour: true, isHelpMode: false })).toEqual(['MiscPanels', 'UDLGuideButton', 'ViewSpotlightTourModule']);
  });
  it('turning on Help Mode asks for the spotlight only', () => {
    expect(run({ runTour: false, isHelpMode: true })).toEqual(['ViewSpotlightTourModule']);
  });
  it('asks for nothing when idle, or when the modules are already there', () => {
    expect(run({ runTour: false, isHelpMode: false })).toEqual([]);
    expect(run({ runTour: true, isHelpMode: true }, { TourOverlay: () => null, UDLGuideButton: {}, SpotlightTourView: () => null })).toEqual([]);
  });
  it('the names asked for are the ones the host loads', () => {
    expect(ANTI).toContain("loadModule('MiscPanels', ");
    expect(ANTI).toContain("loadModule('ViewSpotlightTourModule', ");
    expect(ANTI).toContain("loadModule('UDLGuideButton', ");
  });
  it('the AI Guide button loads with the sidebar, not 10-30 s later', () => {
    expect(ANTI).toMatch(/var FIRST_ACTION_MODULES = \[[^\]]*'SidebarPanels', 'UDLGuideButton'/);
  });
});
