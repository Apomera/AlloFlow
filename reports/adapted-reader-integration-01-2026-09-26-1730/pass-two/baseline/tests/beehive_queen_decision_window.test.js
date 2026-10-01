import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Queen mode - decision window feedback', () => {
  let host;
  let root;
  let latest;
  let config;

  async function mountQueen(overrides = {}) {
    const initialQueen = Object.assign({
      active: true,
      paused: true,
      speed: 1,
      day: 0,
      hiveHealth: 100,
      territory: 50,
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 },
    }, overrides);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', queen: initialQueen } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('turns hidden rival pressure into a visible, actionable scout window', async () => {
    await mountQueen();
    const windowCard = host.querySelector('[data-rts-decision-window="scout"]');
    expect(windowCard).toBeTruthy();
    expect(windowCard.getAttribute('aria-labelledby')).toBe('beehive-rts-decision-title');
    expect(windowCard.querySelector('[data-rts-decision-pressure-track]').getAttribute('role')).toBe('progressbar');
    expect(windowCard.querySelector('[data-rts-decision-pressure-track]').getAttribute('aria-valuenow')).toBe('17');
    expect(windowCard.querySelector('[data-rts-decision-timing]').textContent).toContain('Within 4 cycles');
    const recommended = windowCard.querySelector('[data-rts-recommended-command="true"]');
    expect(recommended).toBeTruthy();
    expect(recommended.getAttribute('data-recommended-action')).toBe('scout_rival');
    expect(recommended.getAttribute('aria-label')).toContain('Use recommended response: Scout Rival');

    await act(async () => { recommended.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.rival.intel).toBeGreaterThan(0);
    expect(host.querySelector('[data-rts-decision-window="observe"], [data-rts-decision-window="raid"], [data-rts-decision-window="economy"]')).toBeTruthy();
  });

  it('turns an imminent raid into an alarm response with an urgent threshold rail', async () => {
    await mountQueen({
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 62, intel: 40 },
      threats: [{ type: 'wasp', label: 'Wasp Raider', icon: '!', hp: 30, maxHp: 30, strength: 30 }],
    });
    const windowCard = host.querySelector('[data-rts-decision-window="defend"]');
    expect(windowCard).toBeTruthy();
    expect(windowCard.getAttribute('data-rts-decision-tone')).toBe('danger');
    expect(windowCard.querySelector('[data-rts-decision-badge="ACT NOW"]')).toBeTruthy();
    expect(windowCard.querySelector('[data-rts-decision-pressure-track]').getAttribute('aria-valuenow')).toBe('100');
    const recommended = windowCard.querySelector('[data-rts-recommended-command="true"]');
    expect(recommended.getAttribute('data-recommended-action')).toBe('alarm_signal');

    await act(async () => { recommended.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.pheromones.alarm).toBe(50);
    expect(latest.beehive.queen.lastImpact.title).toBe('Worker Alarm Response');
  });
});
