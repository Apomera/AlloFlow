import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const mountedRoots = [];

function setNativeInput(el, val) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, String(val));
  else el.value = String(val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function mountWaveDom(initialWave = {}, ctxOverrides = {}) {
  const cfg = loadTool('stem_lab/stem_tool_wave.js', 'wave');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mountedRoots.push({ root, host });

  let latestState = {
    wave: {
      waveMode: 'free',
      waveType: 'sine',
      amplitude: 50,
      frequency: 2,
      waveSpeed: 343,
      paused: true,
      tourStep: -1,
      ...initialWave,
    },
  };

  const setStemLabTool = ctxOverrides.setStemLabTool || vi.fn();
  const addToast = ctxOverrides.addToast || vi.fn();
  const announceToSR = ctxOverrides.announceToSR || vi.fn();
  const awardXP = ctxOverrides.awardXP || vi.fn();
  const celebrate = ctxOverrides.celebrate || vi.fn();
  const callTTS = ctxOverrides.callTTS || vi.fn();

  function Harness() {
    const [data, setData] = React.useState(latestState);
    latestState = data;
    return cfg.render({
      React,
      toolData: data,
      setToolData: setData,
      labToolData: data,
      setLabToolData: setData,
      setToolSnapshots: vi.fn(),
      addToast,
      announceToSR,
      awardXP,
      getXP: vi.fn(() => 0),
      celebrate,
      beep: vi.fn(),
      setStemLabTool,
      stemLabTab: 'explore',
      setStemLabTab: vi.fn(),
      stemLabTool: 'wave',
      toolSnapshots: {},
      canvasNarrate: vi.fn(),
      canvasA11yDesc: vi.fn(),
      callTTS,
      srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: new Proxy({}, { get: () => () => React.createElement('span') }),
      gradeLevel: ctxOverrides.gradeLevel || '8th Grade',
      props: {},
      t: (_k, fb) => (fb != null ? fb : _k),
      ...ctxOverrides,
    });
  }

  React.act(() => {
    root.render(React.createElement(Harness));
  });

  return {
    cfg,
    host,
    state: () => latestState,
    wave: () => latestState.wave,
    setStemLabTool,
    addToast,
    announceToSR,
    awardXP,
    celebrate,
    callTTS,
  };
}

afterEach(() => {
  while (mountedRoots.length) {
    const { root, host } = mountedRoots.pop();
    try {
      React.act(() => {
        root.unmount();
      });
    } catch (_) {}
    host.remove();
  }
  document.body.innerHTML = '';
  try { window.localStorage.clear(); } catch (_) {}
  try { delete window.__alloflowWave; } catch (_) {}
  resetStemLab();
});

describe('Wave Simulator pure physics, probe, spectrum & mission helpers', () => {
  it('exposes complete StemLab._wave metadata and fixes negative-phase sawtooth continuity', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;
    expect(api).toBeTruthy();
    expect(api.MASTERY_TOTAL).toBe(22);
    expect(api.MASTERY_IDS).toHaveLength(22);
    expect(api.MISSIONS).toHaveLength(12);
    expect(api.FOURIER_PRESETS).toHaveLength(4);
    expect(api.MEDIA_PRESETS).toHaveLength(6);
    expect(api.CER_PROMPTS).toHaveLength(5);

    // Sawtooth negative phase bug regression check: must wrap modulo 2*PI cleanly inside [-1, 1]
    const negVal = api.waveVal(-0.1, 'sawtooth');
    const shiftedVal = api.waveVal(-0.1 + Math.PI * 2, 'sawtooth');
    expect(negVal).toBeGreaterThanOrEqual(-1);
    expect(negVal).toBeLessThanOrEqual(1);
    expect(negVal).toBeCloseTo(shiftedVal, 6);
    expect(negVal).toBeGreaterThan(0.95);
  });

  it('normalizes hostile/null inputs safely and infers UDL grade bands', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    const normNull = api.normalizeState(null, '4th Grade');
    expect(normNull.waveMode).toBe('free');
    expect(normNull.frequency).toBe(2);
    expect(normNull.amplitude).toBe(50);
    expect(normNull.learnerBand).toBe('3-5');

    const normGarbage = api.normalizeState({
      waveMode: 'bogus',
      frequency: 9999,
      amplitude: -50,
      sourceSpeed: 'not-a-number',
      medium2Ratio: 50,
      quiz: ['invalid'],
      experimentLog: 'bad',
    }, '11th Grade Honors Physics');

    expect(normGarbage.waveMode).toBe('free');
    expect(normGarbage.frequency).toBe(10);
    expect(normGarbage.amplitude).toBe(5);
    expect(normGarbage.sourceSpeed).toBe(0.3);
    expect(normGarbage.medium2Ratio).toBe(2.0);
    expect(normGarbage.quiz).toBeNull();
    expect(Array.isArray(normGarbage.experimentLog)).toBe(true);
    expect(normGarbage.learnerBand).toBe('9-12');
  });

  it('computes two-medium refraction and subsonic/supersonic Doppler & Mach cone metrics', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    const base = api.computeWaveMetrics({
      frequency: 2,
      amplitude: 50,
      waveSpeed: 343,
      reflectivity: 0.5,
      medium2Ratio: 0.5,
      sourceSpeed: 0.5,
    });
    expect(base.wavelength).toBeCloseTo(171.5, 4);
    expect(base.period).toBeCloseTo(0.5, 5);
    expect(base.energy).toBe(2500);
    expect(base.reflectedEnergyPct).toBe(25);
    expect(base.transmittedEnergyPct).toBe(75);
    expect(base.transmittedAmpRatio).toBeCloseTo(Math.sqrt(0.75), 5);
    expect(base.medium2Wavelength).toBeCloseTo(85.75, 4);
    expect(base.approachingFreq).toBeCloseTo(4.0, 4);
    expect(base.recedingFreq).toBeCloseTo(2 / 1.5, 4);
    expect(base.machAngleDeg).toBeNull();

    const mach = api.computeWaveMetrics({ frequency: 2, sourceSpeed: 1.3 });
    expect(mach.machAngleDeg).toBeCloseTo((Math.asin(1 / 1.3) * 180) / Math.PI, 4);
  });

  it('computes Interactive Wave Probe readouts across Ripple, Standing, Reflection & Longitudinal modes', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // Equidistant from centered symmetric sources => Δr = 0 => constructive
    const rippleCenter = api.computeProbeReadout({
      waveMode: 'ripple',
      probeX: 0.5,
      probeY: 0.25,
      frequency: 2,
      rippleSeparation: 80,
    }, 800, 400);
    expect(rippleCenter.deltaRLambda).toBeCloseTo(0, 5);
    expect(rippleCenter.interferenceClass).toBe('constructive');

    // Find a probeX on the horizontal axis producing Δr ≈ 0.5λ (destructive nodal line)
    // At probeY = 0.5, d1 - d2 = 2 * |px - cW/2|, rippleWL = cW / (2 * f) = 800 / 4 = 200.
    // Need 2 * dx = 0.5 * 200 = 100 => dx = 50px => probeX = 0.5 + 50/800 = 0.5625
    const rippleNodal = api.computeProbeReadout({
      waveMode: 'ripple',
      probeX: 0.5625,
      probeY: 0.5,
      frequency: 2,
      rippleSeparation: 80,
    }, 800, 400);
    expect(rippleNodal.deltaRLambda).toBeCloseTo(0.5, 2);
    expect(rippleNodal.interferenceClass).toBe('destructive');

    // Standing harmonic #2: node at 0.5, antinode at 0.25
    const standNode = api.computeProbeReadout({ waveMode: 'standing', harmonic: 2, probeX: 0.5 });
    expect(standNode.standingClass).toBe('node');
    expect(standNode.envelopeFrac).toBeCloseTo(0, 5);

    const standAnti = api.computeProbeReadout({ waveMode: 'standing', harmonic: 2, probeX: 0.25 });
    expect(standAnti.standingClass).toBe('antinode');
    expect(standAnti.envelopeFrac).toBeCloseTo(1, 5);

    // Reflection two-medium boundary at wallFrac = 0.6
    const reflM1 = api.computeProbeReadout({ waveMode: 'reflection', wallFrac: 0.6, probeX: 0.3, waveSpeed: 400, medium2Ratio: 0.5, frequency: 2 });
    expect(reflM1.region).toBe('medium1');
    expect(reflM1.localSpeed).toBe(400);
    expect(reflM1.localWavelength).toBe(200);

    const reflM2 = api.computeProbeReadout({ waveMode: 'reflection', wallFrac: 0.6, probeX: 0.8, waveSpeed: 400, medium2Ratio: 0.5, frequency: 2 });
    expect(reflM2.region).toBe('medium2');
    expect(reflM2.localSpeed).toBe(200);
    expect(reflM2.localWavelength).toBe(100);

    // Longitudinal pressure states
    const longProbe = api.computeProbeReadout({ waveMode: 'longitudinal', frequency: 1, probeX: 0.5 });
    expect(longProbe.pressureState).toBe('compression');
  });

  it('computes DFT harmonic spectra and includes Wave 2 secondary frequency peak', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    const sineSpec = api.computeSpectrum({ waveType: 'sine', frequency: 2, showSecond: false }, 6);
    expect(sineSpec.harmonics[0].mag).toBeCloseTo(1.0, 2);
    expect(sineSpec.harmonics[1].mag).toBeLessThan(0.02);
    expect(sineSpec.secondComponent).toBeNull();

    const sqSpec = api.computeSpectrum({ waveType: 'square', frequency: 2, showSecond: true, frequency2: 5, amplitude: 50, amplitude2: 25 }, 6);
    expect(sqSpec.harmonics[0].mag).toBeGreaterThan(1.0); // 4/π ≈ 1.273
    expect(sqSpec.harmonics[1].mag).toBeLessThan(0.03);   // even harmonic ~ 0
    expect(sqSpec.harmonics[2].mag).toBeGreaterThan(0.35); // 4/(3π) ≈ 0.424
    expect(sqSpec.secondComponent).toEqual({ freq: 5, relAmp: 0.5 });

    const sawSpec = api.computeSpectrum({ waveType: 'sawtooth', frequency: 2 }, 6);
    expect(sawSpec.harmonics[1].mag).toBeGreaterThan(0.2); // 2/(2π) ≈ 0.318 present
  });

  it('evaluates all 6 Wave Engineering Missions accurately and guards null questHooks', () => {
    const cfg = loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    expect(api.evaluateMission({ waveMode: 'free', showSecond: false }, 'mission_cancel').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'free', showSecond: true, frequency: 3, frequency2: 3, amplitude: 50, amplitude2: 50, phase2: Math.PI }, 'mission_cancel').ok).toBe(true);

    expect(api.evaluateMission({ waveMode: 'free', showSecond: true, frequency: 4, frequency2: 5, amplitude: 45, amplitude2: 45 }, 'mission_beats').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'free', showSecond: true, frequency: 4, frequency2: 4.5, amplitude: 45, amplitude2: 45 }, 'mission_beats').ok).toBe(true);

    expect(api.evaluateMission({ waveMode: 'standing', harmonic: 2, frequency: 2 }, 'mission_harmonic3').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'standing', harmonic: 3, frequency: 2 }, 'mission_harmonic3').ok).toBe(true);

    expect(api.evaluateMission({ waveMode: 'ripple', probeEnabled: true, frequency: 2, rippleSeparation: 80, probeX: 0.5, probeY: 0.5 }, 'mission_nodal_probe').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'ripple', probeEnabled: true, frequency: 2, rippleSeparation: 80, probeX: 0.5625, probeY: 0.5 }, 'mission_nodal_probe').ok).toBe(true);

    expect(api.evaluateMission({ waveMode: 'reflection', reflectivity: 0.9, medium2Ratio: 0.5 }, 'mission_refraction').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'reflection', reflectivity: 0.5, medium2Ratio: 0.5 }, 'mission_refraction').ok).toBe(true);

    expect(api.evaluateMission({ waveMode: 'doppler', sourceSpeed: 0.8 }, 'mission_mach_cone').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'doppler', sourceSpeed: 1.25 }, 'mission_mach_cone').ok).toBe(true);

    for (const hook of cfg.questHooks) {
      expect(() => hook.check(null)).not.toThrow();
      expect(() => hook.check(undefined)).not.toThrow();
      expect(() => hook.progress(null)).not.toThrow();
      expect(() => hook.progress(undefined)).not.toThrow();
    }
  });
});

