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

  it('computes Wave 5 physics audio params, lambda caliper ruler, keyboard probe/match, quiz 14/myths 7, inline SVG trend plot, mode CER evidence & cross-tool bridge handoffs', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Metadata & content counts
    expect(api.QUIZ_COUNT).toBe(14);
    expect(api.MYTHS_COUNT).toBe(7);

    // 2. Physics-accurate audio parameter calculation
    const apLowAmp = api.computeAudioParams({ waveMode: 'free', frequency: 2, amplitude: 20 });
    const apHighAmp = api.computeAudioParams({ waveMode: 'free', frequency: 2, amplitude: 80 });
    expect(apHighAmp.gain1).toBeGreaterThan(apLowAmp.gain1);
    expect(apLowAmp.f1Hz).toBe(200);

    const apStandNode = api.computeAudioParams({ waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 3, frequency: 2, amplitude: 80, probeEnabled: true, probeX: 0 });
    const apStandAntinode = api.computeAudioParams({ waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 3, frequency: 2, amplitude: 80, probeEnabled: true, probeX: 1 / 6 });
    expect(apStandAntinode.f1Hz).toBe(600);
    expect(apStandAntinode.gain1).toBeGreaterThan(apStandNode.gain1);

    const apBeats = api.computeAudioParams({ waveMode: 'free', frequency: 3, amplitude: 50, showSecond: true, frequency2: 3.5, amplitude2: 40 });
    expect(apBeats.hasOsc2).toBe(true);
    expect(apBeats.f2Hz).toBe(350);
    expect(apBeats.gain2).toBeGreaterThan(0);

    // 3. Caliper ruler physics readout & snapping
    const rrDefault = api.computeRulerReadout({ waveMode: 'free', frequency: 2, waveSpeed: 343, rulerX1: 0.25, rulerX2: 0.75 });
    expect(rrDefault.spanFrac).toBeCloseTo(0.5, 3);
    expect(rrDefault.spanCycles).toBeCloseTo(1, 2);
    expect(rrDefault.isWholeMultiple).toBe(true);

    const snapHalf = api.snapRulerSpan({ waveMode: 'free', frequency: 2, rulerX1: 0.25, rulerX2: 0.75 }, 0.5);
    const rrHalf = api.computeRulerReadout({ waveMode: 'free', frequency: 2, waveSpeed: 343, ...snapHalf });
    expect(rrHalf.spanCycles).toBeCloseTo(0.5, 2);
    expect(rrHalf.isHalfMultiple).toBe(true);

    // 4. Caliper UI toggle, snap buttons & reset
    const { host, wave } = mountWaveDom({ waveMode: 'free', frequency: 2, waveSpeed: 343 });
    expect(host.querySelector('[data-wave-ruler-panel]')).toBeNull();
    React.act(() => { host.querySelector('[data-wave-ruler-toggle]').click(); });
    expect(wave().showRuler).toBe(true);
    expect(host.querySelector('[data-wave-ruler-panel]')).toBeTruthy();
    expect(host.querySelector('[data-wave-canvas]').getAttribute('data-show-ruler')).toBe('true');

    React.act(() => { host.querySelector('[data-wave-ruler-snap="0.5"]').click(); });
    expect(host.querySelector('[data-wave-ruler-readout]').textContent).toContain('0.50\u03BB');
    React.act(() => { host.querySelector('[data-wave-ruler-snap="1"]').click(); });
    expect(host.querySelector('[data-wave-ruler-readout]').textContent).toContain('1.00\u03BB');

    React.act(() => { host.querySelector('[data-wave-reset-controls]').click(); });
    expect(wave().showRuler).toBe(false);
    expect(wave().rulerX1).toBeCloseTo(0.25, 3);
    expect(wave().rulerX2).toBeCloseTo(0.75, 3);

    // 5. Canvas Shift+Arrow probe nudge + unmodified Arrow match XP
    const matchMount = mountWaveDom({
      waveMode: 'free',
      amplitude: 45,
      frequency: 2,
      matchTarget: { amp: 50, freq: 2, isEquation: false },
      matchXpClaimed: false,
      probeEnabled: true,
      probeX: 0.5,
      probeY: 0.5,
    });
    const canvas = matchMount.host.querySelector('[data-wave-canvas]');
    React.act(() => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    });
    expect(matchMount.wave().probeX).toBeCloseTo(0.52, 2);
    React.act(() => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });
    expect(matchMount.wave().amplitude).toBe(50);
    expect(matchMount.wave().matchXpClaimed).toBe(true);
    expect(matchMount.wave().matchedOnce).toBe(true);
    expect(matchMount.wave().waveMastery.matched_wave).toBe(true);

    // 6. Doppler Fly-By button present and resilient when AudioContext is absent
    const dopMount = mountWaveDom({ waveMode: 'doppler', sourceSpeed: 0.5 });
    const flybyBtn = dopMount.host.querySelector('[data-wave-doppler-flyby]');
    expect(flybyBtn).toBeTruthy();
    React.act(() => { flybyBtn.click(); });

    // 7. Quiz Show-Me-in-Sim switches back to explore tab, Myth panel expands to 7 items
    const mythMount = mountWaveDom({ waveMode: 'free' });
    const mythHeader = Array.from(mythMount.host.querySelectorAll('.wave-myths-panel button')).find((b) => /Wave myths/i.test(b.textContent || ''));
    React.act(() => { mythHeader.click(); });
    expect(mythMount.host.querySelectorAll('.wave-myths-panel p.text-rose-700')).toHaveLength(7);

    // 8. Analyze inline SVG scatter plot + R2 + dynamic axis columns
    const anMount = mountWaveDom({ workspaceTab: 'analyze', waveMode: 'doppler', sourceSpeed: 0.4, dataStudioPlot: 'dopplerMach' });
    React.act(() => { anMount.host.querySelector('[data-wave-run-sweep]').click(); });
    expect(anMount.host.querySelector('svg[data-wave-inline-plot="true"]')).toBeTruthy();
    expect(anMount.host.querySelectorAll('svg[data-wave-inline-plot="true"] circle')).toHaveLength(5);
    expect(anMount.host.querySelector('[data-wave-inline-r2]').textContent).toContain('R\u00B2');
    const hdrText = anMount.host.querySelector('[data-wave-log-table] thead').textContent;
    expect(hdrText).toContain('Mach M');

    // 9. Mode-aware CER evidence & live Cross-Tool Bridge handoffs
    const reflCer = api.buildCerEvidence({ waveMode: 'reflection', incidentAngleDeg: 35, medium2Ratio: 0.5, impedanceCoupled: true });
    expect(reflCer).toContain('[reflection]');
    expect(reflCer).toContain('SWR=');

    const switchedCalls = [];
    const bridgeMount = mountWaveDom(
      { workspaceTab: 'notebook', waveMode: 'reflection', medium2Ratio: 0.5, incidentAngleDeg: 25, waveType: 'square' },
      { setStemLabTool: (id) => switchedCalls.push(id) }
    );
    React.act(() => { bridgeMount.host.querySelector('[data-wave-cer-insert]').click(); });
    expect(bridgeMount.wave().cerEvidence).toContain('[reflection]');
    expect(bridgeMount.wave().cerEvidence).toContain('v2/v1=0.50');

    React.act(() => { bridgeMount.host.querySelector('[data-wave-bridge="opticsLab"]').click(); });
    expect(bridgeMount.state().opticsLab).toMatchObject({ mode: 'refraction', refrN1: 1.0, refrN2: 2.0, refrTheta1: 25 });
    expect(switchedCalls).toContain('opticsLab');

    React.act(() => { bridgeMount.host.querySelector('[data-wave-bridge="musicSynth"]').click(); });
    expect(bridgeMount.state().musicSynth).toMatchObject({ synthTab: 'play', synthEngine: 'standard', waveType: 'square' });
    expect(switchedCalls).toContain('musicSynth');
  });

  it('computes Wave 6 standing string Mersenne laws, N-slit grating, pulse collision, harmonic filter AudioContext, sonar echo & snapshot tray', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Standing String Mechanics & Mersenne's Laws
    expect(api.STRING_PRESETS).toHaveLength(4);
    expect(api.computeStringSpeed(160, 4.0)).toBeCloseTo(200, 1);
    const normStr = api.normalizeState({
      waveMode: 'standing',
      standingBoundary: 'bothFixed',
      stringMechanics: true,
      stringTension: 160,
      stringDensityGm: 4.0,
    });
    expect(normStr.waveSpeed).toBeCloseTo(200, 1);
    const mersRows = api.buildSweepRows({ waveMode: 'standing', stringMechanics: true, stringDensityGm: 4.0 }, 'mersenneTension', 1);
    expect(mersRows).toHaveLength(5);
    expect(mersRows[4].waveSpeed).toBeGreaterThan(mersRows[0].waveSpeed);

    const strMount = mountWaveDom({ waveMode: 'standing', standingBoundary: 'bothFixed', frequency: 2 });
    expect(strMount.host.querySelector('[data-wave-string-bench="true"]')).toBeTruthy();
    React.act(() => { strMount.host.querySelector('[data-wave-string-preset="violin_a4"]').click(); });
    expect(strMount.wave().stringMechanics).toBe(true);
    expect(strMount.wave().waveSpeed).toBeCloseTo(200, 1);
    expect(strMount.host.querySelector('[data-wave-mersenne-readout]').textContent).toContain('200.0 m/s');
    // Disengage on medium preset click
    React.act(() => { strMount.host.querySelector('[data-wave-medium="water"]').click(); });
    expect(strMount.wave().stringMechanics).toBe(false);
    expect(strMount.wave().waveSpeed).toBe(1482);

    // Verify Mersenne T vs v Analyze axis & dynamic table column
    React.act(() => { strMount.host.querySelector('[data-wave-tab="analyze"]').click(); });
    React.act(() => { strMount.host.querySelector('[data-wave-ds-plot="mersenneTension"]').click(); });
    React.act(() => { strMount.host.querySelector('[data-wave-run-sweep="true"]').click(); });
    expect(strMount.host.querySelector('[data-wave-log-table] thead').textContent).toContain('T (N)');

    // 2. Ripple N-Slit Diffraction Grating + Phased-Array Steering + Probe Readout
    expect(api.gratingIntensityFactor(0, 2, 5, 0)).toBeCloseTo(1, 5);
    expect(api.gratingIntensityFactor(0.125, 2, 4, 0)).toBeCloseTo(0, 4);
    const gratingProbe = api.computeProbeReadout({
      waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 5, probeEnabled: true, probeX: 0.7, probeY: 0.5,
    });
    expect(gratingProbe.gratingIntensityNorm).toBeGreaterThanOrEqual(0);
    expect(gratingProbe.gratingIntensityNorm).toBeLessThanOrEqual(1);

    const gratMount = mountWaveDom({ waveMode: 'ripple', rippleBarrier: 'doubleSlit' });
    React.act(() => { gratMount.host.querySelector('[data-wave-ripple-barrier="grating"]').click(); });
    React.act(() => { gratMount.host.querySelector('[data-wave-grating-slits="5"]').click(); });
    expect(gratMount.wave().gratingSlits).toBe(5);
    expect(gratMount.host.querySelector('[data-wave-grating-badge]').textContent).toContain('5 slits');
    expect(gratMount.host.querySelector('[data-wave-phased-array-controls]')).toBeTruthy();

    // 3. Free Counter-Propagating Pulse Collision
    const colOpp = api.evalPulseCollision(0.5, 0.5, 'opposite');
    const colSame = api.evalPulseCollision(0.5, 0.5, 'same');
    expect(colOpp.c1).toBeCloseTo(0.5, 4);
    expect(colOpp.c2).toBeCloseTo(0.5, 4);
    expect(Math.abs(colOpp.yNet)).toBeLessThan(1e-6);
    expect(colSame.yNet).toBeCloseTo(2.0, 4);

    const colMount = mountWaveDom({ waveMode: 'free', paused: false });
    React.act(() => { colMount.host.querySelector('[data-wave-packet-mode="collide"]').click(); });
    expect(colMount.wave().packetMode).toBe('collide');
    React.act(() => { colMount.host.querySelector('[data-wave-collide-polarity="same"]').click(); });
    expect(colMount.wave().collidePolarity).toBe('same');
    React.act(() => { colMount.host.querySelector('[data-wave-collide-snap="true"]').click(); });
    expect(colMount.wave().paused).toBe(true);

    // 4. Spectrum Harmonic Filter Bench + Web Audio PeriodicWave
    expect(api.filterHarmonicGain(3, 'lowpass', 3)).toBe(1);
    expect(api.filterHarmonicGain(4, 'lowpass', 3)).toBe(0);
    expect(api.filterHarmonicGain(2, 'oddOnly', 3)).toBe(0);
    const specRaw = api.computeSpectrum({ waveType: 'square', frequency: 2, spectrumFilter: 'none' }, 12);
    const specLP = api.computeSpectrum({ waveType: 'square', frequency: 2, spectrumFilter: 'lowpass', filterCutoffHarmonic: 1 }, 12);
    expect(specLP.retainedEnergyPct).toBeLessThan(specRaw.retainedEnergyPct);
    expect(specLP.thdPct).toBeLessThan(specRaw.thdPct);
    expect(specLP.spectralCentroidHz).toBeCloseTo(2, 1);

    const prevAudioCtx = window.AudioContext;
    const periodicCalls = [];
    const oscMock = {
      type: 'sine',
      frequency: { value: 200, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      setPeriodicWave: vi.fn(),
    };
    window.AudioContext = vi.fn(function () {
      return {
        state: 'running',
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(function () { return oscMock; }),
        createGain: vi.fn(function () { return { gain: { value: 0.1, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; }),
        createPeriodicWave: vi.fn(function (r, i) { periodicCalls.push({ r, i }); return { r, i }; }),
        close: vi.fn(),
      };
    });
    try {
      const filtMount = mountWaveDom({
        waveMode: 'spectrum', waveType: 'square', spectrumFilter: 'lowpass', filterCutoffHarmonic: 2,
      });
      expect(filtMount.host.querySelector('[data-wave-filter-bench="true"]')).toBeTruthy();
      expect(filtMount.host.querySelector('[data-wave-canvas]').getAttribute('data-spectrum-filter')).toBe('lowpass');
      React.act(() => { filtMount.host.querySelector('button[aria-label="Toggle Sound"]').click(); });
      expect(periodicCalls.length).toBeGreaterThan(0);
      expect(periodicCalls[0].r).toHaveLength(13);
      expect(oscMock.setPeriodicWave).toHaveBeenCalled();
      React.act(() => { filtMount.host.querySelector('button[aria-label="Toggle Sound"]').click(); });
    } finally {
      window.AudioContext = prevAudioCtx;
    }

    // 5. Reflection Sonar Echo Badge
    const reflMetrics = api.computeWaveMetrics({ waveMode: 'reflection', waveSpeed: 343, wallFrac: 0.75 });
    expect(reflMetrics.sonarRangeMeters).toBeGreaterThan(0);
    expect(reflMetrics.sonarEchoMs).toBeGreaterThan(0);
    const reflMount = mountWaveDom({ waveMode: 'reflection' });
    expect(reflMount.host.querySelector('[data-wave-sonar-badge="true"]').textContent).toContain('Echo:');

    // 6. Snapshot Comparison & Restore Tray
    const snapMount = mountWaveDom({ waveMode: 'free', frequency: 2, amplitude: 50, waveSpeed: 343 });
    React.act(() => { snapMount.host.querySelector('[data-wave-snapshot-btn="true"]').click(); });
    expect(snapMount.wave().savedSnapshots).toHaveLength(1);
    expect(snapMount.host.querySelector('[data-wave-snapshots-tray="true"]')).toBeTruthy();

    React.act(() => { snapMount.host.querySelector('[data-wave-mode="standing"]').click(); });
    expect(snapMount.wave().waveMode).toBe('standing');
    const diff = api.compareSnapshot(snapMount.wave(), snapMount.wave().savedSnapshots[0]);
    expect(diff.deltaFreq).toBe(0);

    React.act(() => { snapMount.host.querySelector('[data-wave-snapshot-restore]').click(); });
    expect(snapMount.wave().waveMode).toBe('free');
    expect(snapMount.wave().frequency).toBe(2);

    React.act(() => { snapMount.host.querySelector('[data-wave-snapshot-delete]').click(); });
    expect(snapMount.wave().savedSnapshots).toHaveLength(0);
    expect(snapMount.host.querySelector('[data-wave-snapshots-tray="true"]')).toBeNull();

    // 7. Library deep-link for Wave 6 N-slit grating
    const libMount = mountWaveDom({ workspaceTab: 'library', expSection: 'diffraction' });
    React.act(() => { libMount.host.querySelector('[data-wave-try-sim="diff_grating_5slit"]').click(); });
    expect(libMount.wave().workspaceTab).toBe('explore');
    expect(libMount.wave().waveMode).toBe('ripple');
    expect(libMount.wave().rippleBarrier).toBe('grating');
    expect(libMount.wave().gratingSlits).toBe(5);
  });

  it('Wave 7 enhancements: Fresnel Brewster TM polarization, relativistic optical Doppler + H-alpha spectrograph, Young-Helmholtz pluck sculptor, thermal sound speed, Analyze sweeps & Reset/Snapshot coherence', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Pure Wave 7 Physics Helpers
    const thB = api.computeBrewsterAngle(0.6);
    expect(thB).toBeCloseTo(59.04, 1);
    const metS = api.computeWaveMetrics({ waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 's', medium2Ratio: 0.6, incidentAngleDeg: thB });
    const metP = api.computeWaveMetrics({ waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 'p', medium2Ratio: 0.6, incidentAngleDeg: thB });
    expect(metS.reflectedEnergyPct).toBeGreaterThan(10);
    expect(metP.reflectedEnergyPct).toBe(0);
    expect(metP.isBrewsterMatch).toBe(true);

    const rel = api.computeRelativisticDoppler(4, 0.6, 0);
    expect(rel.gamma).toBeCloseTo(1.25, 3);
    expect(rel.approachingFreq).toBeCloseTo(8.0, 2);
    expect(rel.recedingFreq).toBeCloseTo(2.0, 2);
    expect(rel.redshiftRec).toBeCloseTo(1.0, 3);
    expect(rel.hAlphaRecNm).toBeCloseTo(1312.6, 1);
    expect(rel.hAlphaAppNm).toBeCloseTo(328.15, 1);

    const relMet = api.computeWaveMetrics({ waveMode: 'doppler', dopplerRegime: 'relativistic', frequency: 4, sourceSpeed: 1.2 });
    expect(relMet.isSupersonic).toBe(false);
    expect(relMet.machAngleDeg).toBeNull();
    expect(relMet.relativisticGamma).toBeGreaterThan(3.0);

    const pluckHalf = api.computePluckWeights(0.5);
    expect(pluckHalf).toHaveLength(5);
    expect(pluckHalf[0]).toBe(1);
    expect(pluckHalf[1]).toBe(0);
    expect(pluckHalf[3]).toBe(0);
    const pluckThird = api.computePluckWeights(1 / 3);
    expect(pluckThird[2]).toBe(0);

    expect(api.computeAirSoundSpeed(0)).toBe(331.3);
    expect(api.computeAirSoundSpeed(20)).toBe(343.2);
    const normTherm = api.normalizeState({ waveMode: 'longitudinal', airTempCoupled: true, airTempC: 35 });
    expect(normTherm.waveSpeed).toBe(api.computeAirSoundSpeed(35));

    // 2. Reflection Brewster DOM & Snap Button
    const reflDom = mountWaveDom({ waveMode: 'reflection', medium2Ratio: 0.6, incidentAngleDeg: 15 });
    expect(reflDom.host.querySelector('[data-wave-snap-brewster="true"]')).toBeTruthy();
    React.act(() => { reflDom.host.querySelector('[data-wave-snap-brewster="true"]').click(); });
    expect(reflDom.wave().impedanceCoupled).toBe(true);
    expect(reflDom.wave().fresnelPolarization).toBe('p');
    expect(reflDom.wave().incidentAngleDeg).toBeCloseTo(59.04, 1);
    expect(reflDom.host.querySelector('[data-wave-brewster-match-badge="true"]')).toBeTruthy();
    expect(reflDom.host.querySelector('[data-wave-canvas]').getAttribute('data-fresnel-polarization')).toBe('p');
    expect(reflDom.host.querySelector('[data-wave-canvas]').getAttribute('data-brewster-match')).toBe('true');

    // 3. Relativistic Optical Doppler DOM & Spectrograph
    const dopDom = mountWaveDom({ waveMode: 'doppler', frequency: 4, sourceSpeed: 1.2 });
    expect(dopDom.host.querySelector('[data-wave-mach-badge="true"]')).toBeTruthy();
    React.act(() => { dopDom.host.querySelector('[data-wave-doppler-regime="relativistic"]').click(); });
    expect(dopDom.wave().dopplerRegime).toBe('relativistic');
    expect(dopDom.host.querySelector('[data-wave-mach-badge="true"]')).toBeNull();
    expect(dopDom.host.querySelector('[data-wave-relativistic-badges="true"]')).toBeTruthy();
    expect(dopDom.host.querySelector('[data-wave-halpha-spectrograph="true"]')).toBeTruthy();
    expect(dopDom.host.querySelector('[data-wave-canvas]').getAttribute('data-doppler-regime')).toBe('relativistic');

    // 4. Young-Helmholtz Pluck Sculptor & Standing -> Spectrum Bridge
    const standDom = mountWaveDom({ waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: 180, stringDensityGm: 2.0 });
    React.act(() => { standDom.host.querySelector('[data-wave-standing-to-spectrum="true"]').click(); });
    expect(standDom.wave().waveMode).toBe('spectrum');
    expect(standDom.wave().waveType).toBe('custom');
    expect(standDom.host.querySelector('[data-wave-pluck-sculptor="true"]')).toBeTruthy();
    React.act(() => { standDom.host.querySelector('[data-wave-pluck-preset="third"]').click(); });
    expect(standDom.wave().pluckPosition).toBe(0.33);
    expect(standDom.wave().harmonicWeights[2]).toBe(0);

    // 5. Thermal Speed of Sound Lab + Medium Override
    const longDom = mountWaveDom({ waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 2 });
    React.act(() => { longDom.host.querySelector('[data-wave-air-temp-toggle="true"]').click(); });
    expect(longDom.wave().airTempCoupled).toBe(true);
    expect(longDom.wave().waveSpeed).toBe(343.2);
    const tempSlider = longDom.host.querySelector('[data-wave-air-temp-slider="true"]');
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(tempSlider, '0');
      tempSlider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(longDom.wave().airTempC).toBe(0);
    expect(longDom.wave().waveSpeed).toBe(331.3);
    React.act(() => { longDom.host.querySelector('[data-wave-medium="water"]').click(); });
    expect(longDom.wave().airTempCoupled).toBe(false);
    expect(longDom.wave().waveSpeed).toBe(1482);

    // 6. Analyze Sweeps, Snapshot Round-Trip, Reset & Library Deep-Links
    const brewSweep = api.buildSweepRows({ medium2Ratio: 0.6 }, 'fresnelBrewster', 1);
    expect(brewSweep).toHaveLength(5);
    expect(brewSweep[3].reflectedEnergyPct).toBe(0);
    const tempSweep = api.buildSweepRows({}, 'airTempSpeed', 1);
    expect(tempSweep).toHaveLength(5);
    expect(tempSweep[1].airTempC).toBe(0);
    expect(tempSweep[1].waveSpeed).toBe(331.3);

    const w7Snap = mountWaveDom({ waveMode: 'reflection', impedanceCoupled: true, fresnelPolarization: 'p', dopplerRegime: 'relativistic', airTempCoupled: true, airTempC: 30, pluckPosition: 0.2 });
    React.act(() => { w7Snap.host.querySelector('[data-wave-snapshot-btn="true"]').click(); });
    React.act(() => { w7Snap.host.querySelector('[data-wave-reset-controls="true"]').click(); });
    expect(w7Snap.wave().fresnelPolarization).toBe('s');
    expect(w7Snap.wave().dopplerRegime).toBe('acoustic');
    expect(w7Snap.wave().airTempCoupled).toBe(false);
    expect(w7Snap.wave().airTempC).toBe(20);
    expect(w7Snap.wave().pluckPosition).toBe(0.5);
    React.act(() => { w7Snap.host.querySelector('[data-wave-snapshot-restore]').click(); });
    expect(w7Snap.wave().fresnelPolarization).toBe('p');
    expect(w7Snap.wave().dopplerRegime).toBe('relativistic');
    expect(w7Snap.wave().pluckPosition).toBe(0.2);

    [
      { sec: 'polarization', btn: 'pol_brewster_demo', field: 'fresnelPolarization', val: 'p' },
      { sec: 'doppler', btn: 'doppler_relativistic_halpha', field: 'dopplerRegime', val: 'relativistic' },
      { sec: 'wavespeed', btn: 'air_temp_sound_demo', field: 'airTempCoupled', val: true },
      { sec: 'music', btn: 'music_pluck_sculptor', field: 'pluckPosition', val: 0.5 },
    ].forEach((entry) => {
      const lm = mountWaveDom({ workspaceTab: 'library', expSection: entry.sec });
      React.act(() => { lm.host.querySelector('[data-wave-try-sim="' + entry.btn + '"]').click(); });
      expect(lm.wave().workspaceTab).toBe('explore');
      expect(lm.wave()[entry.field]).toBe(entry.val);
    });
  });

  it('Wave 8: computes Lorentzian resonator response, FTIR evanescent tunneling, Airy ocean dispersion, damping attenuation, sweeps & Library links', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. Pure Physics APIs
    const resPeak = api.computeResonatorResponse(1.0, 20, 'bothFixed', 2);
    expect(resPeak.isAtResonance).toBe(true);
    expect(resPeak.gainNorm).toBeGreaterThan(0.95);
    expect(resPeak.phaseLagDeg).toBeCloseTo(90, 0);
    expect(resPeak.fwhmHz).toBeCloseTo(0.1, 2);

    const resDetunedAbove = api.computeResonatorResponse(1.3, 20, 'bothFixed', 2);
    expect(resDetunedAbove.isAtResonance).toBe(false);
    expect(resDetunedAbove.gainNorm).toBeLessThan(0.25);
    expect(resDetunedAbove.phaseLagDeg).toBeGreaterThan(165);

    const resDetunedBelow = api.computeResonatorResponse(1.75, 20, 'bothFixed', 2);
    expect(resDetunedBelow.nearestMode).toBe(2);
    expect(resDetunedBelow.phaseLagDeg).toBeLessThan(15);

    const resOdd = api.computeResonatorResponse(1.5, 25, 'fixedFree', 2);
    expect(resOdd.isAtResonance).toBe(true);
    expect(resOdd.nearestMode).toBe(2);
    expect(api.computeResonatorResponse(3.0, 25, 'fixedFree', 2).isAtResonance).toBe(false);

    const noTir = api.computeEvanescentTunneling(171.5, 0.6, 20, true, 0.25);
    expect(noTir.isTIR).toBe(false);
    expect(noTir.penetrationLambda).toBeNull();
    expect(noTir.tunnelTransmission).toBe(0);

    const ftirTight = api.computeEvanescentTunneling(171.5, 1.5, 55, true, 0.10);
    const ftirWide = api.computeEvanescentTunneling(171.5, 1.5, 55, true, 1.00);
    expect(ftirTight.isTIR).toBe(true);
    expect(ftirTight.penetrationLambda).toBeGreaterThan(0.1);
    expect(ftirTight.tunnelTransmission).toBeGreaterThan(0.7);
    expect(ftirWide.tunnelTransmission).toBeLessThan(0.15);
    expect(ftirTight.ftirReflectivity * ftirTight.ftirReflectivity + ftirTight.tunnelTransmission).toBeCloseTo(1, 2);

    const ocShallow = api.computeOceanDispersion(0.03);
    const ocInter = api.computeOceanDispersion(0.18);
    const ocDeep = api.computeOceanDispersion(0.80);
    expect(ocShallow.regime).toBe('shallow');
    expect(ocShallow.vgOverVp).toBeGreaterThan(0.95);
    expect(ocInter.regime).toBe('intermediate');
    expect(ocDeep.regime).toBe('deep');
    expect(ocDeep.vgOverVp).toBeCloseTo(0.5, 2);

    const coupledNorm = api.normalizeState({ waveMode: 'free', packetMode: 'packet', oceanDepthCoupled: true, waterDepthRatio: 0.03 });
    expect(coupledNorm.dispersionRatio).toBeGreaterThan(0.95);

    const met = api.computeWaveMetrics({
      waveMode: 'standing',
      harmonic: 2,
      resonatorDriven: true,
      driveFreqRatio: 2.0,
      resonatorQ: 30,
      damping: true,
      dampingAlpha: 1.5,
      waveSpeed: 343
    });
    expect(met.resonatorIsPeak).toBe(true);
    expect(met.resonatorGainPct).toBeGreaterThan(95);
    expect(met.dampingLossDb).toBeGreaterThan(35);
    expect(met.dampingHalfEnergyMeters).toBeGreaterThan(10);

    // 2. Standing Resonator DOM & Snap
    const resDom = mountWaveDom({ waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 2 });
    expect(resDom.host.querySelector('[data-wave-resonator-bench="true"]')).toBeTruthy();
    expect(resDom.host.querySelector('svg[data-wave-resonance-curve="true"]')).toBeTruthy();
    React.act(() => { resDom.host.querySelector('[data-wave-resonator-snap="true"]').click(); });
    expect(resDom.wave().resonatorDriven).toBe(true);
    expect(resDom.wave().driveFreqRatio).toBe(2);
    expect(resDom.host.querySelector('[data-wave-canvas]').getAttribute('data-resonator-driven')).toBe('true');
    expect(resDom.host.querySelector('[data-wave-canvas]').getAttribute('data-resonator-is-peak')).toBe('true');

    // 3. Reflection FTIR Bench DOM
    const ftirDom = mountWaveDom({ waveMode: 'reflection', medium2Ratio: 0.6, incidentAngleDeg: 0 });
    expect(ftirDom.host.querySelector('[data-wave-ftir-bench="true"]')).toBeTruthy();
    React.act(() => { ftirDom.host.querySelector('[data-wave-ftir-toggle="true"]').click(); });
    expect(ftirDom.wave().ftirEnabled).toBe(true);
    expect(ftirDom.wave().medium2Ratio).toBeGreaterThan(1);
    const tTight = parseFloat(ftirDom.host.querySelector('[data-wave-canvas]').getAttribute('data-tunnel-transmission-pct'));
    React.act(() => { ftirDom.host.querySelector('[data-wave-ftir-preset="0.10"]').click(); });
    const tVeryTight = parseFloat(ftirDom.host.querySelector('[data-wave-canvas]').getAttribute('data-tunnel-transmission-pct'));
    React.act(() => { ftirDom.host.querySelector('[data-wave-ftir-preset="1.00"]').click(); });
    const tWide = parseFloat(ftirDom.host.querySelector('[data-wave-canvas]').getAttribute('data-tunnel-transmission-pct'));
    expect(tVeryTight).toBeGreaterThan(tTight);
    expect(tWide).toBeLessThan(tTight);

    // 4. Free Ocean Depth Bench & Damping Presets DOM
    const freeDom = mountWaveDom({ waveMode: 'free', packetMode: 'packet' });
    expect(freeDom.host.querySelector('[data-wave-ocean-bench="true"]')).toBeTruthy();
    React.act(() => { freeDom.host.querySelector('[data-wave-ocean-preset="shallow"]').click(); });
    expect(freeDom.wave().oceanDepthCoupled).toBe(true);
    expect(freeDom.wave().dispersionRatio).toBeGreaterThan(0.95);
    expect(freeDom.host.querySelector('[data-wave-ocean-readout="true"]').textContent).toContain('SHALLOW');
    React.act(() => { freeDom.host.querySelector('[data-wave-disp-preset="0.5"]').click(); });
    expect(freeDom.wave().oceanDepthCoupled).toBe(false);
    React.act(() => { freeDom.host.querySelector('input[aria-label="Enable damping"]').click(); });
    expect(freeDom.wave().damping).toBe(true);
    React.act(() => { freeDom.host.querySelector('[data-wave-damping-preset="heavy"]').click(); });
    expect(freeDom.wave().damping).toBe(true);
    expect(freeDom.wave().dampingAlpha).toBe(1.5);
    expect(freeDom.host.querySelector('[data-wave-damping-readout="true"]').textContent).toContain('dB');

    // 5. Analyze Sweeps, Reset, Snapshot & Wave 8 Library Deep-Links
    const resSweep = api.buildSweepRows({ harmonic: 2, resonatorQ: 25 }, 'resonanceCurve', 1);
    expect(resSweep).toHaveLength(5);
    expect(resSweep[2].resonatorGainPct).toBeGreaterThan(95);
    const ftirSweep = api.buildSweepRows({}, 'ftirTunneling', 1);
    expect(ftirSweep).toHaveLength(5);
    expect(ftirSweep[0].transmittedEnergyPct).toBeGreaterThan(ftirSweep[4].transmittedEnergyPct);

    const w8Snap = mountWaveDom({
      waveMode: 'standing',
      resonatorDriven: true,
      driveFreqRatio: 2.0,
      resonatorQ: 35,
      ftirEnabled: true,
      ftirGapLambda: 0.15,
      oceanDepthCoupled: true,
      waterDepthRatio: 0.08
    });
    React.act(() => { w8Snap.host.querySelector('[data-wave-snapshot-btn="true"]').click(); });
    React.act(() => { w8Snap.host.querySelector('[data-wave-reset-controls="true"]').click(); });
    expect(w8Snap.wave().resonatorDriven).toBe(false);
    expect(w8Snap.wave().ftirEnabled).toBe(false);
    expect(w8Snap.wave().oceanDepthCoupled).toBe(false);
    React.act(() => { w8Snap.host.querySelector('[data-wave-snapshot-restore]').click(); });
    expect(w8Snap.wave().resonatorDriven).toBe(true);
    expect(w8Snap.wave().ftirEnabled).toBe(true);
    expect(w8Snap.wave().oceanDepthCoupled).toBe(true);

    [
      { sec: 'harmonics', btn: 'harmonics_resonator', field: 'resonatorDriven', val: true },
      { sec: 'quantum', btn: 'quantum_tunneling', field: 'ftirEnabled', val: true },
      { sec: 'seismic', btn: 'seismic_refract', field: 'medium2Ratio', val: 1.6 },
      { sec: 'ocean', btn: 'ocean_tsunami_shallow', field: 'oceanDepthCoupled', val: true },
      { sec: 'shockwaves', btn: 'shockwave_mach15', field: 'sourceSpeed', val: 1.5 },
    ].forEach((entry) => {
      const lm = mountWaveDom({ workspaceTab: 'library', expSection: entry.sec });
      React.act(() => { lm.host.querySelector('[data-wave-try-sim="' + entry.btn + '"]').click(); });
      expect(lm.wave().workspaceTab).toBe('explore');
      expect(lm.wave()[entry.field]).toBe(entry.val);
    });
  });
});

