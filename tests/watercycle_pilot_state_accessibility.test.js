import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const label = key => translate('stem.watercycle.' + key);

function renderPilot(snapshot, pilot = {}, translator = translate) {
  const rendered = prepareStemBrowserRender(renderTool('waterCycle', {
    _threeLoaded: true, waterCycle: { wcMode: 'pilot', pilot: {
      scenario: snapshot.scenario, onboardingComplete: true, paused: true, snapshot, ...pilot,
    } },
  }, { t: translator }));
  const host = document.createElement('div'); host.innerHTML = rendered.html;
  return host;
}

// Exercise real model checkpoints and transitions. A fabricated form on an
// unrelated parcel can hide the temperature/buoyancy contradiction this fixes.
function journeyStates(K) {
  function readings(state) {
    const env = K.environment(state.scenario);
    return { ...state, tempC: K.parcelTempC(env, state.altitudeM), ambientC: K.ambientTempC(env, state.altitudeM),
      rh: K.parcelRH(env, state.altitudeM), buoyancyC: K.buoyancyC(env, state.altitudeM) };
  }
  const states = { surface: readings(K.initialState('tropicalOcean')) }, changes = [];
  let parcel = states.surface;
  const environment = K.environment(parcel.scenario);
  for (let frame = 0; frame < 15000; frame++) {
    const next = readings(K.step(parcel, { dt: .05, sunlit: true, surface: 'hard',
      thrust: parcel.form === 'vapor' ? 1 : .35,
      nucleusHit: parcel.altitudeM >= environment.lclM, dropletHit: frame % 6 === 0 }));
    if (next.form !== parcel.form) changes.push({ ...next, id: 'observed-' + changes.length,
      sequence: changes.length + 1, from: parcel.form, to: next.form });
    if (next.form === 'vapor' || next.form === 'cloud') {
      const key = next.form + (next.buoyancyC >= 0 ? 'Rising' : 'Sinking');
      states[key] ??= next;
    }
    parcel = next;
    if (parcel.form === 'rain') break;
  }
  states.rain = readings(K.step(K.practiceState('rain'), { dt: .12, surface: 'hard' }));
  states.snow = readings(K.step(K.practiceState('snow'), { dt: .12, surface: 'hard' }));
  for (const [start, name, surface] of [
    ['snow', 'stored', 'hard'], ['rain', 'runoff', 'hard'],
    ['rain', 'soil', 'permeable'], ['rain', 'plant', 'plant'],
  ]) {
    let falling = states[start];
    for (let frame = 0; frame < 10000 && K.isFalling(falling.form); frame++) {
      falling = K.step(falling, { dt: .12, surface });
    }
    states[name] = readings(falling);
  }
  let underground = states.soil;
  for (let frame = 0; frame < 10000 && underground.form === 'soil'; frame++) {
    underground = K.step(underground, { dt: .12, thrust: -1 });
  }
  states.groundwater = readings(underground);
  // Move an existing cloud checkpoint to the exact model LFC: both model
  // temperatures coincide there, so no buoyancy value is manually invented.
  const cloud = Object.values(states).find(state => state.form === 'cloud');
  if (cloud) states.cloudNeutral = readings({ ...cloud, altitudeM: environment.lfcM });
  return { states, changes };
}

function descriptions(host) {
  const canvas = host.querySelector('#wcPilotCanvas');
  const ids = canvas.getAttribute('aria-describedby').split(/\s+/);
  expect(ids).toContain('wcPilotSceneDescription');
  const scene = host.querySelector('#wcPilotSceneDescription');
  expect(scene.closest('details, [hidden], [aria-hidden="true"]')).toBeNull();
  return { hud: host.querySelector('.wc-pilot-buoy'), scene: scene.textContent };
}

function shippedZoomCallback(source) {
  const start = source.indexOf('function changePilotZoom(');
  if (start < 0) throw new Error('Missing zoom callback');
  let end = source.indexOf('{', start) + 1, depth = 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw new Error('Unterminated zoom callback');
  return source.slice(start, end);
}