describe('Wave Simulator interactive UI, UDL controls, Probe, Missions & Ecosystem integration', () => {
  it('renders dedicated Reflection hero banner, medium presets, new canvas datasets, UDL bands, and Read Aloud TTS', () => {
    const callTTS = vi.fn();
    const { host, wave } = mountWaveDom({ waveMode: 'reflection', reflectivity: 0.5, medium2Ratio: 0.5 }, { callTTS });

    const hero = host.querySelector('[data-wave-hero="reflection"]');
    expect(hero).toBeTruthy();
    expect(hero.textContent).toContain('Reflection & Refraction');

    const canvas = host.querySelector('canvas[data-wave-canvas="true"]');
    expect(canvas.getAttribute('data-medium2-ratio')).toBe('0.5');
    expect(canvas.getAttribute('data-source-speed')).toBe('0.3');
    expect(canvas.getAttribute('data-probe-enabled')).toBe('false');
    expect(canvas.getAttribute('data-ripple-separation')).toBe('80');
    expect(canvas.getAttribute('data-damping-coeff')).toBe('0.002');

    // Click Physical Medium Preset: Water (1482 m/s)
    const waterBtn = host.querySelector('[data-wave-medium="water"]');
    expect(waterBtn.textContent).toContain('1482');
    React.act(() => { waterBtn.click(); });
    expect(wave().waveSpeed).toBe(1482);

    // Switch UDL Band 3-5 -> 9-12 and verify Coach banner updates
    React.act(() => { host.querySelector('[data-wave-band="3-5"]').click(); });
    expect(host.querySelector('[data-wave-coach-banner]').textContent).toContain('Coach (3-5)');
    React.act(() => { host.querySelector('[data-wave-band="9-12"]').click(); });
    expect(host.querySelector('[data-wave-coach-banner]').textContent).toContain('Coach (9-12)');

    // Click Read Aloud TTS
    React.act(() => { host.querySelector('[data-wave-tts-btn]').click(); });
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS.mock.calls[0][0]).toContain('Wave Simulator');
  });

  it('toggles Wave Probe via button & P key, updates telemetry via Probe sliders, and completes a Mission', () => {
    const awardXP = vi.fn();
    const celebrate = vi.fn();
    const { host, wave } = mountWaveDom({ waveMode: 'ripple', frequency: 2 }, { awardXP, celebrate });

    // P hotkey on canvas toggles Probe ON
    const canvas = host.querySelector('canvas[data-wave-canvas="true"]');
    React.act(() => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    });
    expect(wave().probeEnabled).toBe(true);
    expect(host.querySelector('[data-wave-probe-panel]')).toBeTruthy();

    // Drag/adjust Probe X to nodal position 0.56 on horizontal centerline
    const xSlider = host.querySelector('#wave-probe-x-slider');
    const ySlider = host.querySelector('#wave-probe-y-slider');
    React.act(() => {
      setNativeInput(ySlider, '0.5');
      setNativeInput(xSlider, '0.56');
    });
    expect(host.querySelector('[data-wave-probe-panel]').textContent.toUpperCase()).toContain('DESTRUCTIVE');

    // Switch to Missions tab -> Load Setup & Verify mission_mach_cone
    React.act(() => { host.querySelector('[data-wave-tab="missions"]').click(); });
    React.act(() => { host.querySelector('[data-wave-mission-select="mission_mach_cone"]').click(); });
    React.act(() => { host.querySelector('[data-wave-mission-starter]').click(); });
    expect(wave().waveMode).toBe('doppler');
    expect(wave().sourceSpeed).toBe(0.5);

    // Push source speed to 1.3 Mach Cone preset then verify mission
    React.act(() => { setNativeInput(host.querySelector('[data-wave-source-speed-slider]'), '1.3'); });
    React.act(() => { host.querySelector('[data-wave-mission-verify]').click(); });

    expect(host.querySelector('[data-wave-mission-feedback="pass"]')).toBeTruthy();
    expect(wave().missionsDone.mission_mach_cone).toBe(true);
    expect(awardXP).toHaveBeenCalled();
    expect(celebrate).toHaveBeenCalled();
  });

  it('logs wave trials, exports Data Studio scatter dataset, saves CER notebook & navigates Cross-Tool Bridges', () => {
    const setStemLabTool = vi.fn();
    const awardXP = vi.fn();
    const { host, state, wave } = mountWaveDom({ frequency: 2, waveSpeed: 343 }, { setStemLabTool, awardXP });

    // Log 2 trials at different frequencies
    React.act(() => { host.querySelector('[data-wave-log-trial]').click(); });
    React.act(() => { setNativeInput(host.querySelector('#wave-control-frequency'), '4'); });
    React.act(() => { host.querySelector('[data-wave-log-trial]').click(); });
    expect(wave().experimentLog).toHaveLength(2);

    // Open Analyze & Log tab and click Open in Data Studio
    React.act(() => { host.querySelector('[data-wave-tab="analyze"]').click(); });
    expect(host.querySelector('[data-wave-log-table] tbody').querySelectorAll('tr')).toHaveLength(2);
    React.act(() => { host.querySelector('[data-wave-open-datastudio]').click(); });

    expect(state()._dataStudio.chartType).toBe('scatter');
    expect(state()._dataStudio.xAxisLabel).toContain('Frequency');
    expect(state()._dataStudio.yAxisLabel).toContain('Wavelength');
    expect(state()._dataStudio.dataRows).toHaveLength(2);
    expect(setStemLabTool).toHaveBeenCalledWith('dataStudio');

    // Open CER & Bridges tab -> Insert live telemetry, complete CER -> test bridge to Optics Lab
    React.act(() => { host.querySelector('[data-wave-tab="notebook"]').click(); });
    React.act(() => { host.querySelector('[data-wave-cer-insert]').click(); });
    expect(wave().cerEvidence).toContain('f=4Hz');

    React.act(() => {
      setNativeInput(host.querySelector('#wave-cerClaim'), 'Doubling frequency cuts wavelength in half at fixed speed.');
      setNativeInput(host.querySelector('#wave-cerEvidence'), 'At f=2Hz lambda=171.5m; at f=4Hz lambda=85.8m with v=343m/s.');
      setNativeInput(host.querySelector('#wave-cerReasoning'), 'Because v = f * lambda, keeping wave speed constant means f and lambda vary inversely.');
    });
    React.act(() => { host.querySelector('[data-wave-cer-save]').click(); });
    expect(wave().waveMastery.cer_completed).toBe(true);

    React.act(() => { host.querySelector('[data-wave-bridge="opticsLab"]').click(); });
    expect(setStemLabTool).toHaveBeenCalledWith('opticsLab');
  });

  it('hydrates persisted mastery on mount and on alloflow-state-restored via WaveRestoreBridge', () => {
    window.localStorage.setItem('wave.state.v1', JSON.stringify({
      waveMastery: { mission_cancel: true, quiz_1: true },
    }));
    const { host, wave } = mountWaveDom({});
    expect(wave().waveMastery.mission_cancel).toBe(true);
    expect(wave().waveMastery.quiz_1).toBe(true);
    expect(host.querySelector('[data-wave-mastery-pill]').textContent).toContain('2 / 22');

    window.localStorage.setItem('wave.state.v1', JSON.stringify({
      waveMastery: { mission_cancel: true, quiz_1: true, mission_mach_cone: true },
    }));
    React.act(() => {
      window.dispatchEvent(new Event('alloflow-state-restored'));
    });
    expect(wave().waveMastery.mission_mach_cone).toBe(true);
    expect(host.querySelector('[data-wave-mastery-pill]').textContent).toContain('3 / 22');
  });

  it('computes standing boundaries, custom Fourier synthesis, ripple barriers, Snell TIR & Wave 2 missions', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Standing resonator boundaries
    const ffGeo = api.standingGeometry(2, 'fixedFree');
    expect(ffGeo.effectiveHarmonic).toBe(3);
    expect(ffGeo.freqMultiplier).toBeCloseTo(1.5, 6);
    expect(ffGeo.wavelengthFormula).toContain('4L/3');
    expect(api.standingEnvelope(0, 2, 'fixedFree')).toBeCloseTo(0, 5);
    expect(Math.abs(api.standingEnvelope(1, 2, 'fixedFree'))).toBeCloseTo(1, 5);

    const closedPipePass = api.evaluateMission(
      { waveMode: 'standing', standingBoundary: 'fixedFree', harmonic: 2 },
      'mission_closed_pipe'
    );
    expect(closedPipePass.ok).toBe(true);

    // 2. Custom Fourier waveform & spectrum
    const customWeights = [0, 1, 0, 0, 0, 0];
    expect(api.waveVal(Math.PI / 4, 'custom', customWeights)).toBeCloseTo(1, 4);
    const customSpec = api.computeSpectrum({ waveType: 'custom', harmonicWeights: [0.5, 0.25, 0, 0, 0, 0], frequency: 3 });
    expect(customSpec.harmonics[0].mag / customSpec.harmonics[1].mag).toBeCloseTo(2, 4);
    expect(customSpec.harmonics[1].freq).toBeCloseTo(6, 5);
    expect(customSpec.harmonics[2].mag).toBeCloseTo(0, 5);

    // 3. Ripple tank barrier diffraction & double-slit Probe
    const diffMetrics = api.computeWaveMetrics({ waveMode: 'ripple', rippleBarrier: 'doubleSlit', slitWidth: 0.1, waveSpeed: 343, frequency: 10 });
    expect(diffMetrics.diffractionAngleDeg).toBeGreaterThan(0);
    const dsProbe = api.computeProbeReadout({ waveMode: 'ripple', rippleBarrier: 'doubleSlit', slitWidth: 0.08, probeX: 0.72, probeY: 0.42 }, 600, 320);
    expect(dsProbe.d1Lambda).toBeGreaterThan(0);
    expect(dsProbe.d2Lambda).toBeGreaterThan(0);

    // 4. Snell's Law oblique incidence & Total Internal Reflection
    const tirMetrics = api.computeWaveMetrics({ waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 55, reflectivity: 0.4 });
    expect(tirMetrics.criticalAngleDeg).toBeCloseTo(41.81, 1);
    expect(tirMetrics.isTotalInternalReflection).toBe(true);
    expect(tirMetrics.effectiveReflectivity).toBe(1);
    expect(api.evaluateMission({ waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 55 }, 'mission_tir').ok).toBe(true);

    // 5. Hostile-gate { mode, tab } seed fallback
    const seedState = api.normalizeState({ mode: 'ripple', tab: 'library' });
    expect(seedState.waveMode).toBe('ripple');
    expect(seedState.workspaceTab).toBe('library');
  });

  it('drives Wave 2 UI controls: standing boundary, custom Fourier builder, ripple barrier/screen, TIR & library Try-in-Sim', () => {
    const { host, wave } = mountWaveDom({ waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 2 });

    // Switch standing boundary to Closed Pipe
    React.act(() => {
      host.querySelector('[data-wave-standing-boundary="fixedFree"]').click();
    });
    expect(wave().standingBoundary).toBe('fixedFree');
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-standing-boundary')).toBe('fixedFree');

    // Switch to Free mode -> Custom Fourier builder & Clarinet preset
    React.act(() => {
      host.querySelector('[data-wave-mode="free"]').click();
    });
    React.act(() => {
      host.querySelector('[data-wave-type-btn="custom"]').click();
    });
    expect(host.querySelector('[data-wave-fourier-builder]')).toBeTruthy();
    React.act(() => {
      host.querySelector('[data-wave-fourier-preset="clarinet"]').click();
    });
    expect(wave().harmonicWeights).toEqual([1, 0, 0.75, 0, 0.45, 0]);
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-harmonic-weights')).toBe('1,0,0.75,0,0.45,0');

    // Switch to Ripple mode -> Double Slit barrier + I(y) Screen toggle
    React.act(() => {
      host.querySelector('[data-wave-mode="ripple"]').click();
    });
    React.act(() => {
      host.querySelector('[data-wave-ripple-barrier="doubleSlit"]').click();
      host.querySelector('[data-wave-intensity-toggle]').click();
    });
    expect(wave().rippleBarrier).toBe('doubleSlit');
    expect(wave().showIntensityScreen).toBe(true);
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-ripple-barrier')).toBe('doubleSlit');
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-show-intensity-screen')).toBe('true');

    // Switch to Reflection mode -> Fiber-Optic TIR preset & badge
    React.act(() => {
      host.querySelector('[data-wave-mode="reflection"]').click();
    });
    React.act(() => {
      host.querySelector('[data-wave-tir-preset]').click();
    });
    expect(wave().incidentAngleDeg).toBe(55);
    expect(host.querySelector('[data-wave-tir-badge]')).toBeTruthy();

    // Library Try-in-Simulator deep-link
    const libMount = mountWaveDom({ workspaceTab: 'library', expSection: 'instruments' });
    const tryBtn = libMount.host.querySelector('[data-wave-try-sim="inst_closed_pipe"]');
    expect(tryBtn).toBeTruthy();
    React.act(() => { tryBtn.click(); });
    expect(libMount.wave().workspaceTab).toBe('explore');
    expect(libMount.wave().waveMode).toBe('standing');
    expect(libMount.wave().standingBoundary).toBe('fixedFree');
    expect(libMount.wave().harmonic).toBe(2);
  });

  it('supports Wave 3 slitWidth fix, packet dispersion, Kundt standing tube, Doppler observer, probe oscilloscope, 5-point sweep & deep-links', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. slitWidth normalization bugfix: preserve [0.03, 0.25] normalized values & migrate legacy > 1 values
    expect(api.normalizeState({ slitWidth: 0.08 }).slitWidth).toBeCloseTo(0.08, 4);
    expect(api.normalizeState({ slitWidth: 32 }).slitWidth).toBeCloseTo(0.08, 4);
    expect(api.normalizeState({ slitWidth: 0.001 }).slitWidth).toBeCloseTo(0.03, 4);
    expect(api.normalizeState({ slitWidth: 0.9 }).slitWidth).toBeCloseTo(0.25, 4);

    // 2. Wave packet group vs phase velocity & dispersion regimes
    const mNormal = api.computeWaveMetrics({ waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5, waveSpeed: 400 });
    expect(mNormal.dispersionRegime).toBe('normal');
    expect(mNormal.phaseVelocity).toBeCloseTo(400, 4);
    expect(mNormal.groupVelocity).toBeCloseTo(200, 4);
    const mAnom = api.computeWaveMetrics({ waveMode: 'free', packetMode: 'packet', dispersionRatio: 1.5, waveSpeed: 400 });
    expect(mAnom.dispersionRegime).toBe('anomalous');
    expect(mAnom.groupVelocity).toBeCloseTo(600, 4);
    expect(api.computeWaveMetrics({ packetMode: 'continuous', dispersionRatio: 0.5 }).groupVelocity).toBeCloseTo(171.5, 4);
    expect(api.computeWaveMetrics({ packetMode: 'packet', dispersionRatio: 1.0 }).dispersionRegime).toBe('nondispersive');

    // 3. Longitudinal Kundt standing tube, SPL dB & general Doppler observer
    const splLow = api.computeWaveMetrics({ amplitude: 10 }).soundLevelDb;
    const splHigh = api.computeWaveMetrics({ amplitude: 100 }).soundLevelDb;
    expect(splHigh - splLow).toBeCloseTo(20, 1);

    const kundtWall = api.computeProbeReadout({ waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 2, probeX: 0 });
    const kundtMid = api.computeProbeReadout({ waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 2, probeX: 0.25 });
    expect(kundtWall.pressureNodeClass).toBe('pressureAntinode');
    expect(kundtMid.pressureNodeClass).toBe('pressureNode');
    expect(kundtWall.standingClass).toBe('node');
    expect(kundtMid.standingClass).toBe('antinode');

    const dopBoth = api.computeWaveMetrics({ waveMode: 'doppler', frequency: 2, sourceSpeed: 0.3, observerSpeed: 0.4 });
    expect(dopBoth.approachingFreq).toBeCloseTo(4.0, 4); // 2 * (1 + 0.4) / (1 - 0.3)
    expect(dopBoth.recedingFreq).toBeCloseTo(2 * 0.6 / 1.3, 4);

    // 4. Probe SHM kinematics & 48-sample oscilloscope trace
    const shm = api.computeProbeReadout({ waveMode: 'free', frequency: 2, amplitude: 50, probeX: 0.2 });
    const omega = 2 * Math.PI * 2;
    expect(shm.angularFreq).toBeCloseTo(omega, 4);
    expect(shm.maxVelocity).toBeCloseTo(omega * 50, 2);
    expect(shm.maxAcceleration).toBeCloseTo(omega * omega * 50, 1);
    expect(shm.oscilloscopeTrace).toHaveLength(48);
    expect(shm.oscilloscopeTrace.every((v) => v >= -1 && v <= 1)).toBe(true);

    // 5. Parametric sweep builder across axes
    const machSweep = api.buildSweepRows({ waveMode: 'doppler', frequency: 2 }, 'dopplerMach', 1);
    expect(machSweep).toHaveLength(5);
    expect(machSweep[4].sourceSpeed).toBeCloseTo(0.8, 3);
    expect(machSweep[4].approachingFreq).toBeGreaterThan(machSweep[0].approachingFreq);

    // 6. Missions 9 & 10 evaluator checks
    expect(api.evaluateMission({ waveMode: 'free', packetMode: 'continuous', dispersionRatio: 0.5 }, 'mission_dispersion').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5 }, 'mission_dispersion').ok).toBe(true);
    expect(api.evaluateMission({ waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 2, showDisplacementCurve: false }, 'mission_kundt_tube').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 3, showDisplacementCurve: true }, 'mission_kundt_tube').ok).toBe(true);

    // 7. DOM interactive verification across Wave 3 controls
    const { host, wave, state } = mountWaveDom({ waveMode: 'free', probeEnabled: true });
    const pktBtn = host.querySelector('[data-wave-packet-mode="packet"]');
    const pNormalBtn = () => host.querySelector('[data-wave-disp-preset="0.5"]');
    expect(pktBtn).toBeTruthy();
    React.act(() => { pktBtn.click(); });
    expect(wave().packetMode).toBe('packet');
    expect(pNormalBtn()).toBeTruthy();
    React.act(() => { pNormalBtn().click(); });
    expect(wave().dispersionRatio).toBeCloseTo(0.5, 4);
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-packet-mode')).toBe('packet');
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-dispersion-ratio')).toBe('0.5');

    // Probe SHM kinematics & oscilloscope polyline in DOM
    expect(host.querySelector('[data-wave-probe-vmax]').textContent).toContain('u/s');
    expect(host.querySelector('[data-wave-probe-amax]').textContent).toContain('u/s');
    const oscPoly = host.querySelector('svg[data-wave-probe-oscilloscope="true"] polyline');
    expect(oscPoly).toBeTruthy();
    expect(oscPoly.getAttribute('points').trim().split(/\s+/)).toHaveLength(48);

    // Switch to longitudinal Kundt tube in DOM
    React.act(() => { host.querySelector('[data-wave-mode="longitudinal"]').click(); });
    React.act(() => { host.querySelector('[data-wave-longitudinal-mode="standing"]').click(); });
    React.act(() => { host.querySelector('[data-wave-kundt-harmonic="3"]').click(); });
    React.act(() => { host.querySelector('[data-wave-disp-curve-toggle="true"]').click(); });
    expect(wave().longitudinalMode).toBe('standing');
    expect(wave().harmonic).toBe(3);
    expect(wave().showDisplacementCurve).toBe(true);
    expect(host.querySelector('[data-wave-probe-kundt-spot="true"]')).toBeTruthy();
    expect(host.querySelector('[data-wave-spl-badge="true"]').textContent).toContain('dB SPL');

    // Switch to Doppler moving observer in DOM
    React.act(() => { host.querySelector('[data-wave-mode="doppler"]').click(); });
    React.act(() => { host.querySelector('[data-wave-obs-preset="0.4"]').click(); });
    expect(wave().observerSpeed).toBeCloseTo(0.4, 4);
    expect(host.querySelector('[data-wave-doppler-approaching]').textContent).toContain('4.0 Hz');

    // Switch to Analyze tab -> select Snell or AmpEnergy axis -> run 5-point sweep -> open Data Studio
    React.act(() => { host.querySelector('[data-wave-tab="analyze"]').click(); });
    React.act(() => { host.querySelector('[data-wave-ds-plot="ampEnergy"]').click(); });
    React.act(() => { host.querySelector('[data-wave-run-sweep="true"]').click(); });
    expect(host.querySelectorAll('[data-wave-log-table] tbody tr')).toHaveLength(5);
    React.act(() => { host.querySelector('[data-wave-open-datastudio]').click(); });
    expect(state()._dataStudio.dataRows).toHaveLength(5);
    expect(state()._dataStudio.yAxisLabel).toContain('Energy');

    // Verify new Reference Library Try-in-Simulator deep-links (Ocean & Fibers)
    const oceanMount = mountWaveDom({ workspaceTab: 'library', expSection: 'ocean' });
    const oceanBtn = oceanMount.host.querySelector('[data-wave-try-sim="ocean_deep_packet"]');
    expect(oceanBtn).toBeTruthy();
    React.act(() => { oceanBtn.click(); });
    expect(oceanMount.wave().waveMode).toBe('free');
    expect(oceanMount.wave().packetMode).toBe('packet');
    expect(oceanMount.wave().dispersionRatio).toBeCloseTo(0.5, 4);

    const fiberMount = mountWaveDom({ workspaceTab: 'library', expSection: 'fibers' });
    const fiberBtn = fiberMount.host.querySelector('[data-wave-try-sim="fiber_tir_demo"]');
    expect(fiberBtn).toBeTruthy();
    React.act(() => { fiberBtn.click(); });
    expect(fiberMount.wave().waveMode).toBe('reflection');
    expect(fiberMount.wave().incidentAngleDeg).toBe(55);
  });

  it('computes Wave 4 phased-array steering, Fresnel impedance/AR coatings, Lissajous phase space, spectral THD/centroid, missions 11-12 & DOM/inquiry mastery sync', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Metadata extensions
    expect(api.MASTERY_IDS).toContain('mission_phased_array');
    expect(api.MASTERY_IDS).toContain('mission_antireflection');
    expect(api.MISSIONS.some((m) => m.id === 'mission_phased_array')).toBe(true);
    expect(api.MISSIONS.some((m) => m.id === 'mission_antireflection')).toBe(true);
    expect(api.CER_PROMPTS.some((p) => p.id === 'phased_array_coatings')).toBe(true);

    // 2. Phased-array beam steering & phase-shifted ripple probe
    const mBroadside = api.computeWaveMetrics({ waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: 0 });
    const mSteerPos = api.computeWaveMetrics({ waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: Math.PI / 2 });
    const mSteerNeg = api.computeWaveMetrics({ waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: -Math.PI / 2 });
    expect(mBroadside.beamSteerAngleDeg).toBeCloseTo(0, 4);
    expect(Math.abs(mSteerPos.beamSteerAngleDeg)).toBeGreaterThan(1);
    expect(mSteerPos.beamSteerAngleDeg * mSteerNeg.beamSteerAngleDeg).toBeLessThan(0);

    const probe0 = api.computeProbeReadout({ waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: 0, probeEnabled: true, probeX: 0.5, probeY: 0.5 });
    const probePi = api.computeProbeReadout({ waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: Math.PI, probeEnabled: true, probeX: 0.5, probeY: 0.5 });
    expect(Math.abs(probePi.netCycleDiff - probe0.netCycleDiff)).toBeCloseTo(0.5, 2);
    expect(probe0.interferenceClass).not.toBe(probePi.interferenceClass);

    // 3. Fresnel impedance coupling & lambda/4 AR coating
    const mCoupled = api.computeWaveMetrics({
      waveMode: 'reflection', waveSpeed: 343, medium2Ratio: 0.25,
      impedanceCoupled: true, antiReflectionCoating: false, incidentAngleDeg: 0,
    });
    expect(mCoupled.impedanceCoupled).toBe(true);
    expect(mCoupled.effectiveReflectivity).toBeCloseTo(0.6, 3);
    expect(mCoupled.effectivePhaseFlip).toBe(-1);
    expect(mCoupled.standingWaveRatio).toBeGreaterThan(1);

    const mAR = api.computeWaveMetrics({
      waveMode: 'reflection', waveSpeed: 343, medium2Ratio: 0.25, frequency: 2,
      impedanceCoupled: true, antiReflectionCoating: true, incidentAngleDeg: 0,
    });
    expect(mAR.antiReflectionCoating).toBe(true);
    expect(mAR.effectiveReflectivity).toBeLessThan(0.05);
    expect(mAR.effectiveReflectivity).toBeLessThan(mCoupled.effectiveReflectivity);
    expect(mAR.standingWaveRatio).toBeLessThan(mCoupled.standingWaveRatio);
    expect(mAR.coatingSpeed).toBeGreaterThan(0);
    expect(mAR.quarterWaveThickness).toBeGreaterThan(0);

    // 4. Probe Lissajous trace & axes
    const prLiss = api.computeProbeReadout({
      waveMode: 'free', showSecond: true, probeEnabled: true, probeScopeMode: 'lissajous',
      frequency: 2, frequency2: 3, amplitude: 50, amplitude2: 30,
    });
    expect(prLiss.lissajousTrace).toHaveLength(64);
    for (const pt of prLiss.lissajousTrace) {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(Math.abs(pt.x)).toBeLessThanOrEqual(1.001);
      expect(Math.abs(pt.y)).toBeLessThanOrEqual(1.001);
    }
    expect(prLiss.lissajousAxes.xLabel).toBeTruthy();
    expect(prLiss.lissajousAxes.yLabel).toBeTruthy();

    // 5. Governing equation, spectrum THD/centroid, phasedBeam sweep
    for (const mode of ['free', 'standing', 'ripple', 'reflection', 'longitudinal', 'doppler', 'spectrum']) {
      const gov = api.governingEquation({ waveMode: mode });
      expect(gov.formula).toBeTruthy();
      expect(gov.detail).toBeTruthy();
    }
    const sSine = api.computeSpectrum({ waveType: 'sine', frequency: 2, amplitude: 50 });
    const sSq = api.computeSpectrum({ waveType: 'square', frequency: 2, amplitude: 50 });
    expect(sSine.thdPct).toBeLessThan(1);
    expect(sSq.thdPct).toBeGreaterThan(10);
    expect(sSq.spectralCentroidHz).toBeGreaterThan(sSine.spectralCentroidHz);

    const beamRows = api.buildSweepRows({ waveMode: 'ripple', rippleBarrier: 'none' }, 'phasedBeam', 1);
    expect(beamRows).toHaveLength(5);
    expect(beamRows.every((r) => typeof r.beamSteerAngleDeg === 'number')).toBe(true);

    // 6. Missions 11 & 12 evaluation
    expect(api.evaluateMission({ waveMode: 'ripple', rippleBarrier: 'none', showIntensityScreen: true, ripplePhaseDiff: 0 }, 'mission_phased_array').ok).toBe(false);
    expect(api.evaluateMission({ waveMode: 'ripple', rippleBarrier: 'none', showIntensityScreen: true, ripplePhaseDiff: 1.5708 }, 'mission_phased_array').ok).toBe(true);
    expect(api.evaluateMission({
      waveMode: 'reflection', waveSpeed: 343, medium2Ratio: 0.6,
      impedanceCoupled: true, antiReflectionCoating: false, incidentAngleDeg: 0,
    }, 'mission_antireflection').ok).toBe(false);
    expect(api.evaluateMission({
      waveMode: 'reflection', waveSpeed: 343, medium2Ratio: 0.6,
      impedanceCoupled: true, antiReflectionCoating: true, incidentAngleDeg: 0,
    }, 'mission_antireflection').ok).toBe(true);

    // 7. DOM interactive checks: Lissajous scope, Phased Array, Impedance/AR, Governing Equation, phasedBeam Sweep, Reset & Investigate
    const { host, wave } = mountWaveDom({ waveMode: 'free', showSecond: true, probeEnabled: true });
    expect(host.querySelector('[data-wave-governing-formula]').textContent).toBeTruthy();
    expect(host.querySelector('[data-wave-governing-detail]').textContent).toBeTruthy();
    React.act(() => { host.querySelector('[data-wave-probe-scope="lissajous"]').click(); });
    expect(wave().probeScopeMode).toBe('lissajous');
    const lissPoly = host.querySelector('svg[data-wave-probe-lissajous="true"] polyline');
    expect(lissPoly).toBeTruthy();

    React.act(() => { host.querySelector('[data-wave-mode="ripple"]').click(); });
    expect(host.querySelector('[data-wave-phased-array-controls]')).toBeTruthy();
    React.act(() => { host.querySelector('[data-wave-phase-preset="90"]').click(); });
    expect(wave().ripplePhaseDiff).toBeCloseTo(Math.PI / 2, 3);
    expect(host.querySelector('[data-wave-beam-steer-badge]').textContent).toBeTruthy();

    React.act(() => { host.querySelector('[data-wave-mode="reflection"]').click(); });
    React.act(() => { host.querySelector('[data-wave-impedance-lock]').click(); });
    React.act(() => { host.querySelector('[data-wave-ar-coating]').click(); });
    expect(wave().impedanceCoupled).toBe(true);
    expect(wave().antiReflectionCoating).toBe(true);
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-impedance-coupled')).toBe('true');
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-anti-reflection-coating')).toBe('true');
    expect(host.querySelector('[data-wave-swr-badge]')).toBeTruthy();

    React.act(() => { host.querySelector('[data-wave-tab="analyze"]').click(); });
    React.act(() => { host.querySelector('[data-wave-ds-plot="phasedBeam"]').click(); });
    expect(wave().dataStudioPlot).toBe('phasedBeam');
    expect(host.querySelector('[data-wave-spectrum-summary]').textContent).toMatch(/Centroid|THD/i);

    // Reset controls resets Wave 3 & Wave 4 fields
    const dirtyMount = mountWaveDom({
      waveMode: 'ripple', packetMode: 'packet', dispersionRatio: 0.5, observerSpeed: 0.4,
      ripplePhaseDiff: 1.5708, impedanceCoupled: true, antiReflectionCoating: true,
      probeEnabled: true, probeScopeMode: 'lissajous',
    });
    React.act(() => { dirtyMount.host.querySelector('[data-wave-reset-controls]').click(); });
    expect(dirtyMount.wave().packetMode).toBe('continuous');
    expect(dirtyMount.wave().dispersionRatio).toBe(1);
    expect(dirtyMount.wave().observerSpeed).toBe(0);
    expect(dirtyMount.wave().ripplePhaseDiff).toBe(0);
    expect(dirtyMount.wave().impedanceCoupled).toBe(false);
    expect(dirtyMount.wave().antiReflectionCoating).toBe(false);
    expect(dirtyMount.wave().probeScopeMode).toBe('time');

    // Investigate -> Discover v = f·lambda & mastery sync
    const invMount = mountWaveDom({ waveMode: 'free' });
    React.act(() => { invMount.host.querySelector('[data-wave-investigate="discoverWave"]').click(); });
    expect(invMount.wave().workspaceTab).toBe('library');
    expect(invMount.wave().expSection).toBe('discoverWave');
    expect(invMount.host.querySelector('[data-wave-back-to-sim]')).toBeTruthy();
    const seeItBtn = Array.from(invMount.host.querySelectorAll('button')).find((b) => /i see it/i.test(b.textContent || ''));
    expect(seeItBtn).toBeTruthy();
    React.act(() => { seeItBtn.click(); });
    expect(invMount.wave().waveMastery.discovered_law).toBe(true);
    expect(invMount.host.querySelector('[data-wave-mastery-pill]').textContent).toContain('1 / 22');

    // Wave 4 Reference Library Try-in-Simulator deep-links
    const optMount = mountWaveDom({ workspaceTab: 'library', expSection: 'optics' });
    React.act(() => { optMount.host.querySelector('[data-wave-try-sim="optics_ar_coating"]').click(); });
    expect(optMount.wave().waveMode).toBe('reflection');
    expect(optMount.wave().antiReflectionCoating).toBe(true);

    const antMount = mountWaveDom({ workspaceTab: 'library', expSection: 'antennas' });
    React.act(() => { antMount.host.querySelector('[data-wave-try-sim="antennas_phased_beam"]').click(); });
    expect(antMount.wave().waveMode).toBe('ripple');
    expect(antMount.wave().ripplePhaseDiff).not.toBe(0);

    const radMount = mountWaveDom({ workspaceTab: 'library', expSection: 'radar' });
    React.act(() => { radMount.host.querySelector('[data-wave-try-sim="radar_phased_array"]').click(); });
    expect(radMount.wave().waveMode).toBe('ripple');
    expect(radMount.wave().ripplePhaseDiff).not.toBe(0);
  });
});