describe('Wave 9: Consonance & Beat Envelope, Acoustic 1/r² Attenuation, Nodal Hyperbolas & Library Deep-Links', () => {
  it('computes just-intonation interval ratios, beat modulation depth, and phase cancellation cleanly', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;
    const fifth = api.computeBeatConsonance(4, 6, 50, 50, 0);
    expect(fifth.matchedInterval).toBe('3:2');
    expect(fifth.classification).toBe('consonant');
    expect(fifth.centsOff).toBe(0);
    expect(fifth.modDepthPct).toBe(100);

    const slowBeat = api.computeBeatConsonance(4, 4.5, 45, 45, 0);
    expect(slowBeat.beatFreqHz).toBe(0.5);
    expect(slowBeat.beatPeriodS).toBe(2);
    expect(slowBeat.classification).toBe('slow-beat');
    expect(slowBeat.modDepthPct).toBe(100);

    const cancel = api.computeBeatConsonance(3, 3, 50, 50, Math.PI);
    expect(cancel.matchedInterval).toBe('1:1');
    expect(cancel.classification).toBe('destructive');

    const normFifth = api.normalizeState({ frequency: 4, showSecond: true, intervalLock: '3:2', frequency2: 2 });
    expect(normFifth.frequency2).toBe(6);
    const normThird = api.normalizeState({ frequency: 4, showSecond: true, intervalLock: '5:4', frequency2: 2 });
    expect(normThird.frequency2).toBe(5);
  });

  it('computes 1/r² spherical vs 1/r cylindrical acoustic attenuation and preserves legacy soundLevelDb', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;
    const r1 = api.computeAcousticAttenuation(64, 50, 1, 'spherical');
    const r2 = api.computeAcousticAttenuation(64, 50, 2, 'spherical');
    const r4 = api.computeAcousticAttenuation(64, 50, 4, 'spherical');
    const r10 = api.computeAcousticAttenuation(64, 50, 10, 'spherical');
    expect(r1.dropDb).toBe(0);
    expect(r2.dropDb).toBeCloseTo(6.0, 1);
    expect(r4.dropDb).toBeCloseTo(12.0, 1);
    expect(r10.dropDb).toBeCloseTo(20.0, 1);

    const cyl4 = api.computeAcousticAttenuation(64, 50, 4, 'cylindrical');
    expect(cyl4.dropDb).toBeCloseTo(6.0, 1);
    expect(cyl4.amplitudeFactor).toBe(0.5);

    const met = api.computeWaveMetrics({ waveMode: 'longitudinal', longitudinalMode: 'traveling', amplitude: 50, distanceAttenuation: true, listenerDistMeters: 4, spreadingLaw: 'spherical' });
    expect(met.soundLevelDb).toBeCloseTo(64.0, 1);
    expect(met.attenuationDropDb).toBeCloseTo(12.0, 1);
    expect(met.attenuatedDb).toBeCloseTo(52.0, 1);

    const pNear = api.computeProbeReadout({ waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, amplitude: 60, probeEnabled: true, probeX: 0.0 });
    const pFar = api.computeProbeReadout({ waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, amplitude: 60, probeEnabled: true, probeX: 1.0 });
    expect(pFar.maxVelocity).toBeLessThan(pNear.maxVelocity * 0.2);

    const auNear = api.computeAudioParams({ waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: 1, amplitude: 60 });
    const auFar = api.computeAudioParams({ waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: 10, amplitude: 60 });
    expect(auFar.gain1).toBeLessThan(auNear.gain1);
  });

  it('computes Young fringe spacing and destructive nodal hyperbola geometry plus Wave 9 sweeps', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;
    const gNarrow = api.computeRippleInterferenceGeometry({ waveMode: 'ripple', rippleBarrier: 'doubleSlit', frequency: 4, rippleSeparation: 80 });
    const gWide = api.computeRippleInterferenceGeometry({ waveMode: 'ripple', rippleBarrier: 'doubleSlit', frequency: 4, rippleSeparation: 160 });
    expect(gWide.fringeSpacingPx).toBeLessThan(gNarrow.fringeSpacingPx);
    expect(gWide.nodalLineCount).toBeGreaterThanOrEqual(gNarrow.nodalLineCount);
    expect(gWide.nodalLineCount).toBe(gWide.nodalAnglesDeg.length * 2);

    const invSqSweep = api.buildSweepRows({ amplitude: 60, spreadingLaw: 'spherical' }, 'inverseSquareDb', 1);
    expect(invSqSweep).toHaveLength(5);
    expect(invSqSweep[4].attenuatedDb).toBeLessThan(invSqSweep[0].attenuatedDb);

    const youngSweep = api.buildSweepRows({ frequency: 4 }, 'youngFringeSpacing', 1);
    expect(youngSweep).toHaveLength(5);
    expect(youngSweep[4].rippleFringeSpacingPx).toBeLessThan(youngSweep[0].rippleFringeSpacingPx);
  });

  it('mounts Wave 9 benches, handles interval/distance/nodal controls, Snapshot/Reset, and all 8 Library deep-links', () => {
    // 1. Consonance & Beat Envelope bench
    const beatDom = mountWaveDom({ waveMode: 'free', showSecond: true, frequency: 2, amplitude: 45, amplitude2: 45 });
    expect(beatDom.host.querySelector('[data-wave-consonance-bench="true"]')).toBeTruthy();
    React.act(() => { beatDom.host.querySelector('[data-wave-interval-btn="3:2"]').click(); });
    expect(beatDom.wave().intervalLock).toBe('3:2');
    expect(beatDom.wave().frequency2).toBe(3);
    React.act(() => { beatDom.host.querySelector('[data-wave-beat-envelope-toggle="true"]').click(); });
    expect(beatDom.wave().showBeatEnvelope).toBe(true);
    expect(beatDom.host.querySelector('[data-wave-canvas]').getAttribute('data-show-beat-envelope')).toBe('true');

    // 2. Longitudinal 1/r² vs 1/r Distance Attenuation bench
    const distDom = mountWaveDom({ waveMode: 'longitudinal', longitudinalMode: 'traveling', amplitude: 60 });
    expect(distDom.host.querySelector('[data-wave-acoustic-dist-bench="true"]')).toBeTruthy();
    React.act(() => { distDom.host.querySelector('[data-wave-dist-atten-toggle="true"]').click(); });
    expect(distDom.wave().distanceAttenuation).toBe(true);
    expect(distDom.host.querySelector('[data-wave-canvas]').getAttribute('data-distance-attenuation')).toBe('true');
    React.act(() => { distDom.host.querySelector('[data-wave-spreading-law="cylindrical"]').click(); });
    expect(distDom.wave().spreadingLaw).toBe('cylindrical');
    expect(distDom.host.querySelector('[data-wave-dist-atten-readout="true"]').textContent).toContain('dB');

    // 3. Ripple Nodal Hyperbolas toggle & fringe telemetry
    const ripDom = mountWaveDom({ waveMode: 'ripple', rippleBarrier: 'doubleSlit', frequency: 4, rippleSeparation: 80 });
    expect(ripDom.host.querySelector('[data-wave-nodal-overlay-toggle="true"]')).toBeTruthy();
    React.act(() => { ripDom.host.querySelector('[data-wave-nodal-overlay-toggle="true"]').click(); });
    expect(ripDom.wave().showNodalLines).toBe(true);
    expect(ripDom.host.querySelector('[data-wave-canvas]').getAttribute('data-show-nodal-lines')).toBe('true');
    expect(ripDom.host.querySelector('[data-wave-ripple-fringe-readout="true"]').textContent).toContain('\u0394y');

    // 4. Snapshot & Reset preserve/restore Wave 9 fields
    const w9Snap = mountWaveDom({
      waveMode: 'longitudinal',
      longitudinalMode: 'traveling',
      distanceAttenuation: true,
      listenerDistMeters: 8,
      spreadingLaw: 'cylindrical',
      showBeatEnvelope: true,
      intervalLock: '3:2',
      showNodalLines: true
    });
    React.act(() => { w9Snap.host.querySelector('[data-wave-snapshot-btn="true"]').click(); });
    React.act(() => { w9Snap.host.querySelector('[data-wave-reset-controls="true"]').click(); });
    expect(w9Snap.wave().distanceAttenuation).toBe(false);
    expect(w9Snap.wave().listenerDistMeters).toBe(4);
    expect(w9Snap.wave().spreadingLaw).toBe('spherical');
    expect(w9Snap.wave().showBeatEnvelope).toBe(false);
    expect(w9Snap.wave().intervalLock).toBe('none');
    expect(w9Snap.wave().showNodalLines).toBe(false);
    React.act(() => { w9Snap.host.querySelector('[data-wave-snapshot-restore]').click(); });
    expect(w9Snap.wave().distanceAttenuation).toBe(true);
    expect(w9Snap.wave().listenerDistMeters).toBe(8);
    expect(w9Snap.wave().spreadingLaw).toBe('cylindrical');
    expect(w9Snap.wave().showBeatEnvelope).toBe(true);
    expect(w9Snap.wave().intervalLock).toBe('3:2');
    expect(w9Snap.wave().showNodalLines).toBe(true);

    // 5. All 8 new Reference Library deep-links
    [
      { sec: 'decibels', btn: 'decibels_attenuation', field: 'distanceAttenuation', val: true },
      { sec: 'noise', btn: 'noise_spectral_filter', field: 'spectrumFilter', val: 'lowpass' },
      { sec: 'animals', btn: 'animal_echolocation_sonar', field: 'packetMode', val: 'packet' },
      { sec: 'instrumentfreqs', btn: 'instrument_fifths_beats', field: 'intervalLock', val: '3:2' },
      { sec: 'lasers', btn: 'laser_grating_bench', field: 'showNodalLines', val: true },
      { sec: 'hearing', btn: 'ear_canal_resonator', field: 'standingBoundary', val: 'fixedFree' },
      { sec: 'medical', btn: 'ultrasound_tissue_echo', field: 'waveSpeed', val: 1500 },
      { sec: 'gravitational', btn: 'ligo_phase_canceller', field: 'phase2', val: 3.1416 },
    ].forEach((entry) => {
      const lm = mountWaveDom({ workspaceTab: 'library', expSection: entry.sec });
      const btn = lm.host.querySelector('[data-wave-try-sim="' + entry.btn + '"]');
      expect(btn).toBeTruthy();
      React.act(() => { btn.click(); });
      expect(lm.wave().workspaceTab).toBe('explore');
      expect(lm.wave()[entry.field]).toBe(entry.val);
    });
  });

  it('computes Wave 10 Nyquist/ADC sampling, standing y+/y- decomposition, off-axis Doppler & sweeps', () => {
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const api = window.StemLab._wave;

    // 1. ADC quantization & Nyquist-Shannon aliasing
    const q2A = api.quantizeAdcSample(0.61, 2);
    const q12A = api.quantizeAdcSample(0.61, 12);
    expect(Math.abs(q12A - 0.61)).toBeLessThan(Math.abs(q2A - 0.61));
    expect(api.quantizeAdcSample(5, 8)).toBeLessThan(1);
    expect(api.quantizeAdcSample(-5, 8)).toBeGreaterThan(-1);

    const nyqSafe = api.computeDigitalSampling(2, 8, 8);
    expect(nyqSafe.sampleRateHz).toBeCloseTo(16, 4);
    expect(nyqSafe.nyquistFreqHz).toBeCloseTo(8, 4);
    expect(nyqSafe.isFundamentalAliased).toBe(false);
    expect(nyqSafe.sqnrDb).toBeCloseTo(6.02 * 8 + 1.76, 1);

    const nyqAlias = api.computeDigitalSampling(4, 1.25, 4);
    expect(nyqAlias.sampleRateHz).toBeCloseTo(5, 4);
    expect(nyqAlias.nyquistFreqHz).toBeCloseTo(2.5, 4);
    expect(nyqAlias.isFundamentalAliased).toBe(true);
    expect(nyqAlias.aliasFreqHz).toBeCloseTo(1.0, 4);

    // 2. Standing counter-propagating traveling-wave decomposition across boundaries
    ['bothFixed', 'openOpen', 'fixedFree'].forEach((boundary) => {
      [0.2, 0.45, 0.75].forEach((u) => {
        const decomp = api.computeStandingDecomposition(u, 0.7, 2, boundary);
        expect(decomp.yForward + decomp.yBackward).toBeCloseTo(decomp.yStanding, 5);
        expect(decomp.potentialFrac + decomp.kineticFrac).toBeCloseTo(1, 5);
      });
    });

    // 3. Off-axis Doppler & relativistic transverse time-dilation redshift
    const dopHead = api.computeOffAxisDoppler(4, 0.5, 0, 'acoustic');
    expect(dopHead.radarCosinePct).toBeCloseTo(100, 2);
    expect(dopHead.observedFreqHz).toBeCloseTo(8, 2);

    const dopTransAcoustic = api.computeOffAxisDoppler(4, 0.5, 90, 'acoustic');
    expect(dopTransAcoustic.observedFreqHz).toBeCloseTo(4, 3);
    expect(dopTransAcoustic.isTransverseRedshift).toBe(false);

    const dopTransRel = api.computeOffAxisDoppler(4, 0.6, 90, 'relativistic');
    expect(dopTransRel.gamma).toBeCloseTo(1.25, 4);
    expect(dopTransRel.isTransverseRedshift).toBe(true);
    expect(dopTransRel.transverseFreqHz).toBeCloseTo(3.2, 2);
    expect(dopTransRel.observedFreqHz).toBeCloseTo(3.2, 2);

    // 4. Wave 10 Data Studio sweeps
    const adcSweep = api.buildSweepRows({ frequency: 2, sampleRateRatio: 8 }, 'adcBitSqnr', 1);
    expect(adcSweep).toHaveLength(5);
    expect(adcSweep.map((r) => r.adcBitDepth)).toEqual([2, 4, 8, 12, 16]);
    expect(adcSweep[4].adcSqnrDb).toBeGreaterThan(adcSweep[0].adcSqnrDb);

    const dopSweep = api.buildSweepRows({ frequency: 4, sourceSpeed: 0.6, dopplerRegime: 'relativistic' }, 'dopplerOffsetAngle', 1);
    expect(dopSweep).toHaveLength(5);
    expect(dopSweep.map((r) => r.dopplerOffsetAngleDeg)).toEqual([0, 30, 45, 60, 90]);
    expect(dopSweep[4].offAxisObsFreq).toBeLessThan(dopSweep[0].offAxisObsFreq);
    expect(dopSweep[4].offAxisObsFreq).toBeLessThan(4);
  });

  it('mounts Wave 10 benches, handles Nyquist/ADC, Traveling Decomposition, Off-Axis Doppler, Snapshot/Reset, and 8 Library deep-links', () => {
    // 1. Spectrum Nyquist & ADC Quantization Bench
    const specDom = mountWaveDom({ waveMode: 'spectrum', frequency: 4 });
    expect(specDom.host.querySelector('[data-wave-nyquist-bench="true"]')).toBeTruthy();
    React.act(() => { specDom.host.querySelector('[data-wave-nyquist-alias-demo="true"]').click(); });
    expect(specDom.wave().digitalSampling).toBe(true);
    expect(specDom.wave().sampleRateRatio).toBe(1.25);
    expect(specDom.wave().adcBitDepth).toBe(4);
    expect(specDom.host.querySelector('[data-wave-nyquist-readout="true"]').textContent).toContain('ALIAS');
    const specCanvas = specDom.host.querySelector('[data-wave-canvas]');
    expect(specCanvas.getAttribute('data-digital-sampling')).toBe('true');
    expect(specCanvas.getAttribute('data-sample-rate-ratio')).toBe('1.25');
    expect(specCanvas.getAttribute('data-adc-bit-depth')).toBe('4');

    // 2. Standing Counter-Propagating Decomposition Bench
    const standDom = mountWaveDom({ waveMode: 'standing', harmonic: 2 });
    expect(standDom.host.querySelector('[data-wave-traveling-decomp-bench="true"]')).toBeTruthy();
    React.act(() => { standDom.host.querySelector('[data-wave-traveling-decomp-toggle="true"]').click(); });
    expect(standDom.wave().showTravelingComponents).toBe(true);
    expect(standDom.host.querySelector('[data-wave-canvas]').getAttribute('data-show-traveling-components')).toBe('true');
    expect(standDom.host.querySelector('[data-wave-traveling-decomp-readout="true"]').textContent).toContain('PE');

    // 3. Doppler Off-Axis Observer & Transverse Redshift Bench
    const dopDom = mountWaveDom({ waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, frequency: 4 });
    expect(dopDom.host.querySelector('[data-wave-doppler-offset-bench="true"]')).toBeTruthy();
    React.act(() => { dopDom.host.querySelector('[data-wave-doppler-angle-preset="90"]').click(); });
    expect(dopDom.wave().dopplerOffsetAngleDeg).toBe(90);
    expect(dopDom.host.querySelector('[data-wave-canvas]').getAttribute('data-doppler-offset-angle')).toBe('90');
    expect(dopDom.host.querySelector('[data-wave-doppler-offset-readout="true"]').textContent).toContain('time-dilation redshift');

    // 4. Data Studio plot buttons & CSV export headers
    const dsDom = mountWaveDom({ workspaceTab: 'analyze', waveMode: 'spectrum', digitalSampling: true, adcBitDepth: 4, dopplerOffsetAngleDeg: 60 });
    expect(dsDom.host.querySelector('[data-wave-ds-plot="adcBitSqnr"]')).toBeTruthy();
    expect(dsDom.host.querySelector('[data-wave-ds-plot="dopplerOffsetAngle"]')).toBeTruthy();
    React.act(() => { dsDom.host.querySelector('[data-wave-ds-plot="adcBitSqnr"]').click(); });
    expect(dsDom.wave().dataStudioPlot).toBe('adcBitSqnr');

    // 5. Snapshot & Reset preserve/restore Wave 10 fields
    const w10Snap = mountWaveDom({
      waveMode: 'spectrum',
      digitalSampling: true,
      sampleRateRatio: 1.25,
      adcBitDepth: 4,
      showTravelingComponents: true,
      dopplerOffsetAngleDeg: 60,
    });
    React.act(() => { w10Snap.host.querySelector('[data-wave-snapshot-btn="true"]').click(); });
    React.act(() => { w10Snap.host.querySelector('[data-wave-reset-controls="true"]').click(); });
    expect(w10Snap.wave().digitalSampling).toBe(false);
    expect(w10Snap.wave().sampleRateRatio).toBe(8);
    expect(w10Snap.wave().adcBitDepth).toBe(8);
    expect(w10Snap.wave().showTravelingComponents).toBe(false);
    expect(w10Snap.wave().dopplerOffsetAngleDeg).toBe(0);
    React.act(() => { w10Snap.host.querySelector('[data-wave-snapshot-restore]').click(); });
    expect(w10Snap.wave().digitalSampling).toBe(true);
    expect(w10Snap.wave().sampleRateRatio).toBe(1.25);
    expect(w10Snap.wave().adcBitDepth).toBe(4);
    expect(w10Snap.wave().showTravelingComponents).toBe(true);
    expect(w10Snap.wave().dopplerOffsetAngleDeg).toBe(60);

    // 6. All 8 new Wave 10 Reference Library deep-links
    [
      { sec: 'types', btn: 'types_transverse_vs_longitudinal', field: 'showDisplacementCurve', val: true },
      { sec: 'quantities', btn: 'quantities_ruler_probe', field: 'showRuler', val: true },
      { sec: 'formulas', btn: 'formulas_standing_decomp', field: 'showTravelingComponents', val: true },
      { sec: 'spectrum', btn: 'em_spectrum_redshift', field: 'dopplerOffsetAngleDeg', val: 90 },
      { sec: 'colors', btn: 'colors_grating_dispersion', field: 'gratingSlits', val: 6 },
      { sec: 'recordings', btn: 'recordings_nyquist_adc', field: 'digitalSampling', val: true },
      { sec: 'cameras', btn: 'cameras_ar_lens_coating', field: 'antiReflectionCoating', val: true },
      { sec: 'satellites', btn: 'satellites_phased_downlink', field: 'distanceAttenuation', val: true },
    ].forEach((entry) => {
      const lm = mountWaveDom({ workspaceTab: 'library', expSection: entry.sec });
      const btn = lm.host.querySelector('[data-wave-try-sim="' + entry.btn + '"]');
      expect(btn).toBeTruthy();
      React.act(() => { btn.click(); });
      expect(lm.wave().workspaceTab).toBe('explore');
      expect(lm.wave()[entry.field]).toBe(entry.val);
    });
  });
});
