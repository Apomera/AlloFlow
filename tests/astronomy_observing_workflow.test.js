import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const NOW = Date.UTC(2026, 8, 27, 18);
const SECOND_DST_HOUR = Date.UTC(2026, 10, 1, 6, 30, 45, 123);
const mounts = [];
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const t = (_key, fallback) => fallback;
let sky;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterEach(() => {
  for (const view of mounts.splice(0)) view.unmount();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
});

function mountState(initial, render) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let snapshot, update;
  function App() {
    const [state, setState] = React.useState(initial);
    snapshot = state;
    update = setState;
    return render(state, setState);
  }
  act(() => root.render(React.createElement(App)));
  const view = {
    host,
    get state() { return snapshot; },
    update(next) { act(() => update(next)); },
    unmount() { act(() => root.unmount()); host.remove(); }
  };
  mounts.push(view);
  return view;
}
function input(view, label) {
  const element = view.host.querySelector('[aria-label="' + label + '"]');
  expect(element, label + ' control').not.toBeNull();
  return element;
}
function change(element, value) { act(() => Simulate.change(element, { target: { value } })); }
function click(element) { act(() => Simulate.click(element)); }
function mountTool(state, overrides = {}) {
  return mountState({ astronomy: { observingList: [], ...state } }, (data, setData) =>
    window.StemLab._registry.astronomy.render(makeCtx({ ...overrides, toolData: data, setToolData: setData })));
}
function mountClock(utcMs, zone = 'America/New_York') {
  const committed = vi.fn();
  const view = mountState(utcMs, (current, setCurrent) => React.createElement(sky.ObservatoryClockFields, {
    React, t, wall: sky.utcMsToWallTime(current, zone), timeZone: zone,
    onChange(value) { committed(value); setCurrent(value); }
  }));
  return { ...view, committed, get state() { return view.state; } };
}

describe('One exact observing instant across clock zones', () => {
  it('rejects a clock-zone or site change outside supported local years without moving the observer', () => {
    const utcMs = sky.observingWallInstant('1900-01-01', '00:15', 'Australia/Sydney');
    const addToast = vi.fn();
    const view = mountTool({
      tab: 'observatory', obsSite: 'sydney', obsSettingsOpen: true,
      ...sky.observingInstantPatch(utcMs, 'Australia/Sydney')
    }, { addToast });
    for (const [label, rejectedValue] of [['Clock time zone', 'America/New_York'], ['Observing site', 'portland']]) {
      change(input(view, label), rejectedValue);
      const result = sky.observatoryResolve(view.state.astronomy, NOW);
      expect(result.utcMs).toBe(utcMs);
      expect(result.live).toBe(false);
      expect(result.timeZone).toBe('Australia/Sydney');
      expect(result.site.id).toBe('sydney');
      expect(result.wall.dateText).toBe('1900-01-01');
      expect(result.wall.timeText).toBe('00:15');
      expect(input(view, 'Clock time zone').value).toBe('Australia/Sydney');
      expect(input(view, 'Observing site').value).toBe('sydney');
    }
    expect(addToast).toHaveBeenCalledTimes(2);
    expect(addToast).toHaveBeenCalledWith('This moment is outside 1900–2099 in that time zone. Choose a date further inside the supported range first.');
  });

  it.each(['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney', 'Asia/Kathmandu'])(
    'preserves seconds, milliseconds, and the second DST hour when displayed in %s', zone => {
      const original = sky.observatoryResolve(sky.observingInstantPatch(SECOND_DST_HOUR, 'America/New_York'), NOW);
      const changed = sky.observatoryResolve(sky.observingInstantPatch(original.utcMs, zone), NOW);
      const returned = sky.observatoryResolve(sky.observingInstantPatch(changed.utcMs, 'America/New_York'), NOW);
      expect(changed.live).toBe(false);
      expect(changed.utcMs).toBe(SECOND_DST_HOUR);
      expect(returned.utcMs).toBe(SECOND_DST_HOUR);
      expect(returned.wall.timeText).toBe('01:30');
      expect(returned.wall.offsetText).toBe('UTC-05:00');
    }
  );

  it.each([Date.UTC(2026, 10, 1, 5, 30), Date.UTC(2026, 10, 1, 6, 30)])('preserves either occurrence of the repeated local hour (%s)', utcMs => {
    const result = sky.observatoryResolve(sky.observingInstantPatch(utcMs, 'America/New_York'), NOW);
    expect(result.utcMs).toBe(utcMs);
    expect(result.wall.timeText).toBe('01:30');
  });

  it.each([Date.UTC(2026, 10, 1, 7, 30), Date.UTC(2025, 10, 1, 5, 30), '1793511000000', NaN, Infinity, null])(
    'ignores a stale or malformed exact-time anchor %s', stale => {
      const result = sky.observatoryResolve({ obsLive: false, obsDate: '2026-11-01', obsTime: '01:30', obsTz: 'America/New_York', obsUtcMs: stale }, NOW);
      expect(result.live).toBe(false);
      expect(result.utcMs).toBe(Date.UTC(2026, 10, 1, 5, 30));
    }
  );

  it('uses the edited wall clock if a restored anchor belongs to a different time zone', () => {
    const previous = sky.observingInstantPatch(SECOND_DST_HOUR, 'America/New_York');
    const result = sky.observatoryResolve({ ...previous, obsTz: 'UTC' }, NOW);
    expect(result.utcMs).toBe(Date.UTC(2026, 10, 1, 1, 30));
  });

  it.each([
    ['2026-02-29', '12:00', 'UTC'], ['2026-03-08', '02:30', 'America/New_York'],
    ['', '12:00', 'UTC'], ['2026-09-27', '', 'UTC'], ['2026-09-27', '24:00', 'UTC'],
    ['2100-01-01', '12:00', 'UTC'], ['2026-09-27', '12:00', 'Mars/Olympus']
  ])('rejects an invalid observing wall clock %s %s %s', (date, time, zone) => {
    expect(sky.observingWallInstant(date, time, zone)).toBeNaN();
  });
});

