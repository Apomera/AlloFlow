import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_atctower.js');

describe('ATC commands preserve intended guidance transitions', () => {
  let root;
  let host;
  let gameRef;

  beforeEach(() => {
    resetStemLab();
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const original = readFileSync(sourcePath, 'utf8');
    const source = original.replace(/var runningRef = useRef\([^;]+\);/, marker => marker + ' window.__atcCommandGameRef = gameRef;')
      .replace('var commandRef = useRef(null);', 'var commandRef = useRef(null); window.__atcCommandRef = commandRef;');
    if (source === original) throw new Error('ATC gameRef instrumentation marker is missing');
    new Function(source)();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    if (host) host.remove();
    delete window.__atcCommandGameRef;
    delete window.__atcCommandRef;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function command(key) {
    const control = host.querySelector('[data-atctower-playing] [data-atctower-command="' + key + '"]');
    if (!control) throw new Error('Command control missing: ' + key);
    return control;
  }

  async function mountFinal(airportId = 'parallel') {
    function Host() {
      const [toolData, setToolData] = React.useState({ atcTower: { view: 'menu', atcSelectedAirport: airportId } });
      const update = React.useCallback((tool, key, value) => setToolData(previous => ({
        ...previous, [tool]: { ...previous[tool], [key]: value }
      })), []);
      const updateMulti = React.useCallback((tool, values) => setToolData(previous => ({
        ...previous, [tool]: { ...previous[tool], ...values }
      })), []);
      return window.StemLab._registry.atcTower.render({
        React, toolData, update, updateMulti, t: (key, fallback) => fallback || key,
        addToast: vi.fn(), announceToSR: vi.fn(), gradeLevel: '5th Grade'
      });
    }
    await React.act(async () => root.render(React.createElement(Host)));
    const start = [...host.querySelectorAll('button')].find(control => control.textContent.trim() === 'Start Tower Shift');
    await React.act(async () => start.click());
    gameRef = window.__atcCommandGameRef;
    gameRef.current.paused = true;
    const aircraft = {
      id: 123, callsign: 'Test 123', type: { id: 'C172', name: 'Cessna 172', cat: 'Light', speed: 90, color: '#60a5fa' },
      x: 240, y: 170, altitude: 2400, heading: 270, speed: 90,
      targetHeading: 270, targetSpeed: 105, targetAltitude: 300,
      assignedRunway: gameRef.current.airport.runways[0], state: 'approach', approachStage: 'final',
      touchdownReady: true, fuel: 45, trail: [], holdCenter: null
    };
    gameRef.current.aircraft = [aircraft];
    gameRef.current.selected = aircraft.id;
    await React.act(async () => vi.advanceTimersByTime(300));
    return aircraft;
  }

  it('cancels old final guidance and touchdown capture when changing runway', async () => {
    const aircraft = await mountFinal();
    await React.act(async () => command('r').click());
    expect(aircraft.assignedRunway).toBe(gameRef.current.airport.runways[1]);
    expect(aircraft.state).toBe('inbound');
    expect(aircraft.approachStage).toBeNull();
    expect(aircraft.targetHeading).toBeNull();
    expect(aircraft.targetAltitude).toBe(2400);
    expect(aircraft.touchdownReady).toBe(false);
  });

  it('keeps an established approach intact when a single runway is already assigned', async () => {
    const aircraft = await mountFinal('simple');
    await React.act(async () => command('r').click());
    expect(aircraft.assignedRunway).toBe(gameRef.current.airport.runways[0]);
    expect(aircraft.state).toBe('approach');
    expect(aircraft.approachStage).toBe('final');
    expect(aircraft.targetAltitude).toBe(300);
    expect(aircraft.targetSpeed).toBe(105);
  });

  it('assigns and removes the selected runway directly through the labelled control', async () => {
    const aircraft = await mountFinal();
    const select = host.querySelector('[data-atctower-runway-select]');
    expect(select.closest('label').textContent).toContain('Assigned runway');
    await React.act(async () => {
      select.value = '1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(aircraft.assignedRunway).toBe(gameRef.current.airport.runways[1]);
    expect(aircraft.state).toBe('inbound');
    expect(gameRef.current.selected).toBe(aircraft.id);
    await React.act(async () => {
      select.value = '-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(aircraft.assignedRunway).toBeNull();
    expect(aircraft.touchdownReady).toBe(false);
  });

  it('holds present altitude instead of retaining a cancelled final descent target', async () => {
    const aircraft = await mountFinal();
    await React.act(async () => command('p').click());
    expect(aircraft.state).toBe('holding');
    expect(aircraft.approachStage).toBeNull();
    expect(aircraft.targetHeading).toBeNull();
    expect(aircraft.targetAltitude).toBe(2400);
    expect(aircraft.touchdownReady).toBe(false);
  });

  it('preserves an explicit manual altitude target when entering a hold from inbound', async () => {
    const aircraft = await mountFinal();
    aircraft.state = 'inbound'; aircraft.approachStage = null; aircraft.targetAltitude = 6000;
    await React.act(async () => command('p').click());
    expect(aircraft.state).toBe('holding');
    expect(aircraft.targetAltitude).toBe(6000);
  });

  it('does not restart final intercept or overwrite requested speed on repeated approach clearance', async () => {
    const aircraft = await mountFinal();
    await React.act(async () => command('c').click());
    expect(aircraft.state).toBe('approach');
    expect(aircraft.approachStage).toBe('final');
    expect(aircraft.targetHeading).toBe(270);
    expect(aircraft.targetAltitude).toBe(300);
    expect(aircraft.targetSpeed).toBe(105);
  });

  it('restores the type training speed when abandoning a slow final approach', async () => {
    const aircraft = await mountFinal();
    aircraft.speed = 60; aircraft.targetSpeed = null;
    await React.act(async () => command('g').click());
    expect(aircraft.state).toBe('goAround');
    expect(aircraft.targetSpeed).toBe(90);
    expect(aircraft.targetAltitude).toBe(3400);
    expect(aircraft.targetHeading).toBe(270);
    expect(aircraft.touchdownReady).toBe(false);
    expect(gameRef.current.goArounds).toBe(1);
    aircraft.targetSpeed = 110; aircraft.targetAltitude = 5400;
    await React.act(async () => command('g').click());
    expect(aircraft.targetSpeed).toBe(110);
    expect(aircraft.targetAltitude).toBe(5400);
    expect(gameRef.current.goArounds).toBe(1);
  });

  it('locks flight commands and pause after exercise completion while permitting review and End', async () => {
    const aircraft = await mountFinal();
    const game = gameRef.current;
    game.practice = { version: 1, id: 'separation_recovery', completed: true, completedAt: 6,
      landedIds: [], lostIds: [] };
    game.paused = true;
    const prior = { state: aircraft.state, runway: aircraft.assignedRunway,
      heading: aircraft.targetHeading, altitude: aircraft.targetAltitude,
      speed: aircraft.targetSpeed, goArounds: game.goArounds };
    await React.act(async () => {
      for (const key of ['r', 'c', 'p', 'g', 'h', 's', 'u', 'd', 'pause']) window.__atcCommandRef.current(key);
    });
    expect({ state: aircraft.state, runway: aircraft.assignedRunway,
      heading: aircraft.targetHeading, altitude: aircraft.targetAltitude,
      speed: aircraft.targetSpeed, goArounds: game.goArounds }).toEqual(prior);
    expect(game.commandEntry).toBeFalsy();
    expect(game.paused).toBe(true);
    await React.act(async () => window.__atcCommandRef.current('help'));
    expect(game.showHelp).toBe(true);
    await React.act(async () => window.__atcCommandRef.current('end'));
    expect(game.committed).toBe(true);
  });

  it.each([
    { altitude: 100, target: 3000 },
    { altitude: 5000, target: 6000 },
    { altitude: 44900, target: 45000 }
  ])('commands a bounded climb after a go-around from $altitude feet', async ({ altitude, target }) => {
    const aircraft = await mountFinal();
    aircraft.altitude = altitude;
    await React.act(async () => command('g').click());
    expect(aircraft.targetAltitude).toBe(target);
    expect(aircraft.targetAltitude).toBeGreaterThan(altitude);
    expect(aircraft.targetAltitude).toBeLessThanOrEqual(45000);
  });
});
