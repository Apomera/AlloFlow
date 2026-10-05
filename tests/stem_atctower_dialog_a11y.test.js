import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_atctower.js');
const mirrorPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_atctower.js');

describe('ATC Tower numeric dialog accessibility', () => {
  beforeEach(() => resetStemLab());

  it('keeps mirrored deploy files identical and removes native heading/speed prompts', () => {
    const source = readFileSync(sourcePath, 'utf8');
    expect(readFileSync(mirrorPath, 'utf8')).toBe(source);
    expect(source).not.toContain("prompt('Heading for ");
    expect(source).not.toContain("prompt('Speed for ");
    expect(source).not.toContain('var hdgStr');
    expect(source).not.toContain('var spdStr');
    expect(source).not.toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).not.toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
  });

  it('still renders the ATC menu after the dialog refactor', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'menu' } });
    expect(html.length).toBeGreaterThan(200);
    expect(html).toContain('ATC');
  });
});

describe('ATC Tower heading entry and keyboard scope', () => {
  let root;
  let host;
  let gameRef;

  beforeEach(() => {
    resetStemLab();
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    const original = readFileSync(sourcePath, 'utf8');
    const source = original.replace(/var runningRef = useRef\([^;]+\);/, (marker) => marker + ' window.__atcTestGameRef = gameRef;');
    if (source === original) throw new Error('ATC test gameRef instrumentation marker is missing');
    new Function(source)();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    if (host) host.remove();
    delete window.__atcTestGameRef;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function button(name) {
    return [...host.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent).trim() === name);
  }

  async function mountShift() {
    function Host() {
      const [toolData, setToolData] = React.useState({ atcTower: { view: 'menu' } });
      const update = React.useCallback((tool, key, value) => setToolData(prev => ({
        ...prev, [tool]: { ...prev[tool], [key]: value }
      })), []);
      const updateMulti = React.useCallback((tool, values) => setToolData(prev => ({
        ...prev, [tool]: { ...prev[tool], ...values }
      })), []);
      return window.StemLab._registry.atcTower.render({
        React, toolData, update, updateMulti,
        t: (key, fallback) => fallback || key,
        addToast: vi.fn(), announceToSR: vi.fn(), gradeLevel: '5th Grade'
      });
    }
    await React.act(async () => root.render(React.createElement(Host)));
    await React.act(async () => button('Start Tower Shift').click());
    gameRef = window.__atcTestGameRef;
    gameRef.current.aircraft = [{
      id: 123, callsign: 'Test 123', type: { id: 'C172', name: 'Cessna 172', cat: 'Light', speed: 90, color: '#60a5fa' },
      x: 300, y: 200, altitude: 5000, heading: 270, speed: 90,
      targetHeading: null, targetSpeed: null, targetAltitude: null,
      assignedRunway: null, state: 'inbound', fuel: 45, trail: []
    }];
    gameRef.current.selected = 123;
    await React.act(async () => vi.advanceTimersByTime(300));
  }

  it('opens an accessible heading form, validates its range, and assigns the submitted heading', async () => {
    await mountShift();
    await React.act(async () => button('Set heading').click());
    const input = host.querySelector('input[type="number"]');
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-label') || document.querySelector('label[for="' + input.id + '"]')?.textContent).toMatch(/heading/i);
    expect(gameRef.current.commandEntry).toBeTruthy();
    const changeValue = value => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await React.act(async () => changeValue('361'));
    await React.act(async () => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(gameRef.current.aircraft[0].targetHeading).toBeNull();
    expect(host.querySelector('input[type="number"]')).not.toBeNull();
    await React.act(async () => changeValue('135'));
    await React.act(async () => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(gameRef.current.aircraft[0].targetHeading).toBe(135);
    expect(gameRef.current.commandEntry).toBeFalsy();
  });

  it('leaves form input keys and Tab navigation to their native controls', async () => {
    await mountShift();
    await React.act(async () => button('Set heading').click());
    const input = host.querySelector('input[type="number"]');
    for (const key of ['h', 'r', 'p', ' ', 'Tab']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await React.act(async () => input.dispatchEvent(event));
      expect(event.defaultPrevented, 'ATC intercepted ' + key + ' inside the form').toBe(false);
    }
    expect(gameRef.current.selected).toBe(123);
    expect(gameRef.current.aircraft[0].assignedRunway).toBeNull();
    const radar = host.querySelector('canvas');
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await React.act(async () => radar.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(false);
  });

  it('validates speed bounds and assigns a whole speed without changing current speed immediately', async () => {
    await mountShift();
    await React.act(async () => button('Set speed').click());
    for (const invalid of ['59', '251', '120.5', '']) {
      const input = host.querySelector('input[type="number"]');
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, invalid);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await React.act(async () => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      expect(gameRef.current.aircraft[0].targetSpeed, invalid).toBeNull();
      expect(host.querySelector('input[type="number"]'), invalid).not.toBeNull();
    }
    const input = host.querySelector('input[type="number"]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '145');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(gameRef.current.aircraft[0].targetSpeed).toBe(145);
    expect(gameRef.current.aircraft[0].speed).toBe(90);
    expect(gameRef.current.commandEntry).toBeFalsy();
  });

  it('bases the first manual altitude command on actual altitude when leaving automatic approach', async () => {
    await mountShift();
    const aircraft = gameRef.current.aircraft[0];
    aircraft.state = 'approach'; aircraft.approachStage = 'final'; aircraft.targetAltitude = 1200;
    await React.act(async () => vi.advanceTimersByTime(300));
    await React.act(async () => document.querySelector('[data-atctower-command="u"]').click());
    expect(aircraft.state).toBe('inbound');
    expect(aircraft.approachStage).toBeNull();
    expect(aircraft.targetAltitude).toBe(6000);
    await React.act(async () => document.querySelector('[data-atctower-command="u"]').click());
    expect(aircraft.targetAltitude).toBe(7000);

    aircraft.state = 'approach'; aircraft.altitude = 5000; aircraft.targetAltitude = 3800;
    await React.act(async () => vi.advanceTimersByTime(300));
    await React.act(async () => document.querySelector('[data-atctower-command="d"]').click());
    expect(aircraft.targetAltitude).toBe(4000);
  });

  it('records a manual go-around and resets landing guidance before climbing', async () => {
    await mountShift();
    const aircraft = gameRef.current.aircraft[0];
    aircraft.state = 'approach'; aircraft.approachStage = 'final'; aircraft.altitude = 1200;
    aircraft.assignedRunway = gameRef.current.airport.runways[0]; aircraft.touchdownReady = true;
    await React.act(async () => vi.advanceTimersByTime(300));
    await React.act(async () => button('Go around').click());
    expect(aircraft.state).toBe('goAround');
    expect(aircraft.approachStage).toBeNull();
    expect(aircraft.touchdownReady).toBe(false);
    expect(aircraft.targetHeading).toBe(270);
    expect(aircraft.targetAltitude).toBe(3000);
    expect(gameRef.current.goArounds).toBe(1);
  });

  it('lets a manual heading release an aircraft from its teaching hold', async () => {
    await mountShift();
    const aircraft = gameRef.current.aircraft[0];
    aircraft.state = 'holding'; aircraft.holdCenter = { x: 300, y: 200 };
    await React.act(async () => vi.advanceTimersByTime(300));
    await React.act(async () => button('Set heading').click());
    const input = host.querySelector('input[type="number"]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '90');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(aircraft.state).toBe('inbound');
    expect(aircraft.holdCenter).toBeNull();
    expect(aircraft.targetHeading).toBe(90);
  });
});