describe.each(paths)('Be the Water state accessibility: %s', path => {
  let K, states, changes;
  beforeAll(() => {
    resetStemLab(); loadTool(path, 'waterCycle'); K = window.WaterCyclePilotKernel;
    ({ states, changes } = journeyStates(K));
  }, 60000);

  it('describes surface water consistently in the visible HUD and canvas description', () => {
    expect(states.surface.form).toBe('liquid');
    const { hud, scene } = descriptions(renderPilot(states.surface));
    expect(hud.dataset.state).toBe('surface');
    expect(hud.textContent).toBe(label('pilot_motion_surface'));
    expect(hud.textContent).toMatch(/surface.*sunlight.*liquid water.*vapor/i);
    expect(scene).toContain('liquid water at the surface');
    expect(scene).toContain('Energy from sunlight');
    expect(hud.textContent + scene).not.toMatch(/rising on your own|needs lift/i);
  });

  it('prioritizes gravity over parcel buoyancy for genuine falling rain and snow checkpoints', () => {
    for (const form of ['rain', 'snow']) {
      const snapshot = states[form]; expect(snapshot.form).toBe(form);
      expect(snapshot.vy).toBeLessThan(0); expect(snapshot.altitudeM).toBeGreaterThan(0);
      const { hud, scene } = descriptions(renderPilot(snapshot));
      expect(hud.dataset.state).toBe('falling');
      expect(hud.textContent).toBe(label('pilot_motion_falling'));
      expect(hud.textContent).toMatch(/falling.*precipitation.*gravity/i);
      expect(scene).toContain('Gravity is carrying you down as precipitation');
      expect(hud.textContent + scene).not.toMatch(/rising on your own|needs lift/i);
    }
  });

  it('explains actual snow storage after landfall without presenting it as airborne', () => {
    const snapshot = states.stored; expect(snapshot.form).toBe('snowpack');
    expect(snapshot.altitudeM).toBe(0); expect(snapshot.snowLandingSurface).toBe('hard');
    const { hud, scene } = descriptions(renderPilot(snapshot));
    expect(hud.dataset.state).toBe('stored');
    expect(hud.textContent).toBe(label('pilot_motion_stored'));
    expect(hud.textContent).toMatch(/stored on land.*melt.*sublimate/i);
    expect(scene).toContain('solid water stored as snow on land');
    expect(scene).toContain('remain at the surface until a process releases you');
    expect(hud.textContent + scene).not.toMatch(/rising on your own|needs lift|falling as precipitation/i);
  });

  it('retains pathway explanations for runoff, soil, groundwater, and plant uptake', () => {
    for (const form of ['runoff', 'soil', 'groundwater', 'plant']) {
      const snapshot = states[form]; expect(snapshot.form).toBe(form);
      const { hud, scene } = descriptions(renderPilot(snapshot));
      expect(hud.dataset.state).toBe('pathway');
      expect(hud.textContent).toBe(label('pilot_residence_time_note'));
      expect(scene).toContain('percent through'); expect(scene).toContain('Storage:');
      expect(scene).toContain('Driver:'); expect(scene).toContain('Natural timescale:');
      expect(hud.textContent + scene).not.toMatch(/rising on your own|needs lift/i);
    }
  });

  it('explains positive, negative and zero thermal lift without claiming paused parcels are moving', () => {
    const airborne = Object.values(states).filter(snapshot => ['vapor', 'cloud'].includes(snapshot.form));
    expect(airborne.some(snapshot => snapshot.form === 'vapor')).toBe(true);
    expect(airborne.some(snapshot => snapshot.form === 'cloud')).toBe(true);
    expect(airborne.some(snapshot => snapshot.buoyancyC > 0)).toBe(true);
    expect(airborne.some(snapshot => snapshot.buoyancyC < 0)).toBe(true);
    expect(states.cloudNeutral.buoyancyC).toBe(0);
    for (const snapshot of airborne) {
      const sign = Math.sign(snapshot.buoyancyC);
      const stateName = sign > 0 ? 'rising' : sign < 0 ? 'sinking' : 'neutral';
      const message = label(sign > 0 ? 'pilot_motion_lift' : sign < 0 ? 'pilot_motion_cool' : 'pilot_motion_balanced');
      for (const paused of [true, false]) {
        const { hud, scene } = descriptions(renderPilot(snapshot, { paused }));
        expect(hud.dataset.state).toBe(stateName);
        expect(hud.textContent).toBe(message); expect(scene).toContain(message);
        expect(hud.textContent + scene).not.toMatch(/rising on your own|needs lift|need lift to keep climbing/i);
        expect(hud.textContent).not.toMatch(/at the surface|falling as precipitation|stored on land/i);
      }
    }
  });

  it('exposes the complete cooling equation with a semantic math role at different altitudes', () => {
    for (const altitudeM of [0, 1500, 3100]) {
      const host = renderPilot(states.surface, { profileProbeM: altitudeM });
      const equation = host.querySelector('.wc-pilot-sky-cooling-equation');
      expect(equation.getAttribute('role')).toBe('math');
      const decimal = value => String(Math.round(value * 10) / 10);
      const expected = label('pilot_compare_cooling_equation_aria')
        .replace('{rate}', decimal(K.envLapse)).replace('{altitude}', decimal(altitudeM / 1000))
        .replace('{drop}', decimal(K.envLapse * altitudeM / 1000));
      expect(equation.getAttribute('aria-label')).toBe(expected);
      expect(expected).toContain('multiplied by'); expect(expected).toContain('equals');
      expect(expected).not.toMatch(/\{\w+\}/);
      expect(equation.closest('[aria-hidden="true"]')).toBeNull();
      for (const term of ['rate', 'altitude', 'result']) {
        expect(equation.querySelector('[data-term="' + term + '"]')?.textContent).toBeTruthy();
      }
    }
  });

  it('names the transition evidence group using a navigable native heading', () => {
    for (const notebookChanges of [[], changes]) {
      const host = renderPilot(states.surface, { notebookChanges });
      const group = host.querySelector('.wc-pilot-notebook-trail');
      expect(group.getAttribute('role')).toBe('group');
      const title = host.querySelector('#' + group.getAttribute('aria-labelledby'));
      expect(title.tagName).toBe('H5');
      expect(title.textContent).toBe(label('pilot_notebook_recent_evidence'));
      expect(group.contains(title)).toBe(true);
      expect(host.querySelectorAll('#' + title.id)).toHaveLength(1);
    }
  });

  it('begins each review button name with its translated visible label and keeps unique transition detail', () => {
    expect(changes.length).toBeGreaterThan(2);
    for (const localize of [translate, (key, fallback) => key === 'stem.watercycle.pilot_review_open'
      ? 'Inspect this saved change' : translate(key, fallback)]) {
      const host = renderPilot(states.surface, { notebookChanges: changes }, localize);
      const buttons = [...host.querySelectorAll('.wc-pilot-notebook-trail .wc-pilot-review-btn')];
      expect(buttons.length).toBe(Math.min(6, changes.length));
      const names = buttons.map(button => button.getAttribute('aria-label'));
      expect(new Set(names).size).toBe(buttons.length);
      for (const button of buttons) {
        const name = button.getAttribute('aria-label');
        expect(name.startsWith(button.textContent + ': ')).toBe(true);
        expect(name).toContain('Review change ');
        expect(name).toContain(' to '); expect(name).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('announces explicit zoom changes, bounds, and reset without requiring vision', () => {
    const messages = [], calls = [];
    let distance = 76;
    const input = { cameraMode: 'follow', adjustZoom(delta) { calls.push(delta); return distance; } };
    const context = createContext({ pilotInput: () => input, t: translate, announceToSR: message => messages.push(message) });
    runInContext(shippedZoomCallback(readFileSync(path, 'utf8')), context);
    for (const [delta, value, key] of [
      [-18, 58, 'pilot_zoomed_in'], [18, 76, 'pilot_zoomed_out'],
      [-18, 12, 'pilot_zoom_closest'], [18, 320, 'pilot_zoom_farthest'], [0, 76, 'pilot_zoom_restored'],
    ]) {
      distance = value; context.changePilotZoom(delta);
      expect(messages.at(-1)).toBe(label(key));
      expect(messages.at(-1)).not.toContain('stem.watercycle.');
    }
    expect(calls).toEqual([-18, 18, -18, 18, 0]);
    expect(messages).toHaveLength(5);
  });

  it('does not announce or adjust unavailable zoom and tolerates hosts without announcements', () => {
    const messages = [], calls = [];
    const context = createContext({ t: translate, announceToSR: message => messages.push(message), pilotInput: () => null });
    runInContext(shippedZoomCallback(readFileSync(path, 'utf8')), context);
    expect(() => context.changePilotZoom(-18)).not.toThrow();
    context.pilotInput = () => ({ cameraMode: 'follow' });
    expect(() => context.changePilotZoom(-18)).not.toThrow();
    const input = { cameraMode: 'water', adjustZoom(delta) { calls.push(delta); return 58; } };
    context.pilotInput = () => input; context.changePilotZoom(-18);
    expect(messages).toEqual([]); expect(calls).toEqual([]);
    input.cameraMode = 'follow'; delete context.announceToSR;
    expect(() => context.changePilotZoom(-18)).not.toThrow();
    expect(calls).toEqual([-18]);
  });
});
