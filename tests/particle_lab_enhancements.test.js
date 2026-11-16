import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function findButton(container, substring) {
  return Array.from(container.querySelectorAll('button')).find((btn) =>
    String(btn.textContent || '').includes(substring),
  );
}

async function settle() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 25));
}

describe('Particle Lab 3D Wave 1 quantitative enhancements', () => {
  let host;
  let root;
  let latestToolData = {};
  let activeToolSpy;
  let activeTabSpy;
  let toastSpy;
  let copySpy;

  beforeEach(async () => {
    resetStemLab();
    copySpy = vi.fn().mockResolvedValue(true);
    window.alloCopyText = copySpy;
    activeToolSpy = vi.fn();
    activeTabSpy = vi.fn();
    toastSpy = vi.fn();

    const config = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      latestToolData = toolData;
      const ctx = makeCtx({
        toolData,
        setToolData,
        setStemLabTool: activeToolSpy,
        setStemLabTab: activeTabSpy,
        addToast: toastSpy,
      });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await settle();
    });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    delete window.alloCopyText;
  });

  it('computes exact Maxwell-Boltzmann speed triad and mass-independent equipartition KE', () => {
    const pure = window.__alloParticleLabPure;
    const sA = pure.maxwellSpeeds(300, 1);
    const sB = pure.maxwellSpeeds(300, 2.25);
    expect(sA.vMean / sA.vMp).toBeCloseTo(Math.sqrt(4 / Math.PI), 6);
    expect(sA.vRms / sA.vMp).toBeCloseTo(Math.sqrt(1.5), 6);
    expect(sA.vRms / sB.vRms).toBeCloseTo(1.5, 6);
    expect(sA.meanKineticEnergy).toBeCloseTo(300 / 80, 6);
    expect(sB.meanKineticEnergy).toBeCloseTo(sA.meanKineticEnergy, 6);
  });

  it('distinguishes ideal, repulsive excluded-volume, and attractive real-gas regimes', () => {
    const pure = window.__alloParticleLabPure;
    const dilute = pure.vanDerWaalsMetrics(0, 18, 24, 500, 0.36, 0);
    expect(dilute.regime).toBe('ideal');
    expect(dilute.z).toBeGreaterThan(0.95);
    expect(dilute.z).toBeLessThan(1.08);

    const crowded = pure.vanDerWaalsMetrics(0, 7, 120, 400, 0.9, 0);
    expect(crowded.regime).toBe('repulsive');
    expect(crowded.z).toBeGreaterThan(1.08);

    const cohesive = pure.vanDerWaalsMetrics(0, 9, 80, 120, 0.36, 1.5);
    expect(cohesive.regime).toBe('attractive');
    expect(cohesive.z).toBeLessThan(0.92);

    const warmed = pure.vanDerWaalsMetrics(0, 10, 96, 700, 0.58, 1.15);
    expect(warmed.regime).toBe('ideal');
  });

  it('evaluates Graham Law speed ratios and generates high-linearity 5-point sweeps across all 6 axes', () => {
    const pure = window.__alloParticleLabPure;
    const graham = pure.grahamLawMetrics(
      { a: { mean: 3.0 }, b: { mean: 1.5 } },
      { coefficientA: 4.0, coefficientB: 1.0 },
      4.0, // clamps to max 3.0 -> sqrt(3) ~ 1.732
    );
    expect(graham.theoryRatio).toBeCloseTo(Math.sqrt(3), 5);
    expect(graham.observedSpeedRatio).toBeCloseTo(2.0, 5);
    expect(graham.observedDiffusionRatio).toBeCloseTo(2.0, 5);

    const exactGraham = pure.grahamLawMetrics(
      { a: { mean: Math.sqrt(2.25) }, b: { mean: 1.0 } },
      { coefficientA: 2.25, coefficientB: 1.0 },
      2.25,
    );
    expect(exactGraham.label).toContain('Matches Graham');

    expect(pure.PARTICLE_SWEEP_AXES).toHaveLength(6);
    for (const axis of pure.PARTICLE_SWEEP_AXES) {
      const rows = pure.buildParticleSweepRows(
        { preset: 'gas', temperature: 320, count: 64, boxSize: 12, particleDiameter: 0.5, attraction: 0, massRatioB: 1.5 },
        axis,
        1,
      );
      expect(rows).toHaveLength(5);
      const spec = pure.getParticleAxisSpec(axis);
      const pts = rows.map((row, i) => {
        const m = spec.mapRow(row, i);
        return { x: m.x, y: m.value };
      });
      const fit = pure.linearRegression(pts);
      expect(fit.valid).toBe(true);
      expect(fit.r2).toBeGreaterThan(0.97);
    }
  });

  it('sanitizes persisted experiment logs/snapshots and evaluates fair 1-variable snapshot deltas', () => {
    const pure = window.__alloParticleLabPure;
    const restoredLog = pure.restoreExperimentLog([
      null,
      { temperature: 'not-a-num', boxSize: 999, count: 9999, pressure: 4.2 },
    ]);
    expect(restoredLog).toHaveLength(1);
    expect(restoredLog[0].n).toBe(1);
    expect(restoredLog[0].boxSize).toBe(24);
    expect(restoredLog[0].count).toBe(160);

    const restoredSnaps = pure.restoreSavedSnapshots([
      { id: 's1', name: 'Hot', preset: 'invalid', temperature: 600, temperatureSetpoint: 600, count: 64, boxSize: 11, pressure: 4 },
      { id: 's2', name: 'Cold', preset: 'gas', temperature: 300, temperatureSetpoint: 300, count: 64, boxSize: 11, pressure: 2 },
    ]);
    expect(restoredSnaps).toHaveLength(2);
    expect(restoredSnaps[0].preset).toBe('gas');
    const delta = pure.compareSnapshots(restoredSnaps[1], restoredSnaps[0]);
    expect(delta.fair).toBe(true);
    expect(delta.changed).toEqual(['temperature']);
    expect(delta.temperatureDelta).toBe(300);
    expect(delta.pressureDelta).toBe(2);
  });

  it('renders quantitative workbench, supports sweep/CSV/Data Studio export, snapshots, evidence insertion, and Heat Lab handoff', async () => {
    expect(host.querySelector('#particle-quantitative-workbench')).not.toBeNull();
    const axisSelect = host.querySelector('#particle-sweep-axis-select');
    expect(axisSelect).not.toBeNull();

    // Change axis to gayLussacPT
    await act(async () => {
      axisSelect.value = 'gayLussacPT';
      axisSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.dataStudioAxis).toBe('gayLussacPT');

    // Run 5-pt sweep and log current state
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(5);

    await act(async () => {
      findButton(host, '+ Log State').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(6);

    // Export CSV
    await act(async () => {
      findButton(host, 'Copy CSV').click();
      await settle();
    });
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(copySpy.mock.calls[0][0]).toContain('Compressibility_Z');

    // Send to Data Studio
    await act(async () => {
      findButton(host, 'Send to Data Studio').click();
      await settle();
    });
    expect(latestToolData._dataStudio).toBeDefined();
    expect(latestToolData._dataStudio.dataSource).toBe('particleLab3d-log');
    expect(latestToolData._dataStudio.chartType).toBe('scatter');
    expect(latestToolData._dataStudio.showTrendline).toBe(true);
    expect(latestToolData._dataStudio.dataRows).toHaveLength(6);
    expect(activeToolSpy).toHaveBeenCalledWith('dataStudio');

    // Save two snapshots and verify comparison panel renders
    await act(async () => {
      findButton(host, 'Save Snapshot').click();
      await settle();
    });
    await act(async () => {
      findButton(host, 'Save Snapshot').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.savedSnapshots).toHaveLength(2);
    expect(host.textContent).toContain('Snapshot B minus A');

    // Insert evidence into Observation & Explain fields
    await act(async () => {
      findButton(host, '+ Insert chamber evidence').click();
      await settle();
      findButton(host, '+ Insert KMT & fit summary').click();
      await settle();
    });
    expect(host.querySelector('#particle-observation-input').value).toContain('Measured T=');
    expect(host.querySelector('#particle-conclusion-input').value).toContain('R²=');

    // Open Heat Lab bridge
    await act(async () => {
      findButton(host, 'Heat & Thermodynamics Lab').click();
      await settle();
    });
    expect(latestToolData._heatLab).toBeDefined();
    expect(latestToolData._heatLab.fromTool).toBe('particleLab3d');
    expect(activeToolSpy).toHaveBeenCalledWith('heatLab');
  });

  it('computes real-gas SI velocities, sound speed, heat capacity, and Graham ratios', () => {
    const pure = window.__alloParticleLabPure;
    const n2At300 = pure.gasSpeciesMetrics('N2', 'CO2', 300);
    expect(n2At300.a.vRmsSi).toBeCloseTo(516.86, 1);
    expect(n2At300.a.soundSpeedSi).toBeCloseTo(353.09, 1);
    expect(n2At300.a.molarInternalEnergyKj).toBeCloseTo(6.24, 2);

    const heVsO2 = pure.gasSpeciesMetrics('He', 'O2', 300);
    expect(heVsO2.siGrahamRatio).toBeCloseTo(Math.sqrt(31.998 / 4.0026), 4);
    expect(heVsO2.chamberMassRatioB).toBe(3);
    expect(heVsO2.massRatioClamped).toBe(true);

    const ch4VsO2 = pure.gasSpeciesMetrics('CH4', 'O2', 300);
    expect(ch4VsO2.massRatioClamped).toBe(false);
    expect(ch4VsO2.chamberMassRatioB).toBeCloseTo(1.99, 2);
  });

  it('classifies and computes First-Law deltaU, boundary work, heat Q, and entropy across canonical processes', () => {
    const pure = window.__alloParticleLabPure;
    // Isochoric heating: V constant -> W=0, Q = deltaU > 0
    const isochoric = pure.thermodynamicProcessMetrics(
      { temperature: 200, count: 72, boxSize: 11, volume: 1331, pressure: 0.90 },
      { temperature: 450, count: 72, boxSize: 11, volume: 1331, pressure: 2.03 },
    );
    expect(isochoric.processType).toBe('isochoric');
    expect(isochoric.workByGas).toBeCloseTo(0, 6);
    expect(isochoric.deltaU).toBeCloseTo(225, 3);
    expect(isochoric.heatQ).toBeCloseTo(225, 3);

    // Isobaric expansion: P constant, V doubles -> deltaU/Q = 0.6, W/Q = 0.4
    const isobaric = pure.thermodynamicProcessMetrics(
      { temperature: 250, count: 72, boxSize: 10, volume: 1000, pressure: 1.5 },
      { temperature: 500, count: 72, boxSize: Math.cbrt(2000), volume: 2000, pressure: 1.5 },
    );
    expect(isobaric.processType).toBe('isobaric');
    expect(isobaric.deltaU).toBeCloseTo(225, 3);
    expect(isobaric.workByGas).toBeCloseTo(150, 2);
    expect(isobaric.heatQ).toBeCloseTo(375, 2);
    expect(isobaric.workDirection).toBe('expansion');

    // Isothermal expansion: T constant -> deltaU = 0, Q = W > 0
    const isothermal = pure.thermodynamicProcessMetrics(
      { temperature: 300, count: 72, boxSize: 10, volume: 1000, pressure: 1.8 },
      { temperature: 300, count: 72, boxSize: 14, volume: 2744, pressure: (72 * 300) / (12 * 2744) },
    );
    expect(isothermal.processType).toBe('isothermal');
    expect(isothermal.deltaU).toBeCloseTo(0, 5);
    expect(isothermal.workByGas).toBeGreaterThan(150);
    expect(isothermal.heatQ).toBeCloseTo(isothermal.workByGas, 2);

    // Adiabatic monatomic compression: PV^(5/3) = const -> Q ~ 0, deltaS ~ 0
    const v1 = 2744;
    const v2 = 1000;
    const t1 = 240;
    const t2 = t1 * Math.pow(v1 / v2, 2 / 3);
    const p1 = (72 * t1) / (12 * v1);
    const p2 = (72 * t2) / (12 * v2);
    const adiabatic = pure.thermodynamicProcessMetrics(
      { temperature: t1, count: 72, boxSize: 14, volume: v1, pressure: p1 },
      { temperature: t2, count: 72, boxSize: 10, volume: v2, pressure: p2 },
    );
    expect(adiabatic.processType).toBe('adiabatic');
    expect(Math.abs(adiabatic.heatQ)).toBeLessThan(1.5);
    expect(Math.abs(adiabatic.entropyPerNk)).toBeLessThan(0.02);
    expect(adiabatic.workDirection).toBe('compression');
  });

  it('evaluates all 5 KMT challenges and safely checks questHook resilience', () => {
    const pure = window.__alloParticleLabPure;
    expect(pure.PARTICLE_CHALLENGES).toHaveLength(5);

    const mfpFail = pure.evaluateParticleChallenge('rarefied_mfp', pure.PARTICLE_CHALLENGES[2].stage);
    expect(mfpFail.passed).toBe(false);
    const mfpPass = pure.evaluateParticleChallenge('rarefied_mfp', { meanFreePath: 14.2 });
    expect(mfpPass.passed).toBe(true);

    const fitPass = pure.evaluateParticleChallenge('linear_law_fit', { logCount: 5, regressionR2: 0.996 });
    expect(fitPass.passed).toBe(true);

    const hook = window.StemLab._registry.particleLab3d.questHooks.find((q) => q.id === 'particle_kmt_challenge');
    expect(hook).toBeDefined();
    expect(hook.check({})).toBe(false);
    expect(hook.check({ completedChallenges: null })).toBe(false);
    expect(hook.progress({ completedChallenges: { boyle_squeeze: true } })).toBe('1/2');
    expect(hook.check({ completedChallenges: { boyle_squeeze: true, linear_law_fit: true } })).toBe(true);
  });

  it('supports real-gas profile application, P-V diagram presets, challenge verification, and Chemistry Lab handoff', async () => {
    expect(host.querySelector('#particle-real-gas-card')).not.toBeNull();
    expect(host.querySelector('#particle-thermo-card')).not.toBeNull();
    expect(host.querySelector('#particle-challenges-card')).not.toBeNull();

    // Select Helium and Apply Gas Profile
    const gasASelect = host.querySelector('#particle-gas-a-select');
    await act(async () => {
      gasASelect.value = 'He';
      gasASelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('He');
    expect(host.textContent).toContain('m/s');

    await act(async () => {
      findButton(host, 'Apply Gas Profile').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.particleDiameter).toBe(0.38);

    // Stage Adiabatic process in P-V card and verify SVG diagram updates cleanly
    await act(async () => {
      findButton(host, 'Adiabatic').click();
      await settle();
    });
    const pvSvg = host.querySelector('#particle-pv-diagram');
    expect(pvSvg).not.toBeNull();
    expect(pvSvg.getAttribute('aria-label')).toContain('Adiabatic');

    // Switch challenge to High-Precision Fit, run 5-pt Sweep, and verify mastery
    const chSelect = host.querySelector('#particle-challenge-select');
    await act(async () => {
      chSelect.value = 'linear_law_fit';
      chSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    await act(async () => {
      findButton(host, 'Verify Challenge').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.completedChallenges.linear_law_fit).toBe(true);
    expect(host.textContent).toContain('Mastered ✓');

    // Open Chemistry Lab bridge
    await act(async () => {
      findButton(host, 'Chemistry Lab').click();
      await settle();
    });
    expect(latestToolData.chemBalance).toBeDefined();
    expect(latestToolData.chemBalance.fromTool).toBe('particleLab3d');
    expect(latestToolData.chemBalance.sourceGasId).toBe('He');
    expect(activeToolSpy).toHaveBeenCalledWith('chemBalance');
  });

  it('computes Knudsen regimes, Maxwell viscosity theorem, and SI transport coefficients', () => {
    const pure = window.__alloParticleLabPure;
    const cont = pure.transportCoefficientsMetrics({ count: 500, boxSize: 6, particleDiameter: 1.4, temperature: 300 });
    const slip = pure.transportCoefficientsMetrics({ count: 220, boxSize: 7, particleDiameter: 0.9, temperature: 300 });
    const trans = pure.transportCoefficientsMetrics({ count: 64, boxSize: 11, particleDiameter: 0.58, temperature: 300 });
    const freeMol = pure.transportCoefficientsMetrics({ count: 10, boxSize: 18, particleDiameter: 0.36, temperature: 300 });

    expect(cont.regime).toBe('continuum');
    expect(slip.regime).toBe('slip');
    expect(trans.regime).toBe('transitional');
    expect(freeMol.regime).toBe('free_molecular');

    // Maxwell's density-independence theorem for bulk dilute gas viscosity
    const dilute = pure.transportCoefficientsMetrics({ temperature: 300, count: 40, boxSize: 14, particleDiameter: 0.58, gasId: 'N2', pressureAtm: 1 });
    const dense = pure.transportCoefficientsMetrics({ temperature: 300, count: 120, boxSize: 8, particleDiameter: 0.58, gasId: 'N2', pressureAtm: 0.1 });
    expect(dense.viscosityBulkModel).toBeCloseTo(dilute.viscosityBulkModel, 6);
    expect(dense.viscosityEffModel).toBeGreaterThan(dilute.viscosityEffModel);
    expect(dense.siDiffusionCm2S).toBeCloseTo(dilute.siDiffusionCm2S * 10, 4);
    expect(dilute.siViscosityMicroPaS).toBeGreaterThan(15);
    expect(dilute.siViscosityMicroPaS).toBeLessThan(22);

    const hot = pure.transportCoefficientsMetrics({ temperature: 1200, count: 40, boxSize: 14, particleDiameter: 0.58 });
    expect(hot.viscosityBulkModel / dilute.viscosityBulkModel).toBeCloseTo(2, 5);
  });

  it('computes Carnot, Otto, Brayton, and Stirling thermodynamic heat-engine cycles accurately', () => {
    const pure = window.__alloParticleLabPure;
    for (const cycleType of pure.CYCLE_TYPES) {
      const cyc = pure.thermodynamicCycleMetrics({ cycleType, tCold: 200, tHot: 640, compressionRatio: 3, count: 72, baseEdge: 15, gasId: 'N2' });
      expect(cyc.corners).toHaveLength(4);
      expect(cyc.legs).toHaveLength(4);
      expect(Math.abs(cyc.cycleDeltaU)).toBeLessThan(1e-6);
      expect(cyc.netWork).toBeGreaterThan(0);
      if (cycleType !== 'stirling') {
        expect(cyc.netWork).toBeCloseTo(cyc.qIn - cyc.qOutAbs, 5);
      }
    }

    const carnot = pure.thermodynamicCycleMetrics({ cycleType: 'carnot', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'N2' });
    expect(carnot.thermalEfficiency).toBeCloseTo(1 - 200 / 640, 6);
    expect(carnot.secondLawRatio).toBeCloseTo(1, 6);

    const ottoN2 = pure.thermodynamicCycleMetrics({ cycleType: 'otto', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'N2' });
    const ottoHe = pure.thermodynamicCycleMetrics({ cycleType: 'otto', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'He' });
    const ottoCH4 = pure.thermodynamicCycleMetrics({ cycleType: 'otto', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'CH4' });
    expect(ottoN2.thermalEfficiency).toBeCloseTo(1 - Math.pow(3, 1 - 1.4), 6);
    expect(ottoHe.thermalEfficiency).toBeGreaterThan(ottoN2.thermalEfficiency);
    expect(ottoN2.thermalEfficiency).toBeGreaterThan(ottoCH4.thermalEfficiency);

    const brayton = pure.thermodynamicCycleMetrics({ cycleType: 'brayton', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'N2' });
    expect(brayton.thermalEfficiency).toBeCloseTo(1 - Math.pow(3, 1 - 1.4), 6);

    const stirling = pure.thermodynamicCycleMetrics({ cycleType: 'stirling', tCold: 200, tHot: 640, compressionRatio: 3, gasId: 'N2' });
    expect(stirling.thermalEfficiency).toBeCloseTo(1 - 200 / 640, 6);
    expect(stirling.thermalEfficiency).toBeGreaterThan(stirling.unregeneratedEfficiency);
  });

  it('computes planetary atmospheric scale heights, Jeans escape, and 3D chamber gravity theory', () => {
    const pure = window.__alloParticleLabPure;
    const earthN2 = pure.barometricAtmosphereMetrics({ planetId: 'Earth', gasId: 'N2', tempMode: 'planet', chamberTempK: 288, chamberGravity: 1, chamberBoxSize: 10, chamberMassRatio: 1 });
    expect(earthN2.retention).toBe('geological');
    expect(earthN2.escapeRatio).toBeGreaterThan(20);
    expect(earthN2.scaleHeightKm).toBeGreaterThan(7.5);
    expect(earthN2.scaleHeightKm).toBeLessThan(9.5);
    expect(earthN2.chamberScaleHeightU).toBeCloseTo(1, 6);
    expect(earthN2.chamberTopOverBottom).toBeCloseTo(Math.exp(-10), 6);

    const moonHe = pure.barometricAtmosphereMetrics({ planetId: 'Moon', gasId: 'He', tempMode: 'planet', chamberGravity: 0 });
    expect(moonHe.retention).toBe('rapid_loss');
    expect(moonHe.escapeRatio).toBeLessThan(4);
    expect(moonHe.chamberScaleHeightU).toBe(Infinity);
    expect(moonHe.chamberTopOverBottom).toBe(1);

    const earthHotHe = pure.barometricAtmosphereMetrics({ planetId: 'Earth', gasId: 'He', tempMode: 'chamber', chamberTempK: 900 });
    expect(earthHotHe.retention).toBe('slow_leak');
    expect(earthHotHe.escapeRatio).toBeGreaterThanOrEqual(4);
    expect(earthHotHe.escapeRatio).toBeLessThan(6);
  });

  it('renders Wave 3 transport, cycle, and atmosphere cards with Solar System Lab bridge', async () => {
    expect(host.querySelector('#particle-transport-card')).not.toBeNull();
    expect(host.querySelector('#particle-cycle-card')).not.toBeNull();
    expect(host.querySelector('#particle-atmosphere-card')).not.toBeNull();
    expect(host.querySelector('#particle-knudsen-svg')).not.toBeNull();
    expect(host.querySelector('#particle-cycle-svg')).not.toBeNull();
    expect(host.querySelector('#particle-atmosphere-svg')).not.toBeNull();

    // SI pressure selection & Stage Ballistic Vacuum
    const pSelect = host.querySelector('#particle-transport-pressure-select');
    await act(async () => {
      pSelect.value = '0.1';
      pSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.transportPressureAtm).toBe(0.1);

    await act(async () => {
      findButton(host, 'Stage Ballistic Vacuum').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.count).toBe(24);
    expect(latestToolData.particleLab3d.boxSize).toBe(18);
    expect(toastSpy).toHaveBeenCalled();

    // Select Otto cycle & ratio 4x, then load Corner 3 into the chamber
    const cycleSelect = host.querySelector('#particle-cycle-type-select');
    const ratioSelect = host.querySelector('#particle-cycle-ratio-select');
    await act(async () => {
      cycleSelect.value = 'otto';
      cycleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      ratioSelect.value = '4';
      ratioSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.cycleType).toBe('otto');
    expect(latestToolData.particleLab3d.cycleCompressionRatio).toBe(4);
    expect(host.querySelector('#particle-cycle-svg').getAttribute('aria-label')).toContain('Otto');

    await act(async () => {
      findButton(host, 'Corner 3').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.thermostat).toBe(true);
    expect(latestToolData.particleLab3d.boxSize).toBe(9);
    expect(latestToolData.particleLab3d.temperature).toBe(640);

    // Select Mars, stage planet gravity & temperature, and open Solar System Lab bridge
    const planetSelect = host.querySelector('#particle-planet-select');
    await act(async () => {
      planetSelect.value = 'Mars';
      planetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      findButton(host, 'Stage Planet Gravity').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.planetId).toBe('Mars');
    expect(latestToolData.particleLab3d.gravity).toBe(0.25);
    expect(latestToolData.particleLab3d.temperature).toBe(210);

    await act(async () => {
      findButton(host, 'Solar System Lab').click();
      await settle();
    });
    expect(latestToolData.solarSystem).toBeDefined();
    expect(latestToolData.solarSystem.fromTool).toBe('particleLab3d');
    expect(latestToolData.solarSystem.sourcePlanetId).toBe('Mars');
    expect(activeToolSpy).toHaveBeenCalledWith('solarSystem');
  });

  it('computes NIST-accurate Sackur-Tetrode entropy, thermal de Broglie scaling, and Boltzmann tail fractions', () => {
    const pure = window.__alloParticleLabPure;
    const heStd = pure.statisticalMechanicsMetrics({ gasId: 'He', temperature: 298.15, pressureAtm: 1, count: 100, boxSize: 11, thresholdRatio: 2.5 });
    const arStd = pure.statisticalMechanicsMetrics({ gasId: 'Ar', temperature: 298.15, pressureAtm: 1, count: 100, boxSize: 11, thresholdRatio: 1.5 });
    const tailHigh = pure.statisticalMechanicsMetrics({ gasId: 'He', temperature: 298.15, pressureAtm: 1, count: 100, boxSize: 11, thresholdRatio: 6 });

    expect(heStd.regime).toBe('classical');
    expect(heStd.sTransMolarJMK).toBeCloseTo(126.05, 1);
    expect(arStd.sTransMolarJMK).toBeCloseTo(154.74, 1);
    expect(arStd.tailFraction).toBeGreaterThan(heStd.tailFraction);
    expect(heStd.tailFraction).toBeGreaterThan(tailHigh.tailFraction);

    const t300 = pure.statisticalMechanicsMetrics({ gasId: 'N2', temperature: 300 });
    const t1200 = pure.statisticalMechanicsMetrics({ gasId: 'N2', temperature: 1200 });
    expect(t300.thermalLambdaPm / t1200.thermalLambdaPm).toBeCloseTo(2, 5);

    const cryogenic = pure.statisticalMechanicsMetrics({ gasId: 'He', temperature: 4, pressureAtm: 20 });
    expect(['near_quantum', 'quantum_degenerate']).toContain(cryogenic.regime);
  });

  it('computes Arrhenius collision kinetics, Q10 thermal boost dominance, and steric proportionality', () => {
    const pure = window.__alloParticleLabPure;
    const base = pure.collisionKineticsMetrics({ gasAId: 'N2', gasBId: 'CO2', temperature: 300, activationEnergyKjMol: 45, stericFactor: 0.5 });
    const iso = pure.collisionKineticsMetrics({ gasAId: 'N2', gasBId: 'CO2', temperature: 300, activationEnergyKjMol: 45, stericFactor: 1 });
    expect(iso.rateConstantLMolS / base.rateConstantLMolS).toBeCloseTo(2, 6);
    expect(base.expBoost10K).toBeGreaterThan(1.5);
    expect(base.freqBoost10K).toBeLessThan(1.03);
    expect(base.q10Ratio).toBeCloseTo(base.expBoost10K * base.freqBoost10K, 5);

    // Check Arrhenius activation energy recovery from curvePoints after subtracting 0.5*ln(T)
    const pt200 = base.curvePoints.find((p) => p.tempK === 200);
    const pt650 = base.curvePoints.find((p) => p.tempK === 650);
    const adjSlope = ((pt650.lnK - 0.5 * Math.log(650)) - (pt200.lnK - 0.5 * Math.log(200))) / ((1 / 650) - (1 / 200));
    expect(-adjSlope * 8.314462618 / 1000).toBeCloseTo(45, 4);
  });

  it('computes Laplace vs Newton sound speeds, helium pitch shift, acoustic impedance, and Mach regimes', () => {
    const pure = window.__alloParticleLabPure;
    const n2 = pure.gasAcousticsMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, frequencyHz: 440, flowSpeedMs: 340 });
    const he = pure.gasAcousticsMetrics({ gasId: 'He', temperature: 300, pressureAtm: 1, frequencyHz: 440, flowSpeedMs: 340 });
    const xe = pure.gasAcousticsMetrics({ gasId: 'Xe', temperature: 300, pressureAtm: 1, frequencyHz: 440, flowSpeedMs: 340 });

    expect(n2.soundSpeedAdiabaticMs / n2.soundSpeedNewtonMs).toBeCloseTo(Math.sqrt(1.4), 6);
    expect(he.soundSpeedAdiabaticMs / he.soundSpeedNewtonMs).toBeCloseTo(Math.sqrt(5 / 3), 6);
    expect(he.pitchShiftVsN2).toBeGreaterThan(2.8);
    expect(n2.acousticImpedanceRayl).toBeCloseTo(n2.densityKgM3 * n2.soundSpeedAdiabaticMs, 5);
    expect(he.machRegime).toBe('subsonic');
    expect(n2.machRegime).toBe('transonic');
    expect(xe.machRegime).toBe('supersonic');
  });

  it('renders Wave 4 statistical mechanics, Arrhenius, and acoustics cards with Wave Lab bridge', async () => {
    expect(host.querySelector('#particle-statmech-card')).not.toBeNull();
    expect(host.querySelector('#particle-arrhenius-card')).not.toBeNull();
    expect(host.querySelector('#particle-acoustics-card')).not.toBeNull();
    expect(host.querySelector('#particle-boltzmann-tail-svg')).not.toBeNull();
    expect(host.querySelector('#particle-arrhenius-svg')).not.toBeNull();
    expect(host.querySelector('#particle-acoustics-svg')).not.toBeNull();

    // Threshold select & Stage Hot Tail (750 K)
    const threshSelect = host.querySelector('#particle-statmech-threshold-select');
    await act(async () => {
      threshSelect.value = '6';
      threshSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.statMechThreshold).toBe(6);

    await act(async () => {
      findButton(host, 'Stage Hot Tail (750 K)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.temperature).toBe(750);
    expect(latestToolData.particleLab3d.boxSize).toBe(12);
    expect(latestToolData.particleLab3d.count).toBe(80);

    // Arrhenius select & Stage Reactive Mix (600 K)
    const eaSelect = host.querySelector('#particle-ea-select');
    await act(async () => {
      eaSelect.value = '75';
      eaSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.arrheniusEaKj).toBe(75);
    expect(host.querySelector('#particle-arrhenius-svg').getAttribute('aria-label')).toContain('75 kilojoules per mole');

    await act(async () => {
      findButton(host, 'Stage Reactive Mix (600 K)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('diffusion');
    expect(latestToolData.particleLab3d.membrane).toBe(false);
    expect(latestToolData.particleLab3d.temperature).toBe(600);

    // Acoustics Helium preset & Wave Lab handoff
    await act(async () => {
      findButton(host, 'Preset Helium Sound').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('He');
    expect(latestToolData.particleLab3d.temperature).toBe(300);

    await act(async () => {
      findButton(host, 'Wave Lab').click();
      await settle();
    });
    expect(latestToolData.wave).toBeDefined();
    expect(latestToolData.wave.fromTool).toBe('particleLab3d');
    expect(latestToolData.wave.sourceGasId).toBe('He');
    expect(latestToolData.wave.soundSpeedMs).toBeGreaterThan(950);
    expect(activeToolSpy).toHaveBeenCalledWith('wave');
  });

  it('computes thermal Doppler broadening, mass/temperature scaling, and Voigt pressure regimes', () => {
    const pure = window.__alloParticleLabPure;
    const cold = pure.dopplerBroadeningMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 0.01, wavelengthNm: 589 });
    const hot = pure.dopplerBroadeningMetrics({ gasId: 'N2', temperature: 1200, pressureAtm: 0.01, wavelengthNm: 589 });
    const dense = pure.dopplerBroadeningMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 15, wavelengthNm: 589 });
    const he = pure.dopplerBroadeningMetrics({ gasId: 'He', temperature: 300, pressureAtm: 0.01, wavelengthNm: 589 });
    const xe = pure.dopplerBroadeningMetrics({ gasId: 'Xe', temperature: 300, pressureAtm: 0.01, wavelengthNm: 589 });

    expect(hot.dopplerFwhmPm / cold.dopplerFwhmPm).toBeCloseTo(2, 5);
    expect(he.dopplerFwhmPm / xe.dopplerFwhmPm).toBeCloseTo(Math.sqrt(131.29 / 4.0026), 4);
    expect(dense.collisionalFwhmGhz / cold.collisionalFwhmGhz).toBeCloseTo(1500, 4);
    expect(cold.regime).toBe('doppler_gaussian');
    expect(dense.regime).toBe('pressure_lorentzian');
    expect(dense.voigtFwhmGhz).toBeGreaterThan(dense.dopplerFwhmGhz);
  });

  it('computes Van der Waals critical constants, Joule-Thomson inversion, and Helium vs CO2 throttling', () => {
    const pure = window.__alloParticleLabPure;
    const he300 = pure.jouleThomsonPhaseMetrics({ gasId: 'He', temperature: 300, pressureAtm: 1, pressureDropAtm: 50 });
    const n2 = pure.jouleThomsonPhaseMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, pressureDropAtm: 20 });
    const co2Sub = pure.jouleThomsonPhaseMetrics({ gasId: 'CO2', temperature: 300, pressureAtm: 1, pressureDropAtm: 20 });
    const co2Cool = pure.jouleThomsonPhaseMetrics({ gasId: 'CO2', temperature: 350, pressureAtm: 1, pressureDropAtm: 20 });
    const co2Super = pure.jouleThomsonPhaseMetrics({ gasId: 'CO2', temperature: 350, pressureAtm: 90, pressureDropAtm: 20 });

    expect(he300.tCriticalK).toBeCloseTo(5.18, 1);
    expect(n2.tCriticalK).toBeCloseTo(126.15, 1);
    expect(co2Sub.tCriticalK).toBeCloseTo(303.8, 0);
    expect(n2.tInversionK / n2.tBoyleK).toBeCloseTo(2, 6);
    expect(he300.muJtKAtm).toBeLessThan(0);
    expect(he300.deltaTThrottleK).toBeGreaterThan(0);
    expect(he300.phaseRegime).toBe('jt_heating');
    expect(co2Sub.muJtKAtm).toBeGreaterThan(0);
    expect(co2Sub.deltaTThrottleK).toBeLessThan(0);
    expect(co2Sub.phaseRegime).toBe('subcritical');
    expect(co2Cool.phaseRegime).toBe('jt_cooling');
    expect(co2Super.phaseRegime).toBe('supercritical');
  });

  it('computes Hertz-Knudsen effusion conductance, binary enrichment factor, and cold-gas thruster Isp', () => {
    const pure = window.__alloParticleLabPure;
    const molVac = pure.effusionVacuumMetrics({ gasAId: 'He', gasBId: 'N2', temperature: 300, pressureAtm: 1e-4, boxSize: 11, orificeDiameterMm: 0.2 });
    const bigBox = pure.effusionVacuumMetrics({ gasAId: 'He', gasBId: 'N2', temperature: 300, pressureAtm: 1e-4, boxSize: 22, orificeDiameterMm: 0.2 });
    const jetN2 = pure.effusionVacuumMetrics({ gasAId: 'N2', gasBId: 'CO2', temperature: 300, pressureAtm: 1, boxSize: 11, orificeDiameterMm: 0.5 });
    const jetHe = pure.effusionVacuumMetrics({ gasAId: 'He', gasBId: 'CO2', temperature: 300, pressureAtm: 1, boxSize: 11, orificeDiameterMm: 0.5 });

    expect(molVac.flowRegime).toBe('molecular_effusion');
    expect(molVac.pumpDownTauBS / molVac.pumpDownTauAS).toBeCloseTo(molVac.separationFactorAB, 5);
    expect(bigBox.pumpDownTauAS / molVac.pumpDownTauAS).toBeCloseTo(8, 5);
    expect(jetN2.flowRegime).toBe('choked_jet');
    expect(jetN2.specificImpulseS).toBeCloseTo(80.5, 0);
    expect(jetHe.specificImpulseS).toBeGreaterThan(jetN2.specificImpulseS);
  });

  it('renders Wave 5 spectroscopy, Joule-Thomson, and effusion cards with Optics and Space Station bridges', async () => {
    expect(host.querySelector('#particle-doppler-card')).not.toBeNull();
    expect(host.querySelector('#particle-joule-thomson-card')).not.toBeNull();
    expect(host.querySelector('#particle-effusion-card')).not.toBeNull();
    expect(host.querySelector('#particle-doppler-svg')).not.toBeNull();
    expect(host.querySelector('#particle-jt-svg')).not.toBeNull();
    expect(host.querySelector('#particle-effusion-svg')).not.toBeNull();

    // Spectral line select & Stage Hot Line (850 K)
    const lineSelect = host.querySelector('#particle-spectral-line-select');
    await act(async () => {
      lineSelect.value = '656.3';
      lineSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.spectralWavelengthNm).toBe(656.3);
    expect(host.querySelector('#particle-doppler-svg').getAttribute('aria-label')).toContain('656.3 nanometers');

    await act(async () => {
      findButton(host, 'Stage Hot Line (850 K)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.temperature).toBe(850);

    // JT drop select & Stage Subcritical Drop
    const jtSelect = host.querySelector('#particle-jt-drop-select');
    await act(async () => {
      jtSelect.value = '50';
      jtSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.jtPressureDropAtm).toBe(50);

    await act(async () => {
      findButton(host, 'Stage Subcritical Drop').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.boxSize).toBe(8);
    expect(latestToolData.particleLab3d.count).toBe(96);
    expect(latestToolData.particleLab3d.temperature).toBeLessThan(130);

    // Orifice select & Stage Selective Effusion
    const orificeSelect = host.querySelector('#particle-orifice-select');
    await act(async () => {
      orificeSelect.value = '2.5';
      orificeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.orificeDiameterMm).toBe(2.5);

    await act(async () => {
      findButton(host, 'Stage Selective Effusion').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('diffusion');
    expect(latestToolData.particleLab3d.membrane).toBe(true);
    expect(latestToolData.particleLab3d.permeability).toBe(0.28);
    expect(latestToolData.particleLab3d.temperature).toBe(380);

    // Optics Lab handoff
    await act(async () => {
      findButton(host, 'Optics Lab').click();
      await settle();
    });
    expect(latestToolData.opticsLab).toBeDefined();
    expect(latestToolData.opticsLab.fromTool).toBe('particleLab3d');
    expect(latestToolData.opticsLab.wavelengthNm).toBe(656.3);
    expect(activeToolSpy).toHaveBeenCalledWith('opticsLab');

    // Space Station Lab handoff
    await act(async () => {
      findButton(host, 'Space Station Lab').click();
      await settle();
    });
    expect(latestToolData.spaceStation).toBeDefined();
    expect(latestToolData.spaceStation.fromTool).toBe('particleLab3d');
    expect(latestToolData.spaceStation.orificeDiameterMm).toBe(2.5);
    expect(activeToolSpy).toHaveBeenCalledWith('spaceStation');
  });

  it('computes Stokes-Einstein diffusivity, Cunningham gas slip boost, and Perrin sedimentation scale height', () => {
    const pure = window.__alloParticleLabPure;
    const w250 = pure.brownianMotionMetrics({ temperature: 300, beadRadiusNm: 250, medium: 'water' });
    const w500 = pure.brownianMotionMetrics({ temperature: 300, beadRadiusNm: 500, medium: 'water' });
    const cytosol = pure.brownianMotionMetrics({ temperature: 300, beadRadiusNm: 250, medium: 'cytosol' });
    const aero50 = pure.brownianMotionMetrics({ temperature: 300, beadRadiusNm: 50, medium: 'chamber_gas', gasId: 'N2', pressureAtm: 1 });

    expect(w250.diffusivityUm2S / w500.diffusivityUm2S).toBeCloseTo(2, 5);
    expect(w250.perrinScaleHeightUm / w500.perrinScaleHeightUm).toBeCloseTo(8, 5);
    expect(w250.diffusivityUm2S).toBeGreaterThan(cytosol.diffusivityUm2S);
    expect(aero50.slipFactorCc).toBeGreaterThan(1.5);
    expect(aero50.diffusivityUm2S).toBeGreaterThan(w250.diffusivityUm2S);
  });

  it('computes Van t Hoff osmotic pressure, Staverman reflection scaling, tonicity, and RO desalination limit', () => {
    const pure = window.__alloParticleLabPure;
    const saline = pure.osmoticBiophysicsMetrics({ temperature: 310, molarityM: 0.15, vanTHoffI: 2, reflectionSigma: 1 });
    const halfLeak = pure.osmoticBiophysicsMetrics({ temperature: 310, molarityM: 0.15, vanTHoffI: 2, reflectionSigma: 0.5 });
    const seawater = pure.osmoticBiophysicsMetrics({ temperature: 298, molarityM: 0.5, vanTHoffI: 2, reflectionSigma: 1 });

    expect(saline.tonicity).toBe('isotonic');
    expect(saline.idealOsmoticAtm).toBeCloseTo(7.63, 1);
    expect(halfLeak.effectiveOsmoticAtm / saline.effectiveOsmoticAtm).toBeCloseTo(0.5, 5);
    expect(halfLeak.tonicity).toBe('hypotonic');
    expect(seawater.tonicity).toBe('hypertonic');
    expect(seawater.roMinEnergyKwhM3).toBeCloseTo(0.69, 1);
  });

  it('computes Paschen V-curve minimum, 1-atm N2 dielectric strength (~32 kV/cm), and plasma ignition', () => {
    const pure = window.__alloParticleLabPure;
    const airLowV = pure.paschenPlasmaMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, electrodeGapCm: 1, appliedVoltageV: 1000 });
    const airHighV = pure.paschenPlasmaMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, electrodeGapCm: 1, appliedVoltageV: 35000 });
    const neonGlow = pure.paschenPlasmaMetrics({ gasId: 'Ne', temperature: 340, pressureAtm: 0.01, electrodeGapCm: 1, appliedVoltageV: 1000 });
    const vac = pure.paschenPlasmaMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1e-5, electrodeGapCm: 0.2, appliedVoltageV: 35000 });

    expect(airLowV.breakdownVoltageV).toBeGreaterThan(29000);
    expect(airLowV.breakdownVoltageV).toBeLessThan(35000);
    expect(airLowV.regime).toBe('dielectric_gas');
    expect(airHighV.regime).toBe('glow_plasma');
    expect(neonGlow.regime).toBe('glow_plasma');
    expect(vac.regime).toBe('vacuum_standoff');
    expect(airHighV.debyeLengthUm).toBeGreaterThan(0);
  });

  it('renders Wave 6 Brownian, osmotic biophysics, and Paschen plasma cards with Cell and Magnetism bridges', async () => {
    expect(host.querySelector('#particle-brownian-card')).not.toBeNull();
    expect(host.querySelector('#particle-osmosis-biophysics-card')).not.toBeNull();
    expect(host.querySelector('#particle-plasma-card')).not.toBeNull();
    expect(host.querySelector('#particle-brownian-svg')).not.toBeNull();
    expect(host.querySelector('#particle-osmosis-svg')).not.toBeNull();
    expect(host.querySelector('#particle-plasma-svg')).not.toBeNull();

    // Brownian radius select & Stage Brownian Tracer
    const radSelect = host.querySelector('#particle-brownian-radius-select');
    await act(async () => {
      radSelect.value = '50';
      radSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.brownianBeadNm).toBe(50);

    await act(async () => {
      findButton(host, 'Stage Brownian Tracer').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('liquid');
    expect(latestToolData.particleLab3d.trace).toBe(true);

    // Osmotic molarity select & Stage Ideal Osmosis
    const molSelect = host.querySelector('#particle-osmotic-molarity-select');
    await act(async () => {
      molSelect.value = '0.5';
      molSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.osmoticMolarityM).toBe(0.5);

    await act(async () => {
      findButton(host, 'Stage Ideal Osmosis').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('osmosis');
    expect(latestToolData.particleLab3d.membraneSelectivity).toBe('a');
    expect(latestToolData.particleLab3d.temperature).toBe(310);

    // Discharge voltage select & Stage Neon Glow Tube
    const voltSelect = host.querySelector('#particle-discharge-voltage-select');
    await act(async () => {
      voltSelect.value = '5000';
      voltSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.appliedVoltageV).toBe(5000);

    await act(async () => {
      findButton(host, 'Stage Neon Glow Tube').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('Ne');
    expect(latestToolData.particleLab3d.transportPressureAtm).toBe(0.01);
    expect(latestToolData.particleLab3d.appliedVoltageV).toBe(1000);

    // Cell Biology Lab handoff
    await act(async () => {
      findButton(host, 'Cell Biology Lab').click();
      await settle();
    });
    expect(latestToolData.cell).toBeDefined();
    expect(latestToolData.cell.fromTool).toBe('particleLab3d');
    expect(latestToolData.cell.molarityM).toBe(0.5);
    expect(activeToolSpy).toHaveBeenCalledWith('cell');

    // Magnetism Lab handoff
    await act(async () => {
      findButton(host, 'Magnetism Lab').click();
      await settle();
    });
    expect(latestToolData.magnetism).toBeDefined();
    expect(latestToolData.magnetism.fromTool).toBe('particleLab3d');
    expect(latestToolData.magnetism.sourceGasId).toBe('Ne');
    expect(latestToolData.magnetism.ignited).toBe(true);
    expect(activeToolSpy).toHaveBeenCalledWith('magnetism');
  });

  it('computes Debye quantum phonon freeze-out and Lindemann melting threshold across crystals', () => {
    const pure = window.__alloParticleLabPure;
    const dia120 = pure.latticeSolidMetrics({ crystalId: 'Diamond', temperature: 120 });
    const dia300 = pure.latticeSolidMetrics({ crystalId: 'Diamond', temperature: 300 });
    const cu300 = pure.latticeSolidMetrics({ crystalId: 'Cu', temperature: 300 });
    const cu1100 = pure.latticeSolidMetrics({ crystalId: 'Cu', temperature: 1100 });
    const ar300 = pure.latticeSolidMetrics({ crystalId: 'Ar_solid', temperature: 300 });

    expect(dia120.regime).toBe('quantum_frozen');
    expect(dia120.cvFraction).toBeLessThan(0.05);
    expect(dia300.cvFraction).toBeLessThan(0.35);
    expect(cu300.regime).toBe('harmonic_solid');
    expect(cu300.cvFraction).toBeGreaterThan(0.9);
    expect(cu1100.regime).toBe('anharmonic_pre_melt');
    expect(ar300.melted).toBe(true);
    expect(ar300.regime).toBe('molten_fluid');
  });

  it('computes Clausius-Clapeyron vapor pressure, altitude boiling point depression, and dew point', () => {
    const pure = window.__alloParticleLabPure;
    const boil1Atm = pure.vaporPhaseEquilibriumMetrics({ liquidId: 'water', temperature: 373.15, pressureAtm: 1, relativeHumidityPct: 50 });
    const lowP = pure.vaporPhaseEquilibriumMetrics({ liquidId: 'water', temperature: 330, pressureAtm: 0.1, relativeHumidityPct: 50 });
    const satRh = pure.vaporPhaseEquilibriumMetrics({ liquidId: 'water', temperature: 330, pressureAtm: 1, relativeHumidityPct: 100 });
    const n2Warm = pure.vaporPhaseEquilibriumMetrics({ liquidId: 'nitrogen', temperature: 300, pressureAtm: 1, relativeHumidityPct: 50 });

    expect(boil1Atm.pSatAtm).toBeCloseTo(1, 2);
    expect(boil1Atm.boilingPointK).toBeCloseTo(373.15, 1);
    expect(boil1Atm.regime).toBe('boiling_coexistence');
    expect(lowP.boilingPointK).toBeLessThan(325);
    expect(lowP.dewPointK).toBeLessThan(lowP.temperature);
    expect(satRh.dewPointK).toBeCloseTo(satRh.temperature, 3);
    expect(n2Warm.supercritical).toBe(true);
    expect(n2Warm.regime).toBe('supercritical_fluid');
  });

  it('distinguishes IR-transparent homonuclear/noble gases from IR-active CO2/CH4 and computes IPCC logarithmic forcing', () => {
    const pure = window.__alloParticleLabPure;
    const n2 = pure.vibrationalGreenhouseMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, co2Ppm: 280 });
    const o2 = pure.vibrationalGreenhouseMetrics({ gasId: 'O2', temperature: 300, pressureAtm: 1, co2Ppm: 425 });
    const ar = pure.vibrationalGreenhouseMetrics({ gasId: 'Ar', temperature: 300, pressureAtm: 1, co2Ppm: 425 });
    const co2 = pure.vibrationalGreenhouseMetrics({ gasId: 'CO2', temperature: 305, pressureAtm: 1, co2Ppm: 560 });
    const ch4 = pure.vibrationalGreenhouseMetrics({ gasId: 'CH4', temperature: 300, pressureAtm: 1, co2Ppm: 425 });

    expect(n2.irActive).toBe(false);
    expect(o2.irActive).toBe(false);
    expect(ar.irActive).toBe(false);
    expect(n2.tyndallAbsorbancePct).toBe(0);
    expect(o2.tyndallAbsorbancePct).toBe(0);
    expect(ar.tyndallAbsorbancePct).toBe(0);
    expect(n2.forcingWm2).toBeCloseTo(0, 6);

    expect(co2.irActive).toBe(true);
    expect(co2.irActiveModes).toBe(3);
    expect(co2.totalModes).toBe(4);
    expect(co2.tyndallAbsorbancePct).toBeGreaterThan(0);
    expect(co2.forcingWm2).toBeCloseTo(3.71, 2);
    expect(co2.eqWarmingK).toBeCloseTo(3.0, 2);

    expect(ch4.irActive).toBe(true);
    expect(ch4.irActiveModes).toBe(6);
    expect(ch4.totalModes).toBe(9);
    expect(ch4.tyndallAbsorbancePct).toBeGreaterThan(0);
    expect(ch4.regime).toBe('potent_greenhouse');
  });

  it('renders Row 7 lattice, vapor equilibrium, and greenhouse IR cards, stages presets, and hands off to Semiconductor, Weather Systems, and Climate Explorer labs', async () => {
    expect(host.querySelector('#particle-lattice-solid-card')).not.toBeNull();
    expect(host.querySelector('#particle-vapor-equilibrium-card')).not.toBeNull();
    expect(host.querySelector('#particle-greenhouse-ir-card')).not.toBeNull();
    expect(host.querySelector('#particle-lattice-svg')).not.toBeNull();
    expect(host.querySelector('#particle-vapor-svg')).not.toBeNull();
    expect(host.querySelector('#particle-greenhouse-svg')).not.toBeNull();

    // Crystal select & Stage Cold Diamond (120 K)
    const crystalSelect = host.querySelector('#particle-crystal-select');
    await act(async () => {
      crystalSelect.value = 'Diamond';
      crystalSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.solidCrystalId).toBe('Diamond');

    await act(async () => {
      findButton(host, 'Stage Cold Diamond (120 K)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('solid');
    expect(latestToolData.particleLab3d.temperature).toBe(120);

    // Humidity select & Stage Vacuum Flash Boil
    const rhSelect = host.querySelector('#particle-humidity-select');
    await act(async () => {
      rhSelect.value = '75';
      rhSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.relativeHumidityPct).toBe(75);

    await act(async () => {
      findButton(host, 'Stage Vacuum Flash Boil').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.transportPressureAtm).toBe(0.1);
    expect(latestToolData.particleLab3d.preset).toBe('gas');

    // CO2 ppm select & Stage 2x CO2 Absorber
    const co2Select = host.querySelector('#particle-co2-ppm-select');
    await act(async () => {
      co2Select.value = '560';
      co2Select.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.co2MixingPpm).toBe(560);

    await act(async () => {
      findButton(host, 'Stage 2x CO2 Absorber').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('CO2');
    expect(latestToolData.particleLab3d.co2MixingPpm).toBe(560);

    // Semiconductor Lab handoff
    await act(async () => {
      findButton(host, 'Semiconductor Lab').click();
      await settle();
    });
    expect(latestToolData.semiconductor).toBeDefined();
    expect(latestToolData.semiconductor.fromTool).toBe('particleLab3d');
    expect(latestToolData.semiconductor.crystalId).toBe('Diamond');
    expect(activeToolSpy).toHaveBeenCalledWith('semiconductor');

    // Weather Systems Lab handoff
    await act(async () => {
      findButton(host, 'Weather Systems Lab').click();
      await settle();
    });
    expect(latestToolData.weatherSystems).toBeDefined();
    expect(latestToolData.weatherSystems.fromTool).toBe('particleLab3d');
    expect(latestToolData.weatherSystems.liquidId).toBe('water');
    expect(activeToolSpy).toHaveBeenCalledWith('weatherSystems');

    // Climate Explorer handoff
    await act(async () => {
      findButton(host, 'Climate Explorer').click();
      await settle();
    });
    expect(latestToolData.climateExplorer).toBeDefined();
    expect(latestToolData.climateExplorer.fromTool).toBe('particleLab3d');
    expect(latestToolData.climateExplorer.sourceGasId).toBe('CO2');
    expect(latestToolData.climateExplorer.co2Ppm).toBe(560);
    expect(activeToolSpy).toHaveBeenCalledWith('climateExplorer');
  });

  it('computes Rankine-Hugoniot shock jump relations, degree-of-freedom compression limits, and stagnation heating', () => {
    const pure = window.__alloParticleLabPure;
    const sub = pure.rankineHugoniotShockMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, machNumber: 0.8 });
    const mach3 = pure.rankineHugoniotShockMetrics({ gasId: 'N2', temperature: 300, pressureAtm: 1, machNumber: 3 });
    const ar = pure.rankineHugoniotShockMetrics({ gasId: 'Ar', temperature: 300, pressureAtm: 1, machNumber: 5 });
    const ch4 = pure.rankineHugoniotShockMetrics({ gasId: 'CH4', temperature: 300, pressureAtm: 1, machNumber: 5 });

    expect(sub.shockFormed).toBe(false);
    expect(sub.pressureRatio).toBe(1);
    expect(sub.densityRatio).toBe(1);
    expect(sub.regime).toBe('subsonic_isentropic');

    expect(mach3.shockFormed).toBe(true);
    expect(mach3.pressureRatio).toBeCloseTo(10.33, 2);
    expect(mach3.densityRatio).toBeCloseTo(3.86, 2);
    expect(mach3.downstreamMach).toBeCloseTo(0.475, 2);
    expect(mach3.downstreamMach).toBeLessThan(1);
    expect(mach3.stagnationTempK).toBeCloseTo(840, 1);
    expect(mach3.entropyJumpR).toBeGreaterThan(0);

    expect(ar.maxDensityRatio).toBeCloseTo(4, 5);
    expect(mach3.maxDensityRatio).toBeCloseTo(6, 5);
    expect(ch4.maxDensityRatio).toBeCloseTo(7, 5);
  });

  it('computes Gamow quantum tunneling peak energy, burn exponent, and UF6 gaseous cascade stages', () => {
    const pure = window.__alloParticleLabPure;
    const dt15 = pure.gamowNuclearKineticsMetrics({ fuelId: 'DT', plasmaTempKeV: 15 });
    const pB11 = pure.gamowNuclearKineticsMetrics({ fuelId: 'pB11', plasmaTempKeV: 15 });

    expect(dt15.gamowPeakKeV).toBeCloseTo(40.5, 0);
    expect(dt15.gamowPeakKeV).toBeLessThan(dt15.fuel.coulombBarrierKeV);
    expect(dt15.tauGamow).toBeCloseTo(8.1, 1);
    expect(dt15.regime).toBe('thermonuclear_burn');
    expect(Math.max.apply(Math, dt15.curvePoints.map((pt) => pt.gamowPeakNorm))).toBeCloseTo(1, 2);
    expect(pB11.gamowEnergyKeV).toBeGreaterThan(dt15.gamowEnergyKeV);
    expect(dt15.uf6Alpha).toBeCloseTo(1.0043, 4);
    expect(dt15.uf6SymmetricStages).toBeGreaterThan(800);
  });

  it('computes Johnson-Nyquist RMS noise voltage, -174 dBm/Hz room-temperature noise floor, and Drude thermal-to-drift ratio', () => {
    const pure = window.__alloParticleLabPure;
    const floor1Hz = pure.thermalNoiseDrudeMetrics({ temperature: 290, resistanceOhm: 50, bandwidthHz: 1 });
    const k1 = pure.thermalNoiseDrudeMetrics({ temperature: 300, resistanceOhm: 1000, bandwidthHz: 20000 });
    const k100 = pure.thermalNoiseDrudeMetrics({ temperature: 300, resistanceOhm: 100000, bandwidthHz: 20000 });

    expect(floor1Hz.noisePowerDbm).toBeCloseTo(-174.0, 1);
    expect(k1.vRmsUv).toBeCloseTo(0.576, 2);
    expect(k100.vRmsUv / k1.vRmsUv).toBeCloseTo(10, 5);
    expect(k1.thermalToDriftRatio).toBeGreaterThan(100000);
  });

  it('renders Row 8 shock aerodynamics, Gamow nuclear, and Johnson thermal-noise cards and hands off to Flight Simulator, Nuclear Lab, and Circuit Simulator', async () => {
    expect(host.querySelector('#particle-shock-aero-card')).not.toBeNull();
    expect(host.querySelector('#particle-nuclear-gamow-card')).not.toBeNull();
    expect(host.querySelector('#particle-thermal-noise-card')).not.toBeNull();
    expect(host.querySelector('#particle-shock-aero-svg')).not.toBeNull();
    expect(host.querySelector('#particle-nuclear-gamow-svg')).not.toBeNull();
    expect(host.querySelector('#particle-thermal-noise-svg')).not.toBeNull();

    // Shock Mach select & Stage Mach 5 Hypersonic
    const machSelect = host.querySelector('#particle-shock-mach-select');
    await act(async () => {
      machSelect.value = '1.5';
      machSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.shockMachNumber).toBe(1.5);

    await act(async () => {
      findButton(host, 'Stage Mach 5 Hypersonic').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.shockMachNumber).toBe(5);
    expect(latestToolData.particleLab3d.temperature).toBe(860);

    // Gamow temperature select & Stage ITER D-T (15 keV)
    const kevSelect = host.querySelector('#particle-gamow-temp-select');
    await act(async () => {
      kevSelect.value = '100';
      kevSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.gamowTempKeV).toBe(100);

    await act(async () => {
      findButton(host, 'Stage ITER D-T (15 keV)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.fusionFuelId).toBe('DT');
    expect(latestToolData.particleLab3d.gamowTempKeV).toBe(15);

    // Noise resistance select & Stage Cryo 45 K Low-Noise
    const resSelect = host.querySelector('#particle-noise-resistance-select');
    await act(async () => {
      resSelect.value = '100000';
      resSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.noiseResistanceOhm).toBe(100000);

    await act(async () => {
      findButton(host, 'Stage Cryo 45 K Low-Noise').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.noiseResistanceOhm).toBe(50);
    expect(latestToolData.particleLab3d.temperature).toBe(45);

    // Flight Simulator handoff
    await act(async () => {
      findButton(host, 'Flight Simulator').click();
      await settle();
    });
    expect(latestToolData.flightSim).toBeDefined();
    expect(latestToolData.flightSim.fromTool).toBe('particleLab3d');
    expect(latestToolData.flightSim.machNumber).toBe(5);
    expect(activeToolSpy).toHaveBeenCalledWith('flightSim');

    // Nuclear Physics Lab handoff
    await act(async () => {
      findButton(host, 'Nuclear Physics Lab').click();
      await settle();
    });
    expect(latestToolData.nuclearLab).toBeDefined();
    expect(latestToolData.nuclearLab.fromTool).toBe('particleLab3d');
    expect(latestToolData.nuclearLab.fuelId).toBe('DT');
    expect(activeToolSpy).toHaveBeenCalledWith('nuclearLab');

    // Circuit Simulator handoff
    await act(async () => {
      findButton(host, 'Circuit Simulator').click();
      await settle();
    });
    expect(latestToolData.circuit).toBeDefined();
    expect(latestToolData.circuit.fromTool).toBe('particleLab3d');
    expect(latestToolData.circuit.resistanceOhm).toBe(50);
    expect(activeToolSpy).toHaveBeenCalledWith('circuit');
  });

  it('computes interstellar Jeans collapse mass, isothermal sound speed, and thermal-pressure stability thresholds', () => {
    const pure = window.__alloParticleLabPure;
    const coldBok = pure.astroJeansSahaMetrics({ gasId: 'CO2', temperature: 45, cloudId: 'bok_globule' });
    const hotBok = pure.astroJeansSahaMetrics({ gasId: 'CO2', temperature: 450, cloudId: 'bok_globule' });
    const warmHe = pure.astroJeansSahaMetrics({ gasId: 'He', temperature: 520, cloudId: 'diffuse_hi' });

    expect(hotBok.jeansMassSolar / coldBok.jeansMassSolar).toBeCloseTo(Math.pow(10, 1.5), 4);
    expect(hotBok.isothermalSoundMs / coldBok.isothermalSoundMs).toBeCloseTo(Math.sqrt(10), 4);
    expect(coldBok.collapsing).toBe(true);
    expect(coldBok.collapseRatio).toBeGreaterThan(2);
    expect(coldBok.regime).toBe('fragmenting_collapse');
    expect(warmHe.collapsing).toBe(false);
    expect(warmHe.regime).toBe('pressure_supported');
    expect(coldBok.curvePoints).toHaveLength(25);
  });

  it('computes Cunningham slip settling velocity and Wells-Riley airborne transmission risk across droplet sizes and ACH', () => {
    const pure = window.__alloParticleLabPure;
    const fineStuffy = pure.aerosolWellsRileyMetrics({
      gasId: 'N2',
      temperature: 295,
      pressureAtm: 1,
      dropletDiameterUm: 0.5,
      ventilationAch: 0.5,
    });
    const fineClean = pure.aerosolWellsRileyMetrics({
      gasId: 'N2',
      temperature: 295,
      pressureAtm: 1,
      dropletDiameterUm: 0.5,
      ventilationAch: 12,
    });
    const ballistic = pure.aerosolWellsRileyMetrics({
      gasId: 'N2',
      temperature: 295,
      pressureAtm: 1,
      dropletDiameterUm: 80,
      ventilationAch: 0.5,
    });

    expect(fineStuffy.slipCc).toBeGreaterThan(1.2);
    expect(ballistic.slipCc).toBeCloseTo(1, 2);
    expect(fineStuffy.fallTime1p5mSec).toBeGreaterThan(3600);
    expect(ballistic.fallTime1p5mSec).toBeLessThan(10);
    expect(ballistic.regime).toBe('ballistic_droplet');
    expect(fineStuffy.regime).toBe('high_airborne_risk');
    expect(fineClean.wellsRileyRiskPct).toBeLessThan(fineStuffy.wellsRileyRiskPct * 0.25);
    expect(fineClean.regime).toBe('well_ventilated');
  });

  it('computes Langmuir surface coverage thermal swing and cubic Betz aerodynamic wind power limit', () => {
    const pure = window.__alloParticleLabPure;
    const cryoMof = pure.langmuirBetzEnergyMetrics({
      gasId: 'CH4',
      temperature: 90,
      pressureAtm: 10,
      sorbentId: 'mof5',
      windSpeedMs: 12,
    });
    const wind6 = pure.langmuirBetzEnergyMetrics({
      gasId: 'CH4',
      temperature: 90,
      pressureAtm: 10,
      sorbentId: 'mof5',
      windSpeedMs: 6,
    });
    const hotMof = pure.langmuirBetzEnergyMetrics({
      gasId: 'CH4',
      temperature: 520,
      pressureAtm: 1,
      sorbentId: 'mof5',
      windSpeedMs: 12,
    });

    expect(cryoMof.coverageTheta).toBeGreaterThan(0.9);
    expect(cryoMof.regime).toBe('monolayer_saturated');
    expect(cryoMof.langmuirKAtmInv).toBeGreaterThan(hotMof.langmuirKAtmInv);
    expect(hotMof.coverageTheta).toBeLessThan(0.25);
    expect(hotMof.regime).toBe('thermally_desorbed');
    expect(cryoMof.betzMaxWm2 / cryoMof.rawWindFluxWm2).toBeCloseTo(16 / 27, 6);
    expect(cryoMof.betzMaxWm2 / wind6.betzMaxWm2).toBeCloseTo(8, 5);
  });

  it('renders Row 9 cards, filters workbench domains with #particle-workbench-domain-nav, and hands off to Astronomy, Epidemic, and Renewables labs', async () => {
    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    expect(domainNav).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-stat-spectra')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-matter-frontier')).not.toBeNull();
    expect(host.querySelector('#particle-astro-jeans-card')).not.toBeNull();
    expect(host.querySelector('#particle-aerosol-epi-card')).not.toBeNull();
    expect(host.querySelector('#particle-energy-sorbent-card')).not.toBeNull();
    expect(host.querySelector('#particle-astro-jeans-svg')).not.toBeNull();
    expect(host.querySelector('#particle-aerosol-epi-svg')).not.toBeNull();
    expect(host.querySelector('#particle-energy-sorbent-svg')).not.toBeNull();

    // Domain filter buttons isolate each group
    await act(async () => {
      findButton(domainNav, 'Gas Laws & Cycles (9)').click();
      await settle();
    });
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-stat-spectra')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-matter-frontier')).toBeNull();

    await act(async () => {
      findButton(domainNav, 'Matter, Climate & Frontiers (9)').click();
      await settle();
    });
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-stat-spectra')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-matter-frontier')).not.toBeNull();
    expect(host.querySelector('#particle-astro-jeans-card')).not.toBeNull();

    await act(async () => {
      findButton(domainNav, 'All Modules').click();
      await settle();
    });
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-stat-spectra')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-matter-frontier')).not.toBeNull();

    // Row 9 controls & preset staging
    const cloudSelect = host.querySelector('#particle-astro-cloud-select');
    await act(async () => {
      cloudSelect.value = 'giant_molecular';
      cloudSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.astroCloudId).toBe('giant_molecular');

    await act(async () => {
      findButton(host, 'Stage Cold Bok Collapse').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.astroCloudId).toBe('bok_globule');
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('CO2');
    expect(latestToolData.particleLab3d.temperature).toBe(45);

    const achSelect = host.querySelector('#particle-ventilation-ach-select');
    await act(async () => {
      achSelect.value = '6';
      achSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.ventilationAch).toBe(6);

    await act(async () => {
      findButton(host, 'Stage 12 ACH Clean Air').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.ventilationAch).toBe(12);
    expect(latestToolData.particleLab3d.aerosolDropletUm).toBe(2.5);

    const sorbentSelect = host.querySelector('#particle-sorbent-select');
    await act(async () => {
      sorbentSelect.value = 'palladium';
      sorbentSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.sorbentSurfaceId).toBe('palladium');

    await act(async () => {
      findButton(host, 'Stage 90 K MOF Storage').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.sorbentSurfaceId).toBe('mof5');
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('CH4');
    expect(latestToolData.particleLab3d.temperature).toBe(90);

    // Bridge handoffs to Astronomy Lab, Epidemic Simulator, and Renewables Lab
    await act(async () => {
      findButton(host, 'Astronomy Lab').click();
      await settle();
    });
    expect(latestToolData.astronomy).toBeDefined();
    expect(latestToolData.astronomy.fromTool).toBe('particleLab3d');
    expect(latestToolData.astronomy.cloudId).toBe('bok_globule');
    expect(activeToolSpy).toHaveBeenCalledWith('astronomy');

    await act(async () => {
      findButton(host, 'Epidemic Simulator').click();
      await settle();
    });
    expect(latestToolData.epidemicSim).toBeDefined();
    expect(latestToolData.epidemicSim.fromTool).toBe('particleLab3d');
    expect(latestToolData.epidemicSim.ventilationAch).toBe(12);
    expect(activeToolSpy).toHaveBeenCalledWith('epidemicSim');

    await act(async () => {
      findButton(host, 'Renewables Lab').click();
      await settle();
    });
    expect(latestToolData.renewablesLab).toBeDefined();
    expect(latestToolData.renewablesLab.fromTool).toBe('particleLab3d');
    expect(latestToolData.renewablesLab.sorbentId).toBe('mof5');
    expect(activeToolSpy).toHaveBeenCalledWith('renewablesLab');
  });

  it("computes Henry's Law ocean gas solubility thermal outgassing, Sechenov salting-out, and scuba decompression supersaturation", () => {
    const pure = window.__alloParticleLabPure;
    const coldO2 = pure.henrysOceanSolubilityMetrics({ gasId: 'O2', temperature: 278.15, pressureAtm: 1, depthM: 0, salinityPsu: 0 });
    const warmO2 = pure.henrysOceanSolubilityMetrics({ gasId: 'O2', temperature: 303.15, pressureAtm: 1, depthM: 0, salinityPsu: 0 });
    const seaO2 = pure.henrysOceanSolubilityMetrics({ gasId: 'O2', temperature: 278.15, pressureAtm: 1, depthM: 0, salinityPsu: 35 });
    const co2Fresh = pure.henrysOceanSolubilityMetrics({ gasId: 'CO2', temperature: 298.15, pressureAtm: 1, depthM: 0, salinityPsu: 0 });
    const n2Fresh = pure.henrysOceanSolubilityMetrics({ gasId: 'N2', temperature: 298.15, pressureAtm: 1, depthM: 0, salinityPsu: 0 });
    const deepDive = pure.henrysOceanSolubilityMetrics({ gasId: 'N2', temperature: 291.15, pressureAtm: 1, depthM: 30, salinityPsu: 35 });

    expect(coldO2.dissolvedMgL).toBeGreaterThan(warmO2.dissolvedMgL);
    expect(coldO2.dissolvedMgL).toBeGreaterThan(seaO2.dissolvedMgL);
    expect(co2Fresh.dissolvedMmolL / n2Fresh.dissolvedMmolL).toBeGreaterThan(50);
    expect(deepDive.surfacingSupersatRatio).toBeGreaterThan(3.9);
    expect(deepDive.regime).toBe('bends_supersaturated');
    expect(coldO2.curvePoints).toHaveLength(25);
  });

  it('computes alveolar gas exchange, Hill-Bohr O2 saturation shift, high-altitude hypoxia, and CO2 Krogh diffusivity ratio', () => {
    const pure = window.__alloParticleLabPure;
    const seaLevel = pure.alveolarHillPhysiologyMetrics({ gasId: 'O2', temperature: 310.15, altitudeM: 0, bloodPh: 7.4 });
    const acidosis = pure.alveolarHillPhysiologyMetrics({ gasId: 'O2', temperature: 310.15, altitudeM: 0, bloodPh: 7.2 });
    const everest = pure.alveolarHillPhysiologyMetrics({ gasId: 'O2', temperature: 310.15, altitudeM: 8848, bloodPh: 7.6 });
    const co2Diff = pure.alveolarHillPhysiologyMetrics({ gasId: 'CO2', temperature: 310.15, altitudeM: 0, bloodPh: 7.4 });

    expect(seaLevel.alveolarPo2MmHg).toBeCloseTo(99.4, 0);
    expect(seaLevel.arterialSaO2Pct).toBeGreaterThan(96);
    expect(seaLevel.regime).toBe('normoxic_plateau');
    expect(everest.alveolarPo2MmHg).toBeLessThan(30);
    expect(everest.arterialSaO2Pct).toBeLessThan(75);
    expect(everest.regime).toBe('severe_hypoxia');
    expect(acidosis.p50MmHg).toBeGreaterThan(seaLevel.p50MmHg);
    expect(co2Diff.kroghRelToO2).toBeGreaterThan(20);
  });

  it('computes Arrhenius silicate melt viscosity, depth-dependent H2O volatile exsolution, and Plinian fragmentation', () => {
    const pure = window.__alloParticleLabPure;
    const basalt = pure.magmaVolatileExsolutionMetrics({ meltId: 'basalt', depthKm: 1, temperature: 300 });
    const shallowRhyolite = pure.magmaVolatileExsolutionMetrics({ meltId: 'rhyolite', depthKm: 0.2, temperature: 300 });
    const deepRhyolite = pure.magmaVolatileExsolutionMetrics({ meltId: 'rhyolite', depthKm: 8, temperature: 300 });

    expect(shallowRhyolite.viscosityPaS / basalt.viscosityPaS).toBeGreaterThan(1e5);
    expect(shallowRhyolite.gasVolFrac).toBeGreaterThan(deepRhyolite.gasVolFrac);
    expect(shallowRhyolite.fragmenting).toBe(true);
    expect(shallowRhyolite.regime).toBe('explosive_fragmentation');
    expect(shallowRhyolite.curvePoints).toHaveLength(25);
  });

  it('renders Row 10 modules, filters domains and connected-lab bridge categories, and hands off to Coral Reef, Anatomy, and Plate Tectonics labs', async () => {
    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    const bridgeNav = host.querySelector('#particle-bridge-category-nav');
    expect(domainNav).not.toBeNull();
    expect(bridgeNav).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-earth-ocean-phys')).not.toBeNull();
    expect(host.querySelector('#particle-henrys-ocean-card')).not.toBeNull();
    expect(host.querySelector('#particle-alveolar-physiology-card')).not.toBeNull();
    expect(host.querySelector('#particle-magma-volatiles-card')).not.toBeNull();
    expect(host.querySelector('#particle-henrys-ocean-svg')).not.toBeNull();
    expect(host.querySelector('#particle-alveolar-physiology-svg')).not.toBeNull();
    expect(host.querySelector('#particle-magma-volatiles-svg')).not.toBeNull();

    // 4th domain filter isolates Row 10
    await act(async () => {
      findButton(domainNav, 'Earth, Ocean & Physiology (3)').click();
      await settle();
    });
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-stat-spectra')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-matter-frontier')).toBeNull();
    expect(host.querySelector('#particle-workbench-group-earth-ocean-phys')).not.toBeNull();

    await act(async () => {
      findButton(domainNav, 'All Modules (30)').click();
      await settle();
    });
    expect(host.querySelector('#particle-workbench-group-gas-thermo')).not.toBeNull();
    expect(host.querySelector('#particle-workbench-group-earth-ocean-phys')).not.toBeNull();

    // Connected-lab bridge category filter
    await act(async () => {
      findButton(bridgeNav, 'Physics & Space (9)').click();
      await settle();
    });
    expect(findButton(host, 'Astronomy Lab')).toBeDefined();
    expect(findButton(host, 'Coral Reef Lab')).toBeUndefined();

    await act(async () => {
      findButton(bridgeNav, 'Chem, Tech & Data (6)').click();
      await settle();
    });
    expect(findButton(host, 'Renewables Lab')).toBeDefined();
    expect(findButton(host, 'Coral Reef Lab')).toBeUndefined();

    await act(async () => {
      findButton(bridgeNav, 'Earth, Ocean & Bio (7)').click();
      await settle();
    });
    expect(findButton(host, 'Coral Reef Lab')).toBeDefined();
    expect(findButton(host, 'Human Anatomy Lab')).toBeDefined();
    expect(findButton(host, 'Plate Tectonics Lab')).toBeDefined();

    await act(async () => {
      findButton(bridgeNav, 'All Bridges (22)').click();
      await settle();
    });
    expect(findButton(host, 'Astronomy Lab')).toBeDefined();
    expect(findButton(host, 'Coral Reef Lab')).toBeDefined();

    // Row 10 selects and preset buttons
    const salSelect = host.querySelector('#particle-ocean-salinity-select');
    await act(async () => {
      salSelect.value = '18';
      salSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.oceanSalinityPsu).toBe(18);

    await act(async () => {
      findButton(host, 'Stage 30m Scuba N2 Dive').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.oceanDepthM).toBe(30);
    expect(latestToolData.particleLab3d.oceanSalinityPsu).toBe(35);
    expect(latestToolData.particleLab3d.gasSpeciesA).toBe('N2');

    const altSelect = host.querySelector('#particle-alveolar-altitude-select');
    await act(async () => {
      altSelect.value = '5300';
      altSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.alveolarAltitudeM).toBe(5300);

    await act(async () => {
      findButton(host, 'Stage Everest Hypoxia').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.alveolarAltitudeM).toBe(8848);
    expect(latestToolData.particleLab3d.bloodPh).toBe(7.6);

    const meltSelect = host.querySelector('#particle-magma-melt-select');
    await act(async () => {
      meltSelect.value = 'andesite';
      meltSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(latestToolData.particleLab3d.magmaMeltId).toBe('andesite');

    await act(async () => {
      findButton(host, 'Stage Plinian Rhyolite').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.magmaMeltId).toBe('rhyolite');
    expect(latestToolData.particleLab3d.magmaDepthKm).toBe(0.2);

    // Cross-lab bridge handoffs
    await act(async () => {
      findButton(host, 'Coral Reef Lab').click();
      await settle();
    });
    expect(latestToolData.coralReef).toBeDefined();
    expect(latestToolData.coralReef.fromTool).toBe('particleLab3d');
    expect(latestToolData.coralReef.depthM).toBe(30);
    expect(activeToolSpy).toHaveBeenCalledWith('coralReef');

    await act(async () => {
      findButton(host, 'Human Anatomy Lab').click();
      await settle();
    });
    expect(latestToolData.anatomy).toBeDefined();
    expect(latestToolData.anatomy.fromTool).toBe('particleLab3d');
    expect(latestToolData.anatomy.altitudeM).toBe(8848);
    expect(activeToolSpy).toHaveBeenCalledWith('anatomy');

    await act(async () => {
      findButton(host, 'Plate Tectonics Lab').click();
      await settle();
    });
    expect(latestToolData.plateTectonics).toBeDefined();
    expect(latestToolData.plateTectonics.fromTool).toBe('particleLab3d');
    expect(latestToolData.plateTectonics.meltId).toBe('rhyolite');
    expect(latestToolData.plateTectonics.fragmenting).toBe(true);
    expect(activeToolSpy).toHaveBeenCalledWith('plateTectonics');
  });

  it('exposes 30 indexed workbench modules with keyword filtering and validates incoming handoff payloads', () => {
    const pure = window.__alloParticleLabPure;
    expect(Array.isArray(pure.WORKBENCH_MODULE_DIRECTORY)).toBe(true);
    expect(pure.WORKBENCH_MODULE_DIRECTORY).toHaveLength(30);
    expect(new Set(pure.WORKBENCH_MODULE_DIRECTORY.map((m) => m.id)).size).toBe(30);
    expect(new Set(pure.WORKBENCH_MODULE_DIRECTORY.map((m) => m.cardId)).size).toBe(30);

    // Every indexed module cardId is mounted by default when workbench is expanded on 'all'
    for (const mod of pure.WORKBENCH_MODULE_DIRECTORY) {
      expect(host.querySelector('#' + mod.cardId), `missing card #${mod.cardId}`).toBeTruthy();
    }

    const jeansMatches = pure.filterWorkbenchModules('jeans', 'all');
    expect(jeansMatches.map((m) => m.id)).toEqual(['planetary_atmosphere', 'interstellar_jeans']);
    expect(pure.filterWorkbenchModules('jeans collapse', 'all').map((m) => m.id)).toEqual(['interstellar_jeans']);

    const bohrMatches = pure.filterWorkbenchModules('bohr hypoxia', 'earth_ocean_phys');
    expect(bohrMatches.map((m) => m.id)).toEqual(['alveolar_hill_bohr']);
    expect(pure.filterWorkbenchModules('bohr hypoxia', 'gas_thermo')).toEqual([]);

    expect(pure.resolveIncomingHandoff({})).toBeNull();
    expect(pure.resolveIncomingHandoff({ fromTool: 'particleLab3d', sourceGasId: 'He' })).toBeNull();
    const resolved = pure.resolveIncomingHandoff({
      fromTool: 'molecule',
      sourceGasId: 'CO2',
      sourceTemperatureK: 2400, // clamps to max 900 K
      sourcePreset: 'gas',
      handoffId: 'h-test',
    });
    expect(resolved).toMatchObject({
      fromTool: 'molecule',
      fromLabel: 'Molecule Lab',
      gasId: 'CO2',
      temperatureK: 900,
      preset: 'gas',
      handoffKey: 'h-test',
    });
  });

  it('supports persisted filters, workbench collapse/search quick-jump, and Jump to Notebook', async () => {
    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    const bridgeNav = host.querySelector('#particle-bridge-category-nav');

    await act(async () => {
      findButton(domainNav, 'Matter, Climate & Frontiers (9)').click();
      findButton(bridgeNav, 'Physics & Space (9)').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.workbenchDomain).toBe('matter_frontier');
    expect(latestToolData.particleLab3d.bridgeCategory).toBe('physics_space');

    // Collapse workbench hides all 30 card groups
    const collapseBtn = host.querySelector('#particle-workbench-collapse-btn');
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');
    await act(async () => {
      collapseBtn.click();
      await settle();
    });
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#particle-lattice-solid-card')).toBeNull();

    // Search for a module outside the active domain, click quick-jump -> auto-expands and selects domain
    const searchInput = host.querySelector('#particle-workbench-search');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      setter.call(searchInput, 'alveolar');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
    });
    const resultsBox = host.querySelector('#particle-workbench-search-results');
    expect(resultsBox.textContent).toContain('1 matching module');
    const jumpCardBtn = findButton(resultsBox, 'Alveolar Gas');
    expect(jumpCardBtn).toBeTruthy();

    await act(async () => {
      jumpCardBtn.click();
      await settle();
    });
    expect(collapseBtn.getAttribute('aria-expanded')).toBe('true');
    expect(latestToolData.particleLab3d.workbenchDomain).toBe('earth_ocean_phys');
    expect(host.querySelector('#particle-alveolar-physiology-card')).toBeTruthy();

    // Jump to Notebook scrolls heading and focuses prediction input
    const nbTitle = host.querySelector('#particle-notebook-title');
    const scrollSpy = vi.fn();
    nbTitle.scrollIntoView = scrollSpy;
    await act(async () => {
      host.querySelector('#particle-jump-notebook-btn').click();
      await settle();
    });
    expect(scrollSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(host.querySelector('#particle-prediction-input'));
  });

  it('completes bidirectional cross-lab handoffs across Particle Lab 3D, Molecule Lab, and Chemistry Lab', async () => {
    // 1. Particle Lab 3D -> Molecule Lab carries active gas & temperature metadata
    const gasSelect = host.querySelector('#particle-gas-a-select');
    await act(async () => {
      gasSelect.value = 'CO2';
      gasSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      findButton(host, 'Inspect atoms and molecules in Molecule Lab').click();
      await settle();
    });
    expect(latestToolData.molecule).toMatchObject({
      moleculeMode: 'viewer',
      fromTool: 'particleLab3d',
      sourceGasId: 'CO2',
    });
    expect(typeof latestToolData.molecule.sourceTemperatureK).toBe('number');

    // 2. Particle Lab 3D incoming handoff banner applies imported state and dismisses
    const plConfig = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const handoffHost = document.createElement('div');
    document.body.appendChild(handoffHost);
    const handoffRoot = ReactDOMClient.createRoot(handoffHost);
    let handoffState = {};
    const HandoffPL = () => {
      const [td, setTd] = React.useState({
        particleLab3d: {
          fromTool: 'molecule',
          sourceGasId: 'He',
          sourceTemperatureK: 550,
          sourcePreset: 'gas',
          handoffId: 'mol-test-1',
        },
      });
      handoffState = td;
      return plConfig.render(makeCtx({ toolData: td, setToolData: setTd, addToast: toastSpy }));
    };
    await act(async () => {
      handoffRoot.render(React.createElement(HandoffPL));
      await settle();
    });
    const plBanner = handoffHost.querySelector('#particle-incoming-handoff-banner');
    expect(plBanner).toBeTruthy();
    expect(plBanner.textContent).toContain('Molecule Lab');
    expect(plBanner.textContent).toContain('550 K');

    await act(async () => {
      handoffHost.querySelector('#particle-apply-handoff-btn').click();
      await settle();
    });
    expect(handoffState.particleLab3d).toMatchObject({
      gasSpeciesA: 'He',
      temperature: 550,
      preset: 'gas',
      dismissedHandoffKey: 'mol-test-1',
    });
    expect(handoffHost.querySelector('#particle-incoming-handoff-banner')).toBeNull();
    act(() => handoffRoot.unmount());
    handoffHost.remove();

    // 3. Molecule Lab receives handoff from Particle Lab 3D and routes back from Gas Laws
    const molConfig = loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
    const molToolSpy = vi.fn();
    const molTabSpy = vi.fn();
    const molHost = document.createElement('div');
    document.body.appendChild(molHost);
    const molRoot = ReactDOMClient.createRoot(molHost);
    let molState = {};
    const MolHarness = () => {
      const [td, setTd] = React.useState({
        molecule: {
          fromTool: 'particleLab3d',
          sourceGasId: 'CO2',
          sourceTemperatureK: 420,
          handoffId: 'pl3d-mol-1',
        },
      });
      molState = td;
      return molConfig.render(makeCtx({ toolData: td, setToolData: setTd, setStemLabTool: molToolSpy, setStemLabTab: molTabSpy }));
    };
    await act(async () => {
      molRoot.render(React.createElement(MolHarness));
      await settle();
    });
    const molBanner = molHost.querySelector('#molecule-particle-handoff-banner');
    expect(molBanner).toBeTruthy();
    expect(molBanner.textContent).toContain('420 K');

    await act(async () => {
      molHost.querySelector('#molecule-apply-particle-handoff-btn').click();
      await settle();
    });
    expect(molState.molecule).toMatchObject({ expSection: 'gaslaws', referenceLibraryOpen: true, glGas: 'CO2', glT: 420 });

    const molToPlBtn = molHost.querySelector('#molecule-gaslaws-to-particlelab-btn');
    expect(molToPlBtn).toBeTruthy();
    await act(async () => {
      molToPlBtn.click();
      await settle();
    });
    expect(molState.particleLab3d).toMatchObject({ fromTool: 'molecule', sourceGasId: 'CO2', sourceTemperatureK: 420, sourcePreset: 'gas' });
    expect(molToolSpy).toHaveBeenCalledWith('particleLab3d');
    act(() => molRoot.unmount());
    molHost.remove();

    // 4. Chemistry Lab receives handoff from Particle Lab 3D and routes back cleanly
    const chemConfig = loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
    const chemToolSpy = vi.fn();
    const chemHost = document.createElement('div');
    document.body.appendChild(chemHost);
    const chemRoot = ReactDOMClient.createRoot(chemHost);
    let chemState = {};
    const ChemHarness = () => {
      const [td, setTd] = React.useState({
        chemBalance: {
          fromTool: 'particleLab3d',
          sourceGasId: 'O2',
          sourceTemperatureK: 360,
          sourceMolarMassGPerMol: 32,
          handoffId: 'pl3d-chem-1',
        },
      });
      chemState = td;
      return chemConfig.render(makeCtx({ toolData: td, setToolData: setTd, setStemLabTool: chemToolSpy }));
    };
    await act(async () => {
      chemRoot.render(React.createElement(ChemHarness));
      await settle();
    });
    const chemBanner = chemHost.querySelector('#chem-particle-handoff-banner');
    expect(chemBanner).toBeTruthy();
    expect(chemBanner.textContent).toContain('360 K');

    await act(async () => {
      chemHost.querySelector('#chem-open-gas-laws-handoff-btn').click();
      await settle();
    });
    expect(chemState.chemBalance.subtool).toBe('gas_laws');

    const chemToPlBtn = chemHost.querySelector('#chem-footer-particlelab-btn');
    expect(chemToPlBtn).toBeTruthy();
    await act(async () => {
      chemToPlBtn.click();
      await settle();
    });
    expect(chemState.particleLab3d).toMatchObject({ fromTool: 'chemBalance', sourceGasId: 'O2', sourceTemperatureK: 360, sourcePreset: 'gas' });
    expect(chemToolSpy).toHaveBeenCalledWith('particleLab3d');
    act(() => chemRoot.unmount());
    chemHost.remove();
  });

  it('enriches Socratic lab coach Gemini prompt with chamber gas, compressibility, and active domain', async () => {
    const plConfig = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const geminiSpy = vi.fn().mockResolvedValue('Good observation. How did higher temperature change wall pressure?');
    const coachHost = document.createElement('div');
    document.body.appendChild(coachHost);
    const coachRoot = ReactDOMClient.createRoot(coachHost);
    const CoachHarness = () => {
      const [td, setTd] = React.useState({
        particleLab3d: { gasSpeciesA: 'CO2', workbenchDomain: 'earth_ocean_phys', prediction: 'Pressure will rise with temperature.' },
      });
      return plConfig.render(makeCtx({ toolData: td, setToolData: setTd, aiHintsEnabled: true, callGemini: geminiSpy }));
    };
    await act(async () => {
      coachRoot.render(React.createElement(CoachHarness));
      await settle();
    });
    await act(async () => {
      findButton(coachHost, 'Ask lab coach').click();
      await settle();
    });
    expect(geminiSpy).toHaveBeenCalledTimes(1);
    const promptSent = String(geminiSpy.mock.calls[0][0]);
    expect(promptSent).toContain('Chamber gas: CO');
    expect(promptSent).toContain('Z=');
    expect(promptSent).toContain('Earth, Ocean & Physiology (3)');
    act(() => coachRoot.unmount());
    coachHost.remove();
  });

  it('exposes curated bundles, pin validation, applied frontier missions, and domain evidence helpers', () => {
    const pure = window.__alloParticleLabPure;
    expect(Array.isArray(pure.WORKBENCH_BUNDLES)).toBe(true);
    expect(pure.WORKBENCH_BUNDLES).toHaveLength(4);
    expect(pure.MAX_PINNED_WORKBENCH_MODULES).toBe(8);

    // Deduplication, invalid ID stripping, and 8-module cap
    expect(pure.restorePinnedWorkbenchIds(null)).toEqual([]);
    const restoredPins = pure.restorePinnedWorkbenchIds([
      'vdw_state',
      'invalid_id',
      'vdw_state',
      'parametric_sweep',
      'snapshot_tray',
      'real_gas_species',
      'first_law_pv',
      'kmt_challenges',
      'kinetic_transport',
      'heat_engine_cycle',
      'planetary_atmosphere',
    ]);
    expect(restoredPins).toHaveLength(8);
    expect(restoredPins).not.toContain('invalid_id');
    expect(restoredPins).not.toContain('planetary_atmosphere');

    // Applied Frontier Missions: baseline fail + solved pass for all 5 missions
    expect(pure.PARTICLE_CHALLENGES).toHaveLength(5);
    expect(pure.APPLIED_WORKBENCH_MISSIONS).toHaveLength(5);
    expect(pure.evaluateAppliedMission('titan_cryo_retention', { planetGravityMs2: 3.72, escapeRatio: 4.4 }).passed).toBe(false);
    expect(pure.evaluateAppliedMission('titan_cryo_retention', { planetGravityMs2: 1.35, escapeRatio: 8.2 }).passed).toBe(true);
    expect(pure.evaluateAppliedMission('joule_thomson_cryo', { deltaTThrottleK: -4.9 }).passed).toBe(false);
    expect(pure.evaluateAppliedMission('joule_thomson_cryo', { deltaTThrottleK: -12.4 }).passed).toBe(true);
    expect(pure.evaluateAppliedMission('clean_air_ventilation', { dropletDiameterUm: 2.5, wellsRileyRiskPct: 7.4 }).passed).toBe(false);
    expect(pure.evaluateAppliedMission('clean_air_ventilation', { dropletDiameterUm: 2.5, wellsRileyRiskPct: 1.5 }).passed).toBe(true);
    expect(pure.evaluateAppliedMission('bohr_tissue_unloading', { bloodPh: 7.4, arterialSaO2Pct: 97 }).passed).toBe(false);
    expect(pure.evaluateAppliedMission('bohr_tissue_unloading', { bloodPh: 7.2, arterialSaO2Pct: 91 }).passed).toBe(true);
    expect(pure.evaluateAppliedMission('plinian_magma_threshold', { magmaGasVolPct: 40, magmaLog10Viscosity: 3.5, magmaFragmenting: false }).passed).toBe(false);
    expect(pure.evaluateAppliedMission('plinian_magma_threshold', { magmaGasVolPct: 86, magmaLog10Viscosity: 8.2, magmaFragmenting: true }).passed).toBe(true);

    // Applied missions questHook null safety
    const mHook = window.StemLab._registry.particleLab3d.questHooks.find((q) => q.id === 'particle_applied_missions');
    expect(mHook).toBeDefined();
    expect(mHook.check({})).toBe(false);
    expect(mHook.check({ completedMissions: null })).toBe(false);
    expect(mHook.progress({ completedMissions: { clean_air_ventilation: true } })).toBe('1/2');
    expect(mHook.check({ completedMissions: { clean_air_ventilation: true, bohr_tissue_unloading: true } })).toBe(true);

    // Domain-aware notebook evidence formatter
    expect(pure.buildDomainEvidenceSnippet('earth_ocean_phys', { henryGasFormula: 'O2', dissolvedMgL: 9.1, arterialSaO2Pct: 97.4, magmaGasVolPct: 12 })).toContain('Earth & Physiology evidence');
    expect(pure.buildDomainEvidenceSnippet('matter_frontier', { crystalFormula: 'Cu', co2Ppm: 850, machNumber: 5, wellsRileyRiskPct: 1.5 })).toContain('Matter & Frontiers evidence');
    expect(pure.buildDomainEvidenceSnippet('stat_spectra', { sTransMolarJMK: 152, dopplerFwhmPm: 1.2, deltaTThrottleK: -9.5, effectiveOsmoticAtm: 7.5 })).toContain('Stat-Mech & Spectra evidence');
    expect(pure.buildDomainEvidenceSnippet('gas_thermo', { z: 0.98, vdwPressure: 2.1, knudsen: 0.05, scaleHeightKm: 8.5 })).toContain('Gas & Thermo evidence');
  });

  it('manages custom Pinned Workbench Deck, curated lesson bundles, and pin persistence', async () => {
    const pinBtn = host.querySelector('#particle-workbench-pin-btn');
    expect(pinBtn).toBeTruthy();
    expect(pinBtn.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      pinBtn.click();
      await settle();
    });
    expect(pinBtn.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#particle-workbench-pin-drawer')).toBeTruthy();

    await act(async () => {
      host.querySelector('#particle-bundle-human_bio_health').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.workbenchDomain).toBe('pinned');
    expect(latestToolData.particleLab3d.pinnedWorkbenchIds).toEqual([
      'brownian_perrin',
      'vant_hoff_osmosis',
      'wells_riley_aerosol',
      'alveolar_hill_bohr',
    ]);
    expect(host.querySelector('#particle-brownian-card')).toBeTruthy();
    expect(host.querySelector('#particle-osmosis-biophysics-card')).toBeTruthy();
    expect(host.querySelector('#particle-aerosol-epi-card')).toBeTruthy();
    expect(host.querySelector('#particle-alveolar-physiology-card')).toBeTruthy();
    expect(host.querySelector('#particle-vdw-state-card')).toBeNull();

    // Pin an additional module into the custom deck
    await act(async () => {
      host.querySelector('#particle-pin-mod-vdw_state').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.pinnedWorkbenchIds).toContain('vdw_state');
    expect(host.querySelector('#particle-vdw-state-card')).toBeTruthy();

    // Clearing pins falls back cleanly from 'pinned' to 'all'
    await act(async () => {
      host.querySelector('#particle-clear-pins-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.pinnedWorkbenchIds).toEqual([]);
    expect(latestToolData.particleLab3d.workbenchDomain).toBe('all');
  });

  it('tracks Applied Frontier Missions across workbench modules and persists mastery', async () => {
    await act(async () => {
      host.querySelector('#particle-challenge-track-applied').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.challengeTrack).toBe('applied');

    const missionSelect = host.querySelector('#particle-applied-mission-select');
    expect(missionSelect).toBeTruthy();
    await act(async () => {
      missionSelect.value = 'clean_air_ventilation';
      missionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });

    await act(async () => {
      host.querySelector('#particle-stage-mission-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.ventilationAch).toBe(0.5);
    expect(host.querySelector('#particle-challenges-card').textContent).toContain('In progress');

    await act(async () => {
      host.querySelector('#particle-jump-mission-module-btn').click();
      await settle();
    });
    const achSelect = host.querySelector('#particle-ventilation-ach-select');
    expect(achSelect).toBeTruthy();
    await act(async () => {
      achSelect.value = '12';
      achSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });

    await act(async () => {
      host.querySelector('#particle-verify-mission-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.completedMissions.clean_air_ventilation).toBe(true);
    expect(host.querySelector('#particle-challenges-card').textContent).toContain('Mastered ✓');
  });

  it('inserts active domain evidence into the notebook and recognizes sweep evidence offline', async () => {
    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    await act(async () => {
      findButton(domainNav, 'Earth, Ocean & Physiology (3)').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-insert-domain-evidence-btn').click();
      await settle();
    });
    const conclusionEl = host.querySelector('#particle-conclusion-input');
    expect(conclusionEl.value).toContain('Earth & Physiology evidence');
    expect(conclusionEl.value).toContain("Henry's Law");

    // Offline built-in coach treats 5-point parametric sweep as valid measurement evidence
    const plConfig = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const offlineHost = document.createElement('div');
    document.body.appendChild(offlineHost);
    const offlineRoot = ReactDOMClient.createRoot(offlineHost);
    const OfflineHarness = () => {
      const [td, setTd] = React.useState({
        particleLab3d: { prediction: 'Shrinking container increases pressure inversely.' },
      });
      return plConfig.render(makeCtx({ toolData: td, setToolData: setTd, aiHintsEnabled: false }));
    };
    await act(async () => {
      offlineRoot.render(React.createElement(OfflineHarness));
      await settle();
    });
    await act(async () => {
      findButton(offlineHost, '5-pt Sweep').click();
      await settle();
    });
    await act(async () => {
      findButton(offlineHost, 'Ask lab coach').click();
      await settle();
    });
    expect(offlineHost.textContent).not.toContain('you need measurement evidence');
    expect(offlineHost.textContent).toContain('Look at both the visible motion and the measurements');
    act(() => offlineRoot.unmount());
    offlineHost.remove();
  });

  it('supports two-way Data Studio charts & regression handoffs back to Particle Lab 3D', async () => {
    // 1. Outbound to Regression mode carries source gas, axis, and handoff metadata
    await act(async () => {
      host.querySelector('#particle-open-datastudio-regression-btn').click();
      await settle();
    });
    expect(latestToolData._dataStudio).toMatchObject({
      studioMode: 'regression',
      fromTool: 'particleLab3d',
      dataSource: 'particleLab3d-log',
      sourceAxisId: 'boylePV',
      showTrendline: true,
    });
    expect(activeToolSpy).toHaveBeenCalledWith('dataStudio');

    // 2. Data Studio displays incoming Particle Lab banner and routes back
    const dsConfig = loadTool('stem_lab/stem_tool_datastudio.js', 'dataStudio');
    const dsToolSpy = vi.fn();
    const dsTabSpy = vi.fn();
    const dsHost = document.createElement('div');
    document.body.appendChild(dsHost);
    const dsRoot = ReactDOMClient.createRoot(dsHost);
    let dsState = {};
    const DsHarness = () => {
      const [td, setTd] = React.useState({
        _dataStudio: {
          studioMode: 'charts',
          chartType: 'scatter',
          dataSource: 'particleLab3d-log',
          fromTool: 'particleLab3d',
          sourceGasId: 'CO2',
          sourceGasFormula: 'CO₂',
          sourceTemperatureK: 480,
          sourcePreset: 'gas',
          sourceAxisId: 'charlesVT',
          chartTitle: 'Charles Law: V vs. T',
          handoffId: 'pl3d-ds-test-1',
          dataRows: [{ label: '1', x: 200, value: 1 }, { label: '2', x: 400, value: 2 }],
        },
      });
      dsState = td;
      return dsConfig.render(makeCtx({ toolData: td, setToolData: setTd, setStemLabTool: dsToolSpy, setStemLabTab: dsTabSpy }));
    };
    await act(async () => {
      dsRoot.render(React.createElement(DsHarness));
      await settle();
    });
    const dsBanner = dsHost.querySelector('#datastudio-particle-handoff-banner');
    expect(dsBanner).toBeTruthy();
    expect(dsBanner.textContent).toContain('480 K');

    await act(async () => {
      dsHost.querySelector('#datastudio-return-particlelab-btn').click();
      await settle();
    });
    expect(dsState.particleLab3d).toMatchObject({
      fromTool: 'dataStudio',
      sourceGasId: 'CO2',
      sourceTemperatureK: 480,
      sourcePreset: 'gas',
      sourceAxisId: 'charlesVT',
    });
    expect(dsToolSpy).toHaveBeenCalledWith('particleLab3d');
    act(() => dsRoot.unmount());
    dsHost.remove();

    // 3. Particle Lab 3D resolves Data Studio return payload including sweep axis
    const resolved = window.__alloParticleLabPure.resolveIncomingHandoff(dsState.particleLab3d);
    expect(resolved).toMatchObject({
      fromTool: 'dataStudio',
      fromLabel: 'Data Studio',
      gasId: 'CO2',
      temperatureK: 480,
      axisId: 'charlesVT',
    });
  });

  it('computes regression residual diagnostics, glossary filters, CER readiness, and safe session JSON round-trip', () => {
    const pure = window.__alloParticleLabPure;
    const fit = pure.linearRegression([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 7 },
    ]);
    expect(fit.valid).toBe(true);
    expect(fit.slope).toBeCloseTo(2.5, 4);
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.slopeStdErr).toBeGreaterThan(0);
    expect(fit.maxAbsResidual).toBeGreaterThan(0);

    const invalidFit = pure.linearRegression([{ x: 1, y: 2 }]);
    expect(invalidFit.valid).toBe(false);
    expect(invalidFit.rmse).toBe(0);
    expect(invalidFit.slopeStdErr).toBe(0);
    expect(invalidFit.maxAbsResidual).toBe(0);

    expect(pure.PARTICLE_GLOSSARY_TERMS).toHaveLength(10);
    expect(pure.filterGlossaryTerms('')).toHaveLength(10);
    expect(pure.filterGlossaryTerms('knudsen').map((g) => g.id)).toEqual(['knudsen_number']);
    expect(pure.filterGlossaryTerms('nonexistent_symbol_xyz')).toEqual([]);

    expect(pure.applyNotebookStarter('', 'Starter A', 100)).toBe('Starter A');
    expect(pure.applyNotebookStarter('Starter A', 'Starter A', 100)).toBe('Starter A');
    expect(pure.applyNotebookStarter('Line 1', 'Line 2', 100)).toBe('Line 1\nLine 2');

    expect(pure.evaluateNotebookReadiness({}).completedCount).toBe(0);
    expect(pure.evaluateNotebookReadiness({}).readyForReport).toBe(false);
    const ready = pure.evaluateNotebookReadiness({
      prediction: 'Heating increases wall collisions and pressure.',
      trialCount: 1,
      observation: 'Measured P=4.8 u at T=450 K.',
      conclusion: 'My prediction was supported because particle collision speed increased.',
    });
    expect(ready.completedCount).toBe(5);
    expect(ready.totalCount).toBe(5);
    expect(ready.readyForReport).toBe(true);

    expect(pure.PARTICLE_SESSION_SCHEMA).toBe('alloflow.particleLab3d.v1');
    const serialized = pure.serializeParticleSession({
      preset: 'gas',
      temperature: 1200,
      count: 999,
      attraction: 0.45,
      gasSpeciesA: 'CO2',
      pinnedWorkbenchIds: ['vdw_state', 'parametric_sweep'],
      prediction: 'Portable lab prediction test.',
    });
    const parsedOk = pure.parseParticleSessionJson(serialized);
    expect(parsedOk.ok).toBe(true);
    expect(parsedOk.data.temperature).toBe(900);
    expect(parsedOk.data.count).toBe(120);
    expect(parsedOk.data.gasSpeciesA).toBe('CO2');
    expect(parsedOk.data.pinnedWorkbenchIds).toEqual(['vdw_state', 'parametric_sweep']);
    expect(pure.parseParticleSessionJson('{invalid json').ok).toBe(false);
    expect(pure.parseParticleSessionJson('{"schema":"wrong.v0"}').ok).toBe(false);
    expect(pure.parseParticleSessionJson('').ok).toBe(false);
  });

  it('supports per-point sweep deletion, accessible residuals table, and plotting snapshots onto the fit', async () => {
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(5);
    expect(host.querySelector('#particle-parametric-sweep-card').textContent).toContain('RMSE=');

    const detailsEl = host.querySelector('#particle-sweep-table-details');
    expect(detailsEl).toBeTruthy();
    detailsEl.open = true;
    const dataTable = host.querySelector('#particle-sweep-data-table');
    expect(dataTable).toBeTruthy();
    expect(dataTable.querySelector('caption').textContent).toContain('residuals');
    expect(dataTable.querySelectorAll('thead th')).toHaveLength(6);
    expect(dataTable.querySelectorAll('tbody tr')).toHaveLength(5);

    await act(async () => {
      findButton(host, 'Remove #5').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(4);
    expect(host.querySelectorAll('#particle-sweep-data-table tbody tr')).toHaveLength(4);

    await act(async () => {
      findButton(host, 'Save Snapshot').click();
      await settle();
    });
    await act(async () => {
      findButton(host, 'Save Snapshot').click();
      await settle();
    });
    const plotBtn = host.querySelector('#particle-plot-snapshots-btn');
    expect(plotBtn).toBeTruthy();
    expect(plotBtn.textContent).toContain('2');

    await act(async () => {
      plotBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(6);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('opens interactive Concept & Symbol Glossary, filters terms live, and jumps to target workbench cards', async () => {
    const toggleBtn = host.querySelector('#particle-glossary-toggle-btn');
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      toggleBtn.click();
      await settle();
    });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    const drawer = host.querySelector('#particle-glossary-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer.querySelectorAll('[data-glossary-id]')).toHaveLength(10);

    const searchInput = host.querySelector('#particle-glossary-search');
    expect(searchInput).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(searchInput, 'knudsen');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    const visibleCards = host.querySelectorAll('#particle-glossary-drawer [data-glossary-id]');
    expect(visibleCards).toHaveLength(1);
    expect(visibleCards[0].getAttribute('data-glossary-id')).toBe('knudsen_number');

    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    await act(async () => {
      findButton(domainNav, 'Earth, Ocean & Physiology (3)').click();
      await settle();
    });
    expect(host.querySelector('#particle-transport-card')).toBeNull();

    await act(async () => {
      findButton(host.querySelector('#particle-glossary-drawer'), 'Open Knudsen Number card →').click();
      await settle();
    });
    expect(host.querySelector('#particle-transport-card')).toBeTruthy();
  });

  it('toggles UDL writing starters, inserts CER sentence frames, and updates live readiness checklist', async () => {
    const checklist = host.querySelector('#particle-cer-checklist');
    expect(checklist).toBeTruthy();
    expect(checklist.textContent).toContain('CER Readiness: 0/5');

    const scaffoldsBtn = host.querySelector('#particle-notebook-scaffolds-btn');
    expect(scaffoldsBtn).toBeTruthy();
    expect(scaffoldsBtn.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      scaffoldsBtn.click();
      await settle();
    });
    expect(scaffoldsBtn.getAttribute('aria-expanded')).toBe('true');
    expect(latestToolData.particleLab3d.notebookScaffoldsOpen).toBe(true);

    await act(async () => {
      host.querySelector('[data-starter-id="pred_if"]').click();
      await settle();
    });
    expect(host.querySelector('#particle-prediction-input').value).toContain('If I change');

    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    await act(async () => {
      findButton(host, '+ Insert chamber evidence').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('[data-starter-id="cer_claim"]').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('[data-starter-id="cer_reason"]').click();
      await settle();
    });
    expect(host.querySelector('#particle-observation-input').value).toContain('Measured T=');
    expect(host.querySelector('#particle-conclusion-input').value).toContain('Claim:');
    expect(host.querySelector('#particle-cer-checklist').textContent).toContain('CER Readiness: 5/5');
  });

  it('exports Markdown lab reports and validates portable Session JSON export/import round-trips', async () => {
    const predInput = host.querySelector('#particle-prediction-input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(predInput, 'Predict pressure rises with temperature.');
      predInput.dispatchEvent(new Event('input', { bubbles: true }));
      predInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });

    await act(async () => {
      host.querySelector('#particle-copy-markdown-report-btn').click();
      await settle();
    });
    expect(copySpy).toHaveBeenCalled();
    const mdText = String(copySpy.mock.calls[copySpy.mock.calls.length - 1][0]);
    expect(mdText).toContain('# Particle Lab 3D');
    expect(mdText).toContain('## Hypothesis');
    expect(mdText).toContain('RMSE=');
    expect(mdText).toContain('| # | Source |');

    const jsonToggle = host.querySelector('#particle-session-json-toggle-btn');
    expect(jsonToggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      jsonToggle.click();
      await settle();
    });
    expect(jsonToggle.getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      host.querySelector('#particle-copy-session-json-btn').click();
      await settle();
    });
    const copiedJson = String(copySpy.mock.calls[copySpy.mock.calls.length - 1][0]);
    expect(copiedJson).toContain('"schema": "alloflow.particleLab3d.v1"');

    const jsonInput = host.querySelector('#particle-import-session-json-input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(jsonInput, '{bad json');
      jsonInput.dispatchEvent(new Event('input', { bubbles: true }));
      jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    toastSpy.mockClear();
    await act(async () => {
      host.querySelector('#particle-apply-session-json-btn').click();
      await settle();
    });
    expect(toastSpy).toHaveBeenCalled();
    expect(String(toastSpy.mock.calls[0][0])).toContain('Session JSON could not be imported');

    const portablePayload = window.__alloParticleLabPure.serializeParticleSession({
      preset: 'diffusion',
      temperature: 550,
      count: 80,
      gasSpeciesA: 'He',
      attraction: 0.65,
      prediction: 'Restored diffusion prediction across barrier.',
    });
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(jsonInput, portablePayload);
      jsonInput.dispatchEvent(new Event('input', { bubbles: true }));
      jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-apply-session-json-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d).toMatchObject({
      preset: 'diffusion',
      temperature: 550,
      count: 80,
      gasSpeciesA: 'He',
      attraction: 0.65,
      prediction: 'Restored diffusion prediction across barrier.',
    });
    expect(host.querySelector('#particle-prediction-input').value).toBe('Restored diffusion prediction across barrier.');
  });

  it('audits KMT sweep theoretical slopes/controls, evaluates the 6-item Concept Check quiz, and builds diagnostic Socratic feedback', () => {
    const pure = window.__alloParticleLabPure;

    // 1. Ideal-limit sweeps across all 6 axes match analytical KMT slopes within 5% with Fair Controls
    pure.PARTICLE_SWEEP_AXES.forEach((axisId) => {
      const rows = pure.buildParticleSweepRows(
        { temperature: 300, count: 64, boxSize: 11, particleDiameter: 0.36, attraction: 0, pressure: 2.5 },
        axisId,
        1
      );
      const spec = pure.getParticleAxisSpec(axisId);
      const pts = rows.map((r, i) => {
        const m = spec.mapRow(r, i);
        return { x: m.x, y: m.value };
      });
      const reg = pure.linearRegression(pts);
      const audit = pure.evaluateSweepTheoryAndControl(rows, axisId, reg);
      expect(audit.fair).toBe(true);
      expect(audit.confoundedControls).toEqual([]);
      expect(audit.regime).toBe('ideal_match');
      expect(audit.slopeErrorPct).toBeLessThanOrEqual(5);
    });

    // 2. Strong attraction & finite excluded volume shift slope into real_gas_shift
    const realRows = pure.buildParticleSweepRows(
      { temperature: 160, count: 96, boxSize: 10, particleDiameter: 0.85, attraction: 1.4 },
      'boylePV',
      1
    );
    const boyleSpec = pure.getParticleAxisSpec('boylePV');
    const realReg = pure.linearRegression(realRows.map((r, i) => {
      const m = boyleSpec.mapRow(r, i);
      return { x: m.x, y: m.value };
    }));
    const realAudit = pure.evaluateSweepTheoryAndControl(realRows, 'boylePV', realReg);
    expect(realAudit.fair).toBe(true);
    expect(realAudit.regime).toBe('real_gas_shift');
    expect(realAudit.slopeErrorPct).toBeGreaterThan(10);

    // 3. Confounded Boyle sweep (varying temperature) flags confoundedControls
    const confoundedRows = [
      { temperature: 250, count: 64, boxSize: 14, volume: 2744, pressure: 1.5, particleDiameter: 0.5, attraction: 0 },
      { temperature: 500, count: 64, boxSize: 9, volume: 729, pressure: 4.5, particleDiameter: 0.5, attraction: 0 },
    ];
    const confReg = pure.linearRegression(confoundedRows.map((r, i) => {
      const m = boyleSpec.mapRow(r, i);
      return { x: m.x, y: m.value };
    }));
    const confAudit = pure.evaluateSweepTheoryAndControl(confoundedRows, 'boylePV', confReg);
    expect(confAudit.fair).toBe(false);
    expect(confAudit.confoundedControls).toContain('temperature');
    expect(confAudit.regime).toBe('confounded');

    // 4. Concept Check quiz evaluator & particle_concept_quiz questHook
    expect(pure.PARTICLE_CONCEPT_QUIZ).toHaveLength(6);
    const partialQuiz = pure.evaluateConceptQuiz({ q_equipartition: 0, q_boyle_mechanism: 0, invalid_key: 2 });
    expect(partialQuiz.answeredCount).toBe(2);
    expect(partialQuiz.correctCount).toBe(1);
    expect(partialQuiz.mastered).toBe(false);

    const masteredMap = { q_equipartition: 0, q_boyle_mechanism: 1, q_real_gas_z: 1, q_mean_free_path: 3 };
    const masteredQuiz = pure.evaluateConceptQuiz(masteredMap);
    expect(masteredQuiz.correctCount).toBe(4);
    expect(masteredQuiz.scorePct).toBe(67);
    expect(masteredQuiz.mastered).toBe(true);

    const quizHook = window.StemLab._registry.particleLab3d.questHooks.find((q) => q.id === 'particle_concept_quiz');
    expect(quizHook).toBeDefined();
    expect(quizHook.check(undefined)).toBe(false);
    expect(quizHook.progress(undefined)).toBe('0/4');
    expect(quizHook.check({ quizAnswers: masteredMap })).toBe(true);
    expect(quizHook.progress({ quizAnswers: masteredMap })).toBe('4/4');

    // 5. Offline Socratic Diagnostic Coach stages
    expect(pure.buildSocraticDiagnosticCoach({})).toContain('Start by making a prediction');
    expect(pure.buildSocraticDiagnosticCoach({ ideaText: 'Cold stops.', ideaWatch: 'Wall hits' })).toContain('Wall hits');
    expect(pure.buildSocraticDiagnosticCoach({ prediction: 'Pressure increases inversely with V.' })).toContain('you need measurement evidence');
    expect(pure.buildSocraticDiagnosticCoach({
      prediction: 'Pressure increases.',
      logCount: 3,
      confoundedVars: ['temperature'],
    })).toContain('multiple variables (temperature)');
    expect(pure.buildSocraticDiagnosticCoach({
      prediction: 'Pressure increases.',
      logCount: 5,
      observation: 'The pressure went higher when shrinking.',
      gasFormula: 'CO2',
    })).toContain('quantitative measurements');
    expect(pure.buildSocraticDiagnosticCoach({
      prediction: 'Pressure increases.',
      logCount: 5,
      observation: 'P rose from 1.5 to 3.8 u.',
      conclusion: 'It clearly rose as predicted because volume dropped.',
    })).toContain('microscopic particle behavior');
    expect(pure.buildSocraticDiagnosticCoach({
      prediction: 'Pressure increases.',
      logCount: 5,
      observation: 'P rose from 1.5 to 3.8 u.',
      conclusion: 'My prediction was supported because smaller volume increases collision frequency.',
      gasFormula: 'N2',
      zValue: 1.01,
    })).toContain('complete CER investigation');
  });

  it('renders KMT slope benchmark banner and plots recorded chamber trials onto the fit table', async () => {
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    const banner = host.querySelector('#particle-sweep-theory-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('KMT Slope');
    expect(banner.textContent).toContain('Fair Controls ✓');
    expect(banner.textContent).toContain('% diff');

    await act(async () => {
      findButton(host, 'Clear Log').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toEqual([]);

    const recordBtn = findButton(host, 'Record this trial');
    expect(recordBtn).toBeTruthy();
    await act(async () => {
      recordBtn.click();
      await settle();
    });
    await act(async () => {
      recordBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.trials).toHaveLength(2);

    const plotTrialsBtn = host.querySelector('#particle-plot-trials-btn');
    expect(plotTrialsBtn).toBeTruthy();
    expect(plotTrialsBtn.textContent).toContain('Plot Trials (2)');

    toastSpy.mockClear();
    await act(async () => {
      plotTrialsBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(2);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('persists restored chamber snapshots and resets the Snapshot A/B Tray cleanly', async () => {
    await act(async () => {
      findButton(host, 'Save Snapshot').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.savedSnapshots).toHaveLength(1);
    const baselineTemp = latestToolData.particleLab3d.savedSnapshots[0].temperatureSetpoint;
    const baselineBox = latestToolData.particleLab3d.savedSnapshots[0].boxSize;

    // Move chamber away from baseline via Cycle Corner 3 (thermostat gas at 640 K, box 9)
    await act(async () => {
      findButton(host, 'Corner 3').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.temperature).toBe(640);
    expect(latestToolData.particleLab3d.boxSize).toBeLessThan(baselineBox);

    toastSpy.mockClear();
    const restoreBtn = host.querySelector('#particle-snapshot-tray-card button[aria-label*="Restore"]');
    expect(restoreBtn).toBeTruthy();
    await act(async () => {
      restoreBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.temperature).toBe(baselineTemp);
    expect(latestToolData.particleLab3d.boxSize).toBe(baselineBox);
    expect(toastSpy).toHaveBeenCalled();

    const clearSnapsBtn = host.querySelector('#particle-clear-snapshots-btn');
    expect(clearSnapsBtn).toBeTruthy();
    await act(async () => {
      clearSnapsBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.savedSnapshots).toEqual([]);
    expect(latestToolData.particleLab3d.compareIds).toEqual([]);
    expect(host.querySelector('#particle-clear-snapshots-btn')).toBeNull();
  });

  it('runs the interactive 6-item KMT Concept Self-Check quiz, persists mastery, and jumps to workbench cards', async () => {
    const toggleBtn = host.querySelector('#particle-quiz-toggle-btn');
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn.textContent).toContain('0/6');

    await act(async () => {
      toggleBtn.click();
      await settle();
    });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    const drawer = host.querySelector('#particle-quiz-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer.querySelectorAll('[data-quiz-id]')).toHaveLength(6);

    // Wrong option triggers Socratic hint without credit
    await act(async () => {
      drawer.querySelector('[data-quiz-id="q_equipartition"] [data-quiz-opt="1"]').click();
      await settle();
    });
    expect(drawer.querySelector('[data-quiz-id="q_equipartition"]').textContent).toContain('Hint:');

    // Answer 4 items correctly to achieve Mastered (4/6)
    const rightPicks = [
      ['q_equipartition', '0'],
      ['q_boyle_mechanism', '1'],
      ['q_real_gas_z', '1'],
      ['q_mean_free_path', '3'],
    ];
    for (const [qId, optIdx] of rightPicks) {
      await act(async () => {
        host.querySelector(`[data-quiz-id="${qId}"] [data-quiz-opt="${optIdx}"]`).click();
        await settle();
      });
    }
    expect(host.querySelector('#particle-quiz-drawer').textContent).toContain('4/6 (67%) • Mastered ✓');
    expect(latestToolData.particleLab3d.quizAnswers).toMatchObject({
      q_equipartition: 0,
      q_boyle_mechanism: 1,
      q_real_gas_z: 1,
      q_mean_free_path: 3,
    });

    // Collapse shows updated count, and Jump opens Real-Gas card cleanly
    await act(async () => {
      host.querySelector('#particle-quiz-toggle-btn').click();
      await settle();
    });
    expect(host.querySelector('#particle-quiz-toggle-btn').textContent).toBe('Concept Check (4/6)');

    await act(async () => {
      host.querySelector('#particle-quiz-toggle-btn').click();
      await settle();
    });
    const domainNav = host.querySelector('#particle-workbench-domain-nav');
    await act(async () => {
      findButton(domainNav, 'Earth, Ocean & Physiology (3)').click();
      await settle();
    });
    expect(host.querySelector('#particle-real-gas-card')).toBeNull();

    await act(async () => {
      findButton(host.querySelector('#particle-quiz-drawer'), 'Inspect Real-Gas Species & SI Scale card →').click();
      await settle();
    });
    expect(host.querySelector('#particle-real-gas-card')).toBeTruthy();

    await act(async () => {
      host.querySelector('#particle-quiz-reset-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.quizAnswers).toEqual({});
  });

  it('delivers evidence-aware offline Socratic diagnostics and round-trips trials, mastery, and quiz answers in Session JSON', async () => {
    const plConfig = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');

    // 1. Confounded multi-variable sweep triggers targeted fair-test Socratic feedback
    const confHost = document.createElement('div');
    document.body.appendChild(confHost);
    const confRoot = ReactDOMClient.createRoot(confHost);
    const ConfHarness = () => {
      const [td, setTd] = React.useState({
        particleLab3d: {
          prediction: 'Shrinking volume increases pressure.',
          experimentLog: [
            { id: 'c1', n: 1, source: 'live', preset: 'gas', temperature: 200, pressure: 1.1, count: 64, boxSize: 14, attraction: 0 },
            { id: 'c2', n: 2, source: 'live', preset: 'gas', temperature: 520, pressure: 4.8, count: 64, boxSize: 9, attraction: 0 },
          ],
        },
      });
      return plConfig.render(makeCtx({ toolData: td, setToolData: setTd, aiHintsEnabled: false }));
    };
    await act(async () => {
      confRoot.render(React.createElement(ConfHarness));
      await settle();
    });
    await act(async () => {
      findButton(confHost, 'Ask lab coach').click();
      await settle();
    });
    expect(confHost.textContent).toContain('multiple variables (temperature)');
    act(() => confRoot.unmount());
    confHost.remove();

    // 2. Qualitative observation missing measurements triggers numeric-evidence prompt
    const qualHost = document.createElement('div');
    document.body.appendChild(qualHost);
    const qualRoot = ReactDOMClient.createRoot(qualHost);
    const QualHarness = () => {
      const [td, setTd] = React.useState({
        particleLab3d: {
          prediction: 'Heating increases pressure.',
          observation: 'The particles sped up and wall pressure got higher.',
          experimentLog: window.__alloParticleLabPure.buildParticleSweepRows(
            { temperature: 300, count: 64, boxSize: 11, particleDiameter: 0.36, attraction: 0 },
            'boylePV',
            1
          ),
        },
      });
      return plConfig.render(makeCtx({ toolData: td, setToolData: setTd, aiHintsEnabled: false }));
    };
    await act(async () => {
      qualRoot.render(React.createElement(QualHarness));
      await settle();
    });
    await act(async () => {
      findButton(qualHost, 'Ask lab coach').click();
      await settle();
    });
    expect(qualHost.textContent).toContain('quantitative measurements');
    act(() => qualRoot.unmount());
    qualHost.remove();

    // 3. Full Session JSON round-trip preserves trials, challenges, missions, and quizAnswers
    await act(async () => {
      host.querySelector('#particle-session-json-toggle-btn').click();
      await settle();
    });
    const fullPayload = window.__alloParticleLabPure.serializeParticleSession({
      activeProtocol: 'boyle',
      preset: 'gas',
      temperature: 440,
      count: 90,
      trials: [{ id: 'tr-99', preset: 'gas', temperature: 440, temperatureSetpoint: 440, pressure: 3.6, count: 90, boxSize: 11 }],
      completedChallenges: { boyle_squeeze: true },
      completedMissions: { clean_air_ventilation: true },
      quizAnswers: { q_equipartition: 0, q_boyle_mechanism: 1, q_real_gas_z: 1, q_mean_free_path: 3 },
      prediction: 'Round-trip CER hypothesis preserved cleanly.',
    });
    const jsonInput = host.querySelector('#particle-import-session-json-input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(jsonInput, fullPayload);
      jsonInput.dispatchEvent(new Event('input', { bubbles: true }));
      jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-apply-session-json-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d).toMatchObject({
      activeProtocol: 'boyle',
      temperature: 440,
      count: 90,
      completedChallenges: { boyle_squeeze: true },
      completedMissions: { clean_air_ventilation: true },
    });
    expect(latestToolData.particleLab3d.trials).toHaveLength(1);
    expect(latestToolData.particleLab3d.trials[0].temperature).toBe(440);
    expect(host.querySelector('#particle-quiz-toggle-btn').textContent).toBe('Concept Check (4/6)');
  });

  it('provides 2-tier challenge hints, detects sweep outliers, solves SI real/ideal gas states, and scores 5D NGSS mastery', () => {
    const pure = window.__alloParticleLabPure;

    // 1. Progressive hints cover every Core challenge and Applied mission
    pure.PARTICLE_CHALLENGES.forEach((ch) => {
      const h = pure.getChallengeMissionHint('core', ch.id, { preset: 'gas', temperature: 300, attraction: 0 });
      expect(h.tier1.length).toBeGreaterThan(20);
      expect(h.tier2.length).toBeGreaterThan(20);
    });
    pure.APPLIED_WORKBENCH_MISSIONS.forEach((ms) => {
      const h = pure.getChallengeMissionHint('applied', ms.id, {});
      expect(h.tier1.length).toBeGreaterThan(20);
      expect(h.tier2.length).toBeGreaterThan(20);
    });
    expect(pure.getChallengeMissionHint('core', 'boyle_squeeze', { preset: 'diffusion' }).tier2).toContain('Gas');
    expect(pure.getChallengeMissionHint('core', 'boyle_squeeze', { preset: 'gas', temperature: 140 }).tier2).toContain('280');
    expect(pure.getChallengeMissionHint('core', 'boyle_squeeze', { preset: 'gas', temperature: 300, attraction: 0.8 }).tier2).toContain('0.20');

    // 2. Sweep residual & outlier detector
    const cleanRows = pure.buildParticleSweepRows(
      { temperature: 300, count: 64, boxSize: 11, particleDiameter: 0.36, attraction: 0 },
      'boylePV',
      1
    );
    const boyleSpec = pure.getParticleAxisSpec('boylePV');
    const cleanPts = cleanRows.map((r, i) => {
      const m = boyleSpec.mapRow(r, i);
      return { x: m.x, y: m.value };
    });
    const cleanAnalysis = pure.analyzeSweepResiduals(cleanRows, 'boylePV', pure.linearRegression(cleanPts));
    expect(cleanAnalysis.hasOutlier).toBe(false);

    const dirtyRows = cleanRows.map((r, idx) => (idx === 2 ? { ...r, pressure: r.pressure * 4.5 + 12 } : r));
    const dirtyPts = dirtyRows.map((r, i) => {
      const m = boyleSpec.mapRow(r, i);
      return { x: m.x, y: m.value };
    });
    const dirtyAnalysis = pure.analyzeSweepResiduals(dirtyRows, 'boylePV', pure.linearRegression(dirtyPts));
    expect(dirtyAnalysis.hasOutlier).toBe(true);
    expect(dirtyAnalysis.outlierRowId).toBe(dirtyRows[2].id);
    expect(dirtyAnalysis.outlierN).toBe(dirtyRows[2].n);
    expect(dirtyAnalysis.refitR2).toBeGreaterThan(0.99);

    // 3. SI Ideal vs Van der Waals gas state solver
    const stp = pure.solveRealAndIdealGasState({ gasId: 'N2', moles: 1, volumeL: 22.414, temperatureK: 273.15 });
    expect(stp.pIdealAtm).toBeCloseTo(1.0, 2);
    expect(stp.regime).toBe('ideal');

    const co2Attr = pure.solveRealAndIdealGasState({ gasId: 'CO2', moles: 2, volumeL: 0.5, temperatureK: 298.15 });
    expect(co2Attr.compressibilityZ).toBeLessThan(0.95);
    expect(co2Attr.regime).toBe('attractive');

    const heRep = pure.solveRealAndIdealGasState({ gasId: 'He', moles: 5, volumeL: 0.5, temperatureK: 500 });
    expect(heRep.compressibilityZ).toBeGreaterThan(1.05);
    expect(heRep.regime).toBe('repulsive');

    // 4. NGSS 5-dimension mastery rubric evaluator
    expect(pure.evaluateInvestigationMastery({})).toMatchObject({ earnedPoints: 0, maxPoints: 5, levelLabel: 'Beginning (0/5)' });
    expect(pure.evaluateInvestigationMastery({
      hasFairData: true,
      logCount: 4,
      regressionValid: true,
      regressionR2: 0.99,
      completedChallengeCount: 1,
    })).toMatchObject({ earnedPoints: 3, levelLabel: 'Proficient (3/5)' });
    expect(pure.evaluateInvestigationMastery({
      hasFairData: true,
      logCount: 5,
      regressionValid: true,
      regressionR2: 0.999,
      completedMissionCount: 1,
      cerCompletedCount: 4,
      quizCorrectCount: 4,
    })).toMatchObject({ earnedPoints: 5, levelLabel: 'Exemplary (5/5)' });
  });

  it('steps through 2-tier progressive Socratic hints across Core and Applied tracks and resets hints on switch', async () => {
    const hintBtn = host.querySelector('#particle-challenge-hint-btn');
    expect(hintBtn).toBeTruthy();
    expect(hintBtn.textContent).toBe('Hint (1/2)');
    expect(host.querySelector('#particle-challenge-hint-box')).toBeNull();

    await act(async () => {
      hintBtn.click();
      await settle();
    });
    expect(host.querySelector('#particle-challenge-hint-btn').textContent).toBe('Deeper Hint (2/2)');
    expect(host.querySelector('#particle-challenge-hint-box').textContent).toContain('Concept Hint (1/2):');
    expect(host.querySelector('#particle-challenge-hint-box').textContent).not.toContain('Action Cue (2/2):');

    await act(async () => {
      host.querySelector('#particle-challenge-hint-btn').click();
      await settle();
    });
    expect(host.querySelector('#particle-challenge-hint-btn').textContent).toBe('Hide Hint');
    expect(host.querySelector('#particle-challenge-hint-box').textContent).toContain('Action Cue (2/2):');

    // Switching track auto-resets hint drawer
    await act(async () => {
      host.querySelector('#particle-challenge-track-applied').click();
      await settle();
    });
    expect(host.querySelector('#particle-challenge-hint-box')).toBeNull();

    const msSelect = host.querySelector('#particle-applied-mission-select');
    await act(async () => {
      msSelect.value = 'clean_air_ventilation';
      msSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-challenge-hint-btn').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-challenge-hint-btn').click();
      await settle();
    });
    expect(host.querySelector('#particle-challenge-hint-box').textContent).toContain('Wells\u2013Riley');
  });

  it('highlights statistical regression outliers and restores R² linearity with 1-click Trim Outlier', async () => {
    const baseRows = window.__alloParticleLabPure.buildParticleSweepRows(
      { temperature: 300, count: 64, boxSize: 11, particleDiameter: 0.36, attraction: 0 },
      'boylePV',
      1
    );
    const corruptedLog = baseRows.map((r, idx) => (idx === 2 ? { ...r, pressure: r.pressure * 4.5 + 12 } : r));
    const payload = window.__alloParticleLabPure.serializeParticleSession({
      dataStudioAxis: 'boylePV',
      experimentLog: corruptedLog,
    });

    await act(async () => {
      host.querySelector('#particle-session-json-toggle-btn').click();
      await settle();
    });
    const jsonInput = host.querySelector('#particle-import-session-json-input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(jsonInput, payload);
      jsonInput.dispatchEvent(new Event('input', { bubbles: true }));
      jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-apply-session-json-btn').click();
      await settle();
    });

    const sweepCard = host.querySelector('#particle-parametric-sweep-card');
    expect(sweepCard.querySelector('line[stroke="#38bdf8"]')).toBeTruthy();
    expect(sweepCard.querySelector('circle[stroke="#fb7185"]')).toBeTruthy();

    const trimBtn = host.querySelector('#particle-trim-outlier-btn');
    expect(trimBtn).toBeTruthy();
    expect(trimBtn.textContent).toContain('Trim Outlier #3');

    toastSpy.mockClear();
    await act(async () => {
      trimBtn.click();
      await settle();
    });
    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(4);
    expect(host.querySelector('#particle-trim-outlier-btn')).toBeNull();
    expect(host.querySelector('#particle-parametric-sweep-card').textContent).toMatch(/R²\s*=\s*(0\.99|1\.00)/);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('operates SI Ideal vs. Van der Waals Gas Solver drawer, syncs chamber temperature, cites into notebook, and round-trips JSON', async () => {
    const toggleBtn = host.querySelector('#particle-calc-toggle-btn');
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      toggleBtn.click();
      await settle();
    });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    const drawer = host.querySelector('#particle-calc-drawer');
    expect(drawer).toBeTruthy();

    await act(async () => {
      const gSel = host.querySelector('#particle-calc-gas-select');
      gSel.value = 'CO2';
      gSel.dispatchEvent(new Event('change', { bubbles: true }));
      const mSel = host.querySelector('#particle-calc-moles-select');
      mSel.value = '2';
      mSel.dispatchEvent(new Event('change', { bubbles: true }));
      const vSel = host.querySelector('#particle-calc-volume-select');
      vSel.value = '0.5';
      vSel.dispatchEvent(new Event('change', { bubbles: true }));
      const tSel = host.querySelector('#particle-calc-temp-select');
      tSel.value = '298.15';
      tSel.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    expect(drawer.textContent).toContain('Attraction-dominant');
    expect(drawer.textContent).toContain('88.0 g');

    await act(async () => {
      host.querySelector('#particle-calc-sync-temp-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.calcTempK).toBe(300);
    expect(host.querySelector('#particle-calc-temp-select').value).toBe('300');

    await act(async () => {
      host.querySelector('#particle-calc-cite-btn').click();
      await settle();
    });
    const obsVal = host.querySelector('#particle-observation-input').value;
    expect(obsVal).toContain('SI Gas Solver (CO\u2082');
    expect(obsVal).toContain('P_ideal=');
    expect(obsVal).toContain('P_vdW=');

    // Session JSON round-trip preserves solver controls
    const exportedJson = window.__alloParticleLabPure.serializeParticleSession({
      calcMoles: 2,
      calcVolumeL: 0.5,
      calcTempK: 300,
    });
    const parsedBack = window.__alloParticleLabPure.parseParticleSessionJson(exportedJson);
    expect(parsedBack.ok).toBe(true);
    expect(parsedBack.data).toMatchObject({ calcMoles: 2, calcVolumeL: 0.5, calcTempK: 300 });
  });

  it('tracks 5-dimension NGSS Investigation Portfolio live and exports portfolio checklist in Markdown reports', async () => {
    const rubricDetails = host.querySelector('#particle-mastery-rubric-details');
    expect(rubricDetails).toBeTruthy();
    expect(rubricDetails.textContent).toContain('Beginning (0/5)');

    // 1. Complete Quantitative Challenge (linear_law_fit) + Fair Sweep (+3 dims: fair_design, quant_analysis, computational_models)
    const chSelect = host.querySelector('#particle-challenge-select');
    await act(async () => {
      chSelect.value = 'linear_law_fit';
      chSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      findButton(host, 'Stage Baseline').click();
      await settle();
    });
    await act(async () => {
      findButton(host, '5-pt Sweep').click();
      await settle();
    });
    await act(async () => {
      findButton(host, 'Verify Challenge').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.completedChallenges.linear_law_fit).toBe(true);

    // 2. Complete CER Scaffolds (+1 dim: cer_explanation)
    await act(async () => {
      host.querySelector('#particle-notebook-scaffolds-btn').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('[data-starter-id="pred_if"]').click();
      await settle();
    });
    await act(async () => {
      findButton(host, '+ Insert chamber evidence').click();
      await settle();
    });
    await act(async () => {
      host.querySelector('[data-starter-id="cer_reason"]').click();
      await settle();
    });

    // 3. Complete Concept Quiz (+1 dim: conceptual_dci -> Exemplary 5/5)
    await act(async () => {
      host.querySelector('#particle-quiz-toggle-btn').click();
      await settle();
    });
    const picks = [
      ['q_equipartition', '0'],
      ['q_boyle_mechanism', '1'],
      ['q_real_gas_z', '1'],
      ['q_mean_free_path', '3'],
    ];
    for (const [qId, optIdx] of picks) {
      await act(async () => {
        host.querySelector(`[data-quiz-id="${qId}"] [data-quiz-opt="${optIdx}"]`).click();
        await settle();
      });
    }

    rubricDetails.open = true;
    expect(rubricDetails.textContent).toContain('Exemplary (5/5)');
    expect(rubricDetails.textContent).toContain('✓ SEP 1/3');
    expect(rubricDetails.textContent).toContain('✓ SEP 4');
    expect(rubricDetails.textContent).toContain('✓ SEP 6');

    await act(async () => {
      host.querySelector('#particle-copy-markdown-report-btn').click();
      await settle();
    });
    const mdOut = String(copySpy.mock.calls[copySpy.mock.calls.length - 1][0]);
    expect(mdOut).toContain('## NGSS Investigation Portfolio (Exemplary (5/5))');
    expect(mdOut).toContain('- [x] **SEP 4 (Quantitative Fit & Data)**');
  });

  it('verifies Wave 16 Dalton binary mixtures, wet-gas vapor pressure, tabular CSV parser, lesson launchpads, and misconception quest hooks', () => {
    const pure = window.__alloParticleLabPure;
    expect(pure.MIX_MOLES_OPTIONS).toEqual([0.1, 0.25, 0.5, 1, 2, 5]);

    const pWater298 = pure.waterSaturationVaporAtm(298.15);
    expect(pWater298).toBeGreaterThan(0.029);
    expect(pWater298).toBeLessThan(0.034);
    expect(pure.waterSaturationVaporAtm(350)).toBeGreaterThan(pWater298);
    expect(pWater298).toBeGreaterThan(pure.waterSaturationVaporAtm(260));
    expect(pure.waterSaturationVaporAtm(200)).toBe(0);

    const dryMix = pure.solveDaltonGasMixture({
      gasIdA: 'He',
      gasIdB: 'CO2',
      molesA: 2,
      molesB: 0.5,
      volumeL: 10,
      temperatureK: 298.15,
      overWater: false,
    });
    expect(dryMix.totalMoles).toBeCloseTo(2.5, 6);
    expect(dryMix.xA + dryMix.xB).toBeCloseTo(1, 6);
    expect(dryMix.xA).toBeCloseTo(0.8, 6);
    expect(dryMix.pAAtm + dryMix.pBAtm).toBeCloseTo(dryMix.pDryAtm, 6);
    expect(dryMix.pTotalAtm).toBeCloseTo(dryMix.pDryAtm, 6);
    expect(dryMix.vRmsRatioAB).toBeCloseTo(Math.sqrt(pure.getGasIdentity('CO2').molarMass / pure.getGasIdentity('He').molarMass), 4);

    const wetMix = pure.solveDaltonGasMixture({
      gasIdA: 'He',
      gasIdB: 'CO2',
      molesA: 2,
      molesB: 0.5,
      volumeL: 10,
      temperatureK: 298.15,
      overWater: true,
    });
    expect(wetMix.pWaterAtm).toBeCloseTo(pWater298, 6);
    expect(wetMix.pTotalAtm).toBeCloseTo(dryMix.pDryAtm + pWater298, 6);
    expect(wetMix.pWaterMmHg).toBeGreaterThan(22);
    expect(wetMix.pWaterMmHg).toBeLessThan(26);

    for (const axis of ['boylePV', 'gayLussacPT', 'grahamMass']) {
      const parsed = pure.parseTabularSweepInput(pure.SAMPLE_BENCH_SWEEP_DATASETS[axis], axis, 1, { preset: 'gas' });
      expect(parsed.ok).toBe(true);
      expect(parsed.rows.length).toBeGreaterThanOrEqual(4);
      expect(parsed.rows[0].source).toBe('import');
      const spec = pure.getParticleAxisSpec(axis);
      const pts = parsed.rows.map((r, i) => spec.mapRow(r, i));
      const reg = pure.linearRegression(pts.map((p) => ({ x: p.x, y: p.value })));
      expect(reg.valid).toBe(true);
      expect(reg.r2).toBeGreaterThan(0.99);
    }

    const badParse = pure.parseTabularSweepInput('header only\nbad row', 'boylePV', 1);
    expect(badParse.ok).toBe(false);
    expect(badParse.rows).toEqual([]);

    expect(pure.PARTICLE_LESSON_GUIDES).toHaveLength(4);
    const guide = pure.buildLessonFacilitationGuide('ap_chem_gas_mixtures');
    expect(guide).toContain('AP Chem 3.4\u20133.6');
    expect(guide).toContain('Driving Question');
    expect(guide).toContain('Exit Ticket');

    expect(pure.restoreIdeasResolved({ heavy: true, bogus: true, swell: false })).toEqual({ heavy: true });
    expect(pure.restoreIdeasResolved(['heavy'])).toEqual({});

    const config = window.StemLab._registry.particleLab3d;
    const ideaHook = config.questHooks.find((q) => q.id === 'particle_ideas_tested');
    expect(ideaHook).toBeDefined();
    expect(ideaHook.check(undefined)).toBe(false);
    expect(ideaHook.check({})).toBe(false);
    expect(ideaHook.progress(undefined)).toBe('0/2');
    expect(ideaHook.check({ ideasResolved: { heavy: true, swell: true } })).toBe(true);
    expect(ideaHook.progress({ ideasResolved: { heavy: true, swell: true } })).toBe('2/2');
  });

  it('computes Dalton partial pressures and wet-gas over-water offset, stages Diffusion chamber, and cites mixture in notebook', async () => {
    await act(async () => {
      host.querySelector('#particle-calc-toggle-btn').click();
      await settle();
    });
    const mixModeBtn = host.querySelector('#particle-calc-mode-mixture');
    expect(mixModeBtn).toBeTruthy();
    await act(async () => {
      mixModeBtn.click();
      await settle();
    });
    expect(mixModeBtn.getAttribute('aria-pressed')).toBe('true');

    const gasASel = host.querySelector('#particle-mix-gas-a-select');
    const molesASel = host.querySelector('#particle-mix-moles-a-select');
    const gasBSel = host.querySelector('#particle-mix-gas-b-select');
    const molesBSel = host.querySelector('#particle-mix-moles-b-select');
    await act(async () => {
      gasASel.value = 'He';
      gasASel.dispatchEvent(new Event('change', { bubbles: true }));
      molesASel.value = '2';
      molesASel.dispatchEvent(new Event('change', { bubbles: true }));
      gasBSel.value = 'CO2';
      gasBSel.dispatchEvent(new Event('change', { bubbles: true }));
      molesBSel.value = '0.5';
      molesBSel.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });

    const drawer = host.querySelector('#particle-calc-drawer');
    expect(drawer.textContent).toContain("Dalton's Law Binary Mixture");
    expect(drawer.textContent).toContain('x=0.80');
    expect(drawer.textContent).toContain('v_A/v_B 3.32x');

    const overWaterBtn = host.querySelector('#particle-mix-overwater-btn');
    await act(async () => {
      overWaterBtn.click();
      await settle();
    });
    expect(overWaterBtn.getAttribute('aria-pressed')).toBe('true');
    expect(overWaterBtn.textContent).toContain('Collected Over H\u2082O: ON');
    expect(overWaterBtn.textContent).toContain('mmHg');

    await act(async () => {
      host.querySelector('#particle-calc-stage-mixture-btn').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.preset).toBe('diffusion');
    expect(latestToolData.particleLab3d.membrane).toBe(true);
    expect(latestToolData.particleLab3d.permeability).toBe(0);
    expect(latestToolData.particleLab3d.massRatioB).toBe(3);

    await act(async () => {
      host.querySelector('#particle-calc-cite-btn').click();
      await settle();
    });
    const obsVal = host.querySelector('#particle-observation-input').value;
    expect(obsVal).toContain('Dalton Mixture (He 2 mol + CO\u2082 0.5 mol');
    expect(obsVal).toContain('over H\u2082O');
    expect(obsVal).toContain('P_H2O=');
  });

  it('imports classroom lab bench CSV/TSV datasets onto Parametric Sweep fit and plots violet import markers', async () => {
    const csvDetails = host.querySelector('#particle-import-csv-details');
    expect(csvDetails).toBeTruthy();
    csvDetails.open = true;

    const csvInput = host.querySelector('#particle-import-csv-input');
    const setTextarea = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      setTextarea.call(csvInput, 'invalid text\nonly one');
      csvInput.dispatchEvent(new Event('input', { bubbles: true }));
      csvInput.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-apply-csv-import-btn').click();
      await settle();
    });
    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('Could not import table'), 'info');

    const axisSelect = host.querySelector('#particle-sweep-axis-select');
    await act(async () => {
      axisSelect.value = 'gayLussacPT';
      axisSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      host.querySelector('#particle-load-sample-csv-btn').click();
      await settle();
    });
    expect(csvInput.value).toContain('Temperature (K), Pressure (u)');

    await act(async () => {
      host.querySelector('#particle-apply-csv-import-btn').click();
      await settle();
    });

    expect(latestToolData.particleLab3d.experimentLog).toHaveLength(5);
    expect(latestToolData.particleLab3d.experimentLog.every((r) => r.source === 'import')).toBe(true);
    const sweepCard = host.querySelector('#particle-parametric-sweep-card');
    expect(sweepCard.textContent).toContain('R\u00B2 = 0.9999');
    const importCircles = sweepCard.querySelectorAll('svg circle[fill="#c084fc"]');
    expect(importCircles.length).toBe(5);
    const dataTable = host.querySelector('#particle-sweep-data-table');
    expect(dataTable.textContent).toContain('import');
  });

  it('launches NGSS and AP Lesson Guides one-click workspaces and copies full facilitation plans', async () => {
    const lessonsToggle = host.querySelector('#particle-lessons-toggle-btn');
    expect(lessonsToggle).toBeTruthy();
    await act(async () => {
      lessonsToggle.click();
      await settle();
    });
    const drawer = host.querySelector('#particle-lessons-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer.querySelectorAll('article[data-lesson-id]').length).toBe(4);

    await act(async () => {
      host.querySelector('#particle-launch-lesson-ap_chem_gas_mixtures').click();
      await settle();
    });
    expect(latestToolData.particleLab3d.activeProtocol).toBe('mixing');
    expect(latestToolData.particleLab3d.dataStudioAxis).toBe('grahamMass');
    expect(latestToolData.particleLab3d.workbenchDomain).toBe('pinned');
    expect(latestToolData.particleLab3d.pinnedWorkbenchIds).toContain('parametric_sweep');
    expect(host.querySelector('#particle-prediction-input').value).toContain('Species B is 2.25x heavier');

    await act(async () => {
      host.querySelector('#particle-copy-lesson-ap_chem_gas_mixtures').click();
      await settle();
    });
    const copiedPlan = String(copySpy.mock.calls[copySpy.mock.calls.length - 1][0]);
    expect(copiedPlan).toContain('# AP Chem 3.4\u20133.6');
    expect(copiedPlan).toContain('Exit Ticket');
  });

  it('persists empirically resolved misconceptions across protocol switches and round-trips Wave 16 state via Session JSON', async () => {
    // Unmount the default mount cleanly so document queries in the local runner only see one Particle Lab 3D instance.
    act(() => root.unmount());
    root = null;
    host.remove();
    host = null;
    resetStemLab();

    const heavy = loadTool('stem_lab/stem_tool_particlelab3d.js', 'particleLab3d');
    const heavyIdea = window.__alloParticleLabPure.commonIdeas.find((idea) => idea.id === 'heavy');
    window.StemLab.ensureThree = () => Promise.reject(new Error('blocked'));
    const noop = new Proxy(function () {}, {
      get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : (key === 'width' ? 10 : noop)),
      apply: () => noop,
      set: () => true,
    });
    const realGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind) { return kind === '2d' ? noop : null; };

    let localData = { particleLab3d: {} };
    const LocalApp = () => {
      const [toolData, setToolData] = React.useState({ particleLab3d: {} });
      localData = toolData;
      return heavy.render(makeCtx({
        toolData,
        setToolData,
        setStemLabTool: activeToolSpy,
        setStemLabTab: activeTabSpy,
        addToast: toastSpy,
      }));
    };
    const localHost = document.createElement('div');
    document.body.appendChild(localHost);
    const localRoot = ReactDOMClient.createRoot(localHost);
    try {
      await act(async () => {
        localRoot.render(React.createElement(LocalApp));
        await settle();
      });

      const heavyBtn = localHost.querySelector(`button[aria-label="Test this idea: ${heavyIdea.idea}"]`);
      await act(async () => {
        heavyBtn.click();
        await settle();
      });
      await act(async () => {
        findButton(localHost, '\u25B6 Run').click();
        await settle();
      });

      await vi.waitFor(async () => {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
        expect(localData.particleLab3d.ideasResolved && localData.particleLab3d.ideasResolved.heavy).toBe(true);
      }, { timeout: 20000, interval: 0 });

      expect(localHost.querySelector('[data-idea-resolved="heavy"]')).toBeTruthy();

      // Switch manually to Compression protocol (clears activeIdea) — empirical verification badge must remain!
      const compressionBtn = findButton(localHost, 'Compression');
      await act(async () => {
        compressionBtn.click();
        await settle();
      });
      expect(localData.particleLab3d.activeIdea).toBe('');
      expect(localData.particleLab3d.ideasResolved.heavy).toBe(true);
      expect(localHost.querySelector('[data-idea-resolved="heavy"]')).toBeTruthy();
      expect(localHost.querySelector('#particle-common-ideas').textContent).toContain('1/7 verified');

      const rubric = localHost.querySelector('#particle-mastery-rubric-details');
      rubric.open = true;
      expect(rubric.textContent).toContain('\u2713 PS1.A/PS3.A');

      // Also enable Dalton mixture mode and round-trip via Session JSON Import/Export
      await act(async () => {
        localHost.querySelector('#particle-calc-toggle-btn').click();
        await settle();
      });
      await act(async () => {
        localHost.querySelector('#particle-calc-mode-mixture').click();
        await settle();
      });
      await act(async () => {
        const naSel = localHost.querySelector('#particle-mix-moles-a-select');
        naSel.value = '2';
        naSel.dispatchEvent(new Event('change', { bubbles: true }));
        localHost.querySelector('#particle-mix-overwater-btn').click();
        await settle();
      });

      await act(async () => {
        localHost.querySelector('#particle-session-json-toggle-btn').click();
        await settle();
      });
      await act(async () => {
        localHost.querySelector('#particle-copy-session-json-btn').click();
        await settle();
      });
      const exportedJson = String(copySpy.mock.calls[copySpy.mock.calls.length - 1][0]);
      const parsedExport = JSON.parse(exportedJson);
      expect(parsedExport.ideasResolved).toEqual({ heavy: true });
      expect(parsedExport.calcMode).toBe('mixture');
      expect(parsedExport.mixMolesA).toBe(2);
      expect(parsedExport.mixOverWater).toBe(true);

      // Mutate state away, then import exported JSON back
      await act(async () => {
        localHost.querySelector('#particle-calc-mode-single').click();
        await settle();
      });
      const jsonArea = localHost.querySelector('#particle-import-session-json-input');
      const setTextarea = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      await act(async () => {
        setTextarea.call(jsonArea, exportedJson);
        jsonArea.dispatchEvent(new Event('input', { bubbles: true }));
        jsonArea.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
      });
      await act(async () => {
        localHost.querySelector('#particle-apply-session-json-btn').click();
        await settle();
      });
      expect(localData.particleLab3d.calcMode).toBe('mixture');
      expect(localData.particleLab3d.mixMolesA).toBe(2);
      expect(localData.particleLab3d.mixOverWater).toBe(true);
      expect(localData.particleLab3d.ideasResolved).toEqual({ heavy: true });
      expect(localHost.querySelector('#particle-calc-mode-mixture').getAttribute('aria-pressed')).toBe('true');
    } finally {
      HTMLCanvasElement.prototype.getContext = realGetContext;
      act(() => localRoot.unmount());
      localHost.remove();
    }
  }, 30000);
});