describe('Observer form drafts do not move the sky until valid', () => {
  it('keeps an invalid live-clock draft when the incoming wall clock advances a minute', () => {
    const committed = vi.fn();
    const view = mountState(NOW, current => React.createElement(sky.ObservatoryClockFields, {
      React, t, wall: sky.utcMsToWallTime(current, 'America/New_York'),
      timeZone: 'America/New_York', live: true, onChange: committed
    }));
    change(input(view, 'Date'), '');
    view.update(NOW + 60000);
    expect(input(view, 'Date').value).toBe('');
    expect(input(view, 'Date').getAttribute('aria-invalid')).toBe('true');
    expect(input(view, 'Local time').value).toBe('14:00');
    expect(view.host.querySelector('[role="alert"]')).not.toBeNull();
    expect(committed).not.toHaveBeenCalled();
    change(input(view, 'Date'), '2026-09-28');
    expect(committed).toHaveBeenCalledExactlyOnceWith(Date.UTC(2026, 8, 28, 18));
    expect(view.host.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps the previous instant while a date is empty or outside the supported range', () => {
    const original = Date.UTC(2026, 8, 27, 22, 30, 12);
    const view = mountClock(original);
    change(input(view, 'Date'), '');
    expect(view.state).toBe(original);
    expect(view.committed).not.toHaveBeenCalled();
    expect(input(view, 'Date').value).toBe('');
    expect(input(view, 'Date').getAttribute('aria-invalid')).toBe('true');
    expect(view.host.querySelector('[role="alert"]').textContent).toContain('last valid time');
    change(input(view, 'Date'), '2100-01-01');
    expect(view.state).toBe(original);
    change(input(view, 'Date'), '2024-02-29');
    expect(view.state).toBe(Date.UTC(2024, 1, 29, 23, 30));
    expect(view.committed).toHaveBeenCalledTimes(1);
    expect(view.host.querySelector('[role="alert"]')).toBeNull();
  });

  it('holds the selected sky during a skipped DST hour and resumes when corrected', () => {
    const original = Date.UTC(2026, 2, 8, 6, 30);
    const view = mountClock(original);
    change(input(view, 'Local time'), '02:30');
    expect(view.state).toBe(original);
    expect(input(view, 'Local time').value).toBe('02:30');
    expect(view.committed).not.toHaveBeenCalled();
    change(input(view, 'Local time'), '03:30');
    expect(view.state).toBe(original + 3600000);
    expect(view.committed).toHaveBeenCalledTimes(1);
  });

  it.each([
    { label: 'Latitude', initial: 43.66, min: -89.9, max: 89.9, negative: '-33.87', invalid: '-91' },
    { label: 'Longitude', initial: -70.26, min: -180, max: 180, negative: '-151.21', invalid: '181' }
  ])('accepts a signed $label while holding empty, partial, and invalid drafts', props => {
    const committed = vi.fn();
    const view = mountState(props.initial, (value, setValue) => React.createElement(sky.ObservatoryCoordinateField, {
      React, t, ...props, id: 'test-coordinate', value, hint: 'Signed degrees',
      onChange(next) { committed(next); setValue(next); }
    }));
    act(() => Simulate.focus(input(view, props.label)));
    for (const draft of ['', '-', '.', '1e2', props.invalid]) {
      change(input(view, props.label), draft);
      expect(view.state).toBe(props.initial);
      expect(input(view, props.label).value).toBe(draft);
    }
    expect(committed).not.toHaveBeenCalled();
    act(() => Simulate.blur(input(view, props.label)));
    expect(input(view, props.label).getAttribute('aria-invalid')).toBe('true');
    expect(view.host.querySelector('[role="alert"]').textContent).toContain('last valid position');
    act(() => Simulate.keyDown(input(view, props.label), { key: 'Escape' }));
    expect(input(view, props.label).value).toBe(String(props.initial));
    expect(view.host.querySelector('[role="alert"]')).toBeNull();
    act(() => Simulate.focus(input(view, props.label)));
    change(input(view, props.label), props.negative);
    expect(view.state).toBe(Number(props.negative));
    expect(committed).toHaveBeenCalledOnce();
  });
});

describe('The Sky Map and Observatory share place and time', () => {
  it('round-trips the first supported Sydney date even though its UTC year is 1899', () => {
    const utcMs = sky.observingWallInstant('1900-01-01', '00:15', 'Australia/Sydney');
    expect(new Date(utcMs).getUTCFullYear()).toBe(1899);
    const view = mountTool({ tab: 'observatory', obsSite: 'sydney', ...sky.observingInstantPatch(utcMs, 'Australia/Sydney') });
    click(input(view, 'Open this place and time in the Sky Map'));
    expect(view.state.astronomy.skyAnchorUtc).toBe(utcMs);
    expect(input(view, '◀ day').disabled).toBe(true);
    expect(input(view, 'day ▶').disabled).toBe(false);
    change(input(view, 'Hours from selected time'), '-0.5');
    expect(view.state.astronomy.skyHourOffset).toBe(0);
    expect(input(view, 'Open this place and time in the 3D Observatory').disabled).toBe(false);
    click(input(view, 'Open this place and time in the 3D Observatory'));
    const result = sky.observatoryResolve(view.state.astronomy, NOW);
    expect(result.live).toBe(false);
    expect(result.utcMs).toBe(utcMs);
    expect(result.wall.dateText).toBe('1900-01-01');
    expect(result.wall.timeText).toBe('00:15');
    expect(result.site.id).toBe('sydney');
  });

  it('clamps clock steps at both supported local-year boundaries without switching to Live now', () => {
    for (const boundary of [
      { date: '1900-01-01', time: '00:15', label: 'Shift time −1 h', expectedTime: '00:00' },
      { date: '2099-12-31', time: '23:45', label: 'Shift time +1 h', expectedTime: '23:59' }
    ]) {
      const utcMs = sky.observingWallInstant(boundary.date, boundary.time, 'Australia/Sydney');
      const view = mountTool({ tab: 'observatory', obsSite: 'sydney', obsSettingsOpen: true, ...sky.observingInstantPatch(utcMs, 'Australia/Sydney') });
      click(input(view, boundary.label));
      const result = sky.observatoryResolve(view.state.astronomy, NOW);
      expect(result.live).toBe(false);
      expect(view.state.astronomy.obsLive).toBe(false);
      expect(result.wall.dateText).toBe(boundary.date);
      expect(result.wall.timeText).toBe(boundary.expectedTime);
      expect(result.utcMs).toBe(sky.observingWallInstant(boundary.date, boundary.expectedTime, 'Australia/Sydney'));
      expect(result.utcMs).not.toBe(NOW);
    }
  });

  it.each([
    { obsSite: 'portland', obsTz: 'America/New_York', lat: 43.66, lon: -70.26 },
    { obsSite: 'custom', obsLat: -34.5, obsLon: 18.42, obsTz: 'Africa/Johannesburg', lat: -34.5, lon: 18.42 },
    { obsSite: 'custom', obsLat: 43.67, obsLon: -70.25, obsTz: 'America/New_York', lat: 43.67, lon: -70.25 }
  ])('keeps the precise observer and instant on a round trip for $obsSite ($lat, $lon)', location => {
    const view = mountTool({ tab: 'observatory', ...location, ...sky.observingInstantPatch(SECOND_DST_HOUR, location.obsTz), obsBortle: 2 });
    click(input(view, 'Open this place and time in the Sky Map'));
    expect(view.state.astronomy.tab).toBe('skymap');
    expect(view.state.astronomy.skyAnchorUtc).toBe(SECOND_DST_HOUR);
    expect(view.state.astronomy.skyHourOffset).toBe(0);
    expect(view.state.astronomy.skyDayOffset).toBe(0);
    click(input(view, 'Open this place and time in the 3D Observatory'));
    const result = sky.observatoryResolve(view.state.astronomy, NOW);
    expect(view.state.astronomy.tab).toBe('observatory');
    expect(result.utcMs).toBe(SECOND_DST_HOUR);
    expect(result.lat).toBe(location.lat);
    expect(result.lon).toBe(location.lon);
    expect(result.timeZone).toBe(location.obsTz);
    expect(result.bortle).toBe(2);
    expect(result.playing).toBe(false);
  });

  it('carries day and hour changes from the anchored Sky Map back to the Observatory', () => {
    const view = mountTool({ tab: 'observatory', obsSite: 'sydney', ...sky.observingInstantPatch(SECOND_DST_HOUR, 'Australia/Sydney') });
    click(input(view, 'Open this place and time in the Sky Map'));
    click(input(view, 'day ▶'));
    change(input(view, 'Hours from selected time'), '6.5');
    click(input(view, 'Open this place and time in the 3D Observatory'));
    const result = sky.observatoryResolve(view.state.astronomy, NOW);
    expect(result.utcMs).toBe(SECOND_DST_HOUR + 86400000 + 6.5 * 3600000);
    expect(result.site.id).toBe('sydney');
    expect(result.timeZone).toBe('Australia/Sydney');
  });
});
