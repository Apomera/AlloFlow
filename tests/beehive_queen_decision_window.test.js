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
    expect(host.querySelector('[data-rts-decision-window="observe"], [data-rts-decision-window="raid"], [data-rts-decision-window="economy"], [data-rts-decision-window="grow"]')).toBeTruthy();
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

  it('keeps winter and spent-signal availability consistent in both decks and the recommendation', async () => {
    await mountQueen({ day: 31, pheromones: { qmp: 20, alarm: 0, nasonov: 50, brood: 40 }, signalUsed: { emit_qmp: 31 } });
    for (const id of ['scout_rival', 'raid_rival']) {
      for (const selector of ['data-quick-command', 'data-queen-command']) {
        const command = host.querySelector(`[${selector}="${id}"]`);
        expect(command.getAttribute('aria-disabled')).toBe('true');
        expect(command.getAttribute('data-command-ready')).toBe('false');
        expect(command.textContent).toContain('Too cold to fly in winter');
      }
    }
    expect(host.querySelector('[data-queen-command="emit_qmp"]').textContent).toContain('Already spreading this cycle');
    expect(host.querySelector('[data-rts-recommended-command]')).toBeNull();
    expect(host.querySelector('[data-rts-recommended-unavailable]').textContent).toContain('available next cycle');
    const readyCount = host.querySelectorAll('[data-queen-command][data-command-ready="true"]').length;
    expect(host.querySelector('[data-rts-command-ready-count]').textContent).toBe(`${readyCount}/8 ready`);
    const before = JSON.stringify(latest.beehive.queen);
    await act(async () => { host.querySelector('[data-queen-command="scout_rival"]').click(); await Promise.resolve(); });
    expect(JSON.stringify(latest.beehive.queen)).toBe(before);
  });

  it('does not recommend a free defense signal again during its current cycle', async () => {
    await mountQueen({ rival: { name: 'Rival', health: 100, strength: 360, stores: 35, structures: 3, pressure: 62, intel: 40 }, signalUsed: { alarm_signal: 0 } });
    expect(host.querySelector('[data-rts-decision-window="defend"]')).toBeTruthy();
    expect(host.querySelector('[data-rts-recommended-command]')).toBeNull();
    expect(host.querySelector('[data-rts-recommended-unavailable]').textContent).toContain('Already spreading this cycle');
    expect(host.querySelector('[data-quick-command="alarm_signal"]').getAttribute('aria-disabled')).toBe('true');
  });

  it('blocks depleted-resource commands and all commands after a match ends', async () => {
    await mountQueen({ resources: { nectar: 0, pollen: 0, wax: 0, royalJelly: 0 } });
    expect(host.querySelector('[data-rts-recommended-command]')).toBeNull();
    expect(host.querySelector('[data-rts-recommended-unavailable]').textContent).toContain('have 0 / need 3');
    expect(host.querySelector('[data-rts-command-ready-count]').textContent).toBe('3/8 ready');
    const before = JSON.stringify(latest.beehive.queen);
    await act(async () => { host.querySelector('[data-queen-command="lay_workers"]').click(); await Promise.resolve(); });
    expect(JSON.stringify(latest.beehive.queen)).toBe(before);
    act(() => root.unmount()); root = ReactDOMClient.createRoot(host);
    await mountQueen({ result: 'victory' });
    expect(host.querySelector('[data-rts-command-ready-count]').textContent).toBe('0/8 ready');
    expect(host.querySelectorAll('[data-queen-command][aria-disabled="true"]')).toHaveLength(8);
    expect(host.querySelector('[data-rts-recommended-command]')).toBeNull();
  });

  it('admits one free signal when two activations arrive before a render', async () => {
    await mountQueen();
    const alarm = host.querySelector('[data-queen-command="alarm_signal"]');
    await act(async () => { alarm.click(); alarm.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.population.guards).toBe(70);
    expect(latest.beehive.queen.population.foragers).toBe(280);
    expect(latest.beehive.queen.score).toBe(5);
    expect(latest.beehive.queen.signalUsed.alarm_signal).toBe(0);
    const before = JSON.stringify(latest.beehive.queen);
    await act(async () => { alarm.click(); await Promise.resolve(); });
    expect(JSON.stringify(latest.beehive.queen)).toBe(before);
  });
});
