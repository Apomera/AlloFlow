import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_wave.js',
  toolId: 'wave',
  width: 1000,
  height: 900,
  layout: 'document',
  appStyles: true,
});

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mountWave(page: Page, gradeLevel = '8th Grade') {
  await harness.mount(page, {
    wave: {
      waveMode: 'free',
      waveType: 'sine',
      amplitude: 50,
      frequency: 2,
      waveSpeed: 343,
      paused: true,
      tourStep: -1,
    },
  }, undefined, { expectCanvas: false });
  await page.waitForSelector('canvas[data-wave-canvas="true"]');
  await page.evaluate((g) => {
    (window as any).__xpEvents = [];
    (window as any).__spoken = '';
    (window as any).__switchedTool = null;
    (window as any).__ctx.gradeLevel = g;
    (window as any).__ctx.setStemLabTool = (id: string) => {
      (window as any).__switchedTool = id;
    };
    (window as any).__ctx.callTTS = (msg: string) => {
      (window as any).__spoken = msg;
    };
    (window as any).__ctx.awardXP = (id: string, xp: number) => {
      (window as any).__xpEvents.push({ id, xp });
    };
    (window as any).__rerender();
  }, gradeLevel);
}

test('UDL workspace bar, medium presets, Two-Medium Reflection & Supersonic Mach cone', async ({ page }) => {
  await mountWave(page, '8th Grade');

  const wsBar = page.locator('[data-wave-workspace-bar]');
  await expect(wsBar).toBeVisible();

  // Switch UDL grade bands 3-5 -> 9-12 and verify coach banner updates
  await page.locator('[data-wave-band="3-5"]').click();
  await expect(page.locator('[data-wave-coach-banner]')).toContainText('Coach (3-5)');
  await page.locator('[data-wave-band="9-12"]').click();
  await expect(page.locator('[data-wave-coach-banner]')).toContainText('Coach (9-12)');

  // Select Water physical medium preset (1482 m/s) and verify live telemetry + Read Aloud TTS
  await page.locator('[data-wave-medium="water"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.wave.waveSpeed)).toBe(1482);
  await page.locator('[data-wave-tts-btn]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__spoken)).toContain('1482 meters per second');

  // Switch to Reflection mode: verify dedicated hero banner & Slower Medium 2 transmission preset
  await page.locator('[data-wave-mode="reflection"]').click();
  await expect(page.locator('[data-wave-hero="reflection"]')).toBeVisible();
  await expect(page.locator('[data-wave-hero="reflection"]')).toContainText('Reflection & Refraction');
  await page.getByRole('button', { name: /slow glass interface/i }).click();
  await expect(page.locator('[data-wave-reflection-controls]')).toContainText('Transmitted E: 75%');

  // Switch to Doppler mode: select 1.3 Mach Cone preset & verify shock cone angle
  await page.locator('[data-wave-mode="doppler"]').click();
  await page.getByRole('button', { name: /1\.3 Mach Cone/i }).click();
  await expect(page.locator('[data-wave-mach-badge]')).toContainText('50.3°');
});

test('Interactive Wave Probe canvas drag and Wave Engineering Mission verification', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // Toggle Probe ON and scroll canvas into view
  await page.locator('[data-wave-probe-toggle]').click();
  const probePanel = page.locator('[data-wave-probe-panel]');
  await expect(probePanel).toBeVisible();

  const canvas = page.locator('canvas[data-wave-canvas="true"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const startX = box!.x + box!.width * 0.62;
  const startY = box!.y + box!.height * 0.32;
  const endX = box!.x + box!.width * 0.35;
  const endY = box!.y + box!.height * 0.55;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 6 });
  await page.mouse.up();

  await expect.poll(() => page.evaluate(() => (window as any).__toolData.wave.probeX)).toBeLessThan(0.42);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.wave.probeY)).toBeGreaterThan(0.45);

  // Switch to Missions tab -> load Mach Cone mission starter -> set 1.3 Mach -> verify pass
  await page.locator('[data-wave-tab="missions"]').click();
  const missionsPanel = page.locator('[data-wave-missions-panel]');
  await expect(missionsPanel).toBeVisible();

  await missionsPanel.locator('[data-wave-mission-select="mission_mach_cone"]').click();
  await missionsPanel.locator('[data-wave-mission-starter]').click();
  await page.getByRole('button', { name: /1\.3 Mach Cone/i }).click();
  await missionsPanel.locator('[data-wave-mission-verify]').click();

  await expect(missionsPanel.locator('[data-wave-mission-feedback="pass"]')).toBeVisible();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('1 / 22');
});

test('Experiment Log, Data Studio scatter plot handoff, CER live insert & Cross-Tool Bridges', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // Log Trial 1 in Air (343 m/s), switch to Helium (1007 m/s) and Log Trial 2
  await page.locator('[data-wave-log-trial]').click();
  await page.locator('[data-wave-medium="helium"]').click();
  await page.locator('[data-wave-log-trial]').click();

  // Open Analyze & Log tab, verify 2 rows & open Data Studio handoff
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await expect(analyzePanel).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(2);

  await analyzePanel.locator('[data-wave-open-datastudio]').click();
  const dsState = await page.evaluate(() => ({
    switched: (window as any).__switchedTool,
    ds: (window as any).__toolData._dataStudio,
  }));
  expect(dsState.switched).toBe('dataStudio');
  expect(dsState.ds.chartType).toBe('scatter');
  expect(dsState.ds.dataRows).toHaveLength(2);

  // Open CER & Bridges tab, insert live data, save CER & navigate to Optics Lab
  await page.locator('[data-wave-tab="notebook"]').click();
  const nbPanel = page.locator('[data-wave-notebook-panel]');
  await expect(nbPanel).toBeVisible();

  await nbPanel.locator('#wave-cerClaim').fill('Waves travel faster in helium so wavelength increases at constant frequency.');
  await nbPanel.locator('[data-wave-cer-insert]').click();
  await expect(nbPanel.locator('#wave-cerEvidence')).toContainText('v=1007m/s');
  await nbPanel.locator('#wave-cerReasoning').fill('Since v = f * lambda and frequency f is unchanged, higher v yields longer wavelength lambda.');
  await nbPanel.locator('[data-wave-cer-save]').click();

  await expect.poll(() => page.evaluate(() => (window as any).__toolData.wave.waveMastery.cer_completed)).toBe(true);

  await nbPanel.locator('[data-wave-bridge="opticsLab"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__switchedTool)).toBe('opticsLab');
});

test('Standing boundaries, Double-Slit I(y) screen, Custom Fourier, Fiber-Optic TIR & Library Try-in-Sim', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Standing boundary selector -> Closed Pipe + Harmonic 2 -> pass mission_closed_pipe
  await page.locator('[data-wave-mode="standing"]').click();
  await page.locator('[data-wave-standing-boundary="fixedFree"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-standing-boundary', 'fixedFree');
  await page.getByRole('button', { name: '2', exact: true }).click();

  await page.locator('[data-wave-tab="missions"]').click();
  const missionsPanel = page.locator('[data-wave-missions-panel]');
  await missionsPanel.locator('[data-wave-mission-select="mission_closed_pipe"]').click();
  await missionsPanel.locator('[data-wave-mission-verify]').click();
  await expect(missionsPanel.locator('[data-wave-mission-feedback="pass"]')).toBeVisible();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('1 / 22');

  // 2. Ripple tank Double Slit + I(y) Detector Screen
  await page.locator('[data-wave-tab="explore"]').click();
  await page.locator('[data-wave-mode="ripple"]').click();
  await page.locator('[data-wave-ripple-barrier="doubleSlit"]').click();
  await page.locator('[data-wave-intensity-toggle]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-ripple-barrier', 'doubleSlit');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-intensity-screen', 'true');

  // 3. Custom Fourier builder -> Clarinet preset
  await page.locator('[data-wave-mode="free"]').click();
  await page.locator('[data-wave-type-btn="custom"]').click();
  await expect(page.locator('[data-wave-fourier-builder]')).toBeVisible();
  await page.locator('[data-wave-fourier-preset="clarinet"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-wave-type', 'custom');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-harmonic-weights', '1,0,0.75,0,0.45,0');

  // 4. Reflection Fiber-Optic TIR preset & badge
  await page.locator('[data-wave-mode="reflection"]').click();
  await page.locator('[data-wave-tir-preset]').click();
  await expect(page.locator('[data-wave-tir-badge]')).toBeVisible();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-incident-angle', '55');

  // 5. Reference Library Try-in-Simulator deep-link
  await page.locator('[data-wave-tab="library"]').click();
  await page.getByRole('button', { name: /Sound & Music/i }).click();
  await page.getByRole('button', { name: /Standing waves/i }).click();
  await page.locator('[data-wave-try-sim="inst_closed_pipe"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-wave-mode', 'standing');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-standing-boundary', 'fixedFree');
});

test('Wave 3: Wave packet dispersion, Kundt standing tube, Probe oscilloscope SVG, Doppler observer & Parametric sweep', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Free mode Wave Packet + 0.5x Normal Dispersion -> verify canvas attributes & readout
  await page.locator('[data-wave-packet-mode="packet"]').click();
  await page.locator('[data-wave-disp-preset="0.5"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-packet-mode', 'packet');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-dispersion-ratio', '0.5');
  await expect(page.locator('[data-wave-dispersion-readout]')).toContainText('0.50');

  // 2. Longitudinal Kundt Standing Tube + Δx vs ΔP toggle + Harmonic 3 -> pass mission_kundt_tube
  await page.locator('[data-wave-mode="longitudinal"]').click();
  await page.locator('[data-wave-longitudinal-mode="standing"]').click();
  await page.locator('[data-wave-kundt-harmonic="3"]').click();
  await page.locator('[data-wave-disp-curve-toggle]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-longitudinal-mode', 'standing');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-displacement-curve', 'true');
  await expect(page.locator('[data-wave-spl-badge]')).toContainText('dB SPL');

  await page.locator('[data-wave-tab="missions"]').click();
  const missionsPanel = page.locator('[data-wave-missions-panel]');
  await missionsPanel.locator('[data-wave-mission-select="mission_kundt_tube"]').click();
  await missionsPanel.locator('[data-wave-mission-verify]').click();
  await expect(missionsPanel.locator('[data-wave-mission-feedback="pass"]')).toBeVisible();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('1 / 22');

  // 3. Probe kinematics + live Oscilloscope SVG
  await page.locator('[data-wave-tab="explore"]').click();
  await page.locator('[data-wave-probe-toggle]').click();
  const probePanel = page.locator('[data-wave-probe-panel]');
  await expect(probePanel.locator('[data-wave-probe-vmax]')).toBeVisible();
  await expect(probePanel.locator('[data-wave-probe-amax]')).toBeVisible();
  await expect(probePanel.locator('svg[data-wave-probe-oscilloscope="true"] polyline')).toBeVisible();

  // 4. Doppler moving observer preset
  await page.locator('[data-wave-mode="doppler"]').click();
  await page.locator('[data-wave-obs-preset="0.4"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-observer-speed', '0.4');
  await expect(page.locator('[data-wave-doppler-approaching]')).toContainText('4.0 Hz');

  // 5. Analyze Multi-Axis Plotter + 5-Point Sweep -> Data Studio
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="ampEnergy"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(5);
  await analyzePanel.locator('[data-wave-open-datastudio]').click();
  const dsOut = await page.evaluate(() => ({
    switched: (window as any).__switchedTool,
    ds: (window as any).__toolData._dataStudio,
  }));
  expect(dsOut.switched).toBe('dataStudio');
  expect(dsOut.ds.dataRows).toHaveLength(5);
  expect(dsOut.ds.yAxisLabel).toContain('Energy');
});

test('Wave 4: Phased-Array steering, Fresnel AR coating, Lissajous scope & Discover Law inquiry sync', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Probe XY Lissajous toggle
  await page.locator('[data-wave-probe-toggle]').click();
  await page.locator('[data-wave-probe-scope="lissajous"]').click();
  await expect(page.locator('svg[data-wave-probe-lissajous="true"] polyline')).toBeVisible();

  // 2. Ripple Phased-Array preset & Mission 11
  await page.locator('[data-wave-mode="ripple"]').click();
  await page.locator('[data-wave-intensity-toggle]').click();
  await page.locator('[data-wave-phase-preset="90"]').click();
  await expect(page.locator('[data-wave-beam-steer-badge]')).toBeVisible();
  await page.locator('[data-wave-tab="missions"]').click();
  const missionsPanel = page.locator('[data-wave-missions-panel]');
  await missionsPanel.locator('[data-wave-mission-select="mission_phased_array"]').click();
  await missionsPanel.locator('[data-wave-mission-verify]').click();
  await expect(missionsPanel.locator('[data-wave-mission-feedback="pass"]')).toBeVisible();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('1 / 22');

  // 3. Reflection Fresnel Impedance Lock + lambda/4 AR coating & Mission 12
  await page.locator('[data-wave-tab="explore"]').click();
  await page.locator('[data-wave-mode="reflection"]').click();
  await page.locator('[data-wave-impedance-lock]').click();
  await page.locator('[data-wave-ar-coating]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-impedance-coupled', 'true');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-anti-reflection-coating', 'true');
  await expect(page.locator('[data-wave-swr-badge]')).toBeVisible();

  await page.locator('[data-wave-tab="missions"]').click();
  await missionsPanel.locator('[data-wave-mission-select="mission_antireflection"]').click();
  await missionsPanel.locator('[data-wave-mission-verify]').click();
  await expect(missionsPanel.locator('[data-wave-mission-feedback="pass"]')).toBeVisible();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('2 / 22');

  // 4. Investigate -> Discover v = f*lambda -> I see it -> mastery sync -> Back to Live Simulator
  await page.locator('[data-wave-tab="explore"]').click();
  await page.locator('[data-wave-investigate="discoverWave"]').click();
  await page.getByRole('button', { name: /i see it/i }).click();
  await expect(page.locator('[data-wave-mastery-pill]')).toContainText('3 / 22');
  await page.locator('[data-wave-back-to-sim]').click();
  await expect(page.locator('[data-wave-canvas]')).toBeVisible();
});

test('Wave 5: λ-Caliper ruler, keyboard probe nudge, Doppler fly-by, Analyze SVG plot & Bridge handoffs', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. λ-Caliper toggle & snap buttons
  await page.locator('[data-wave-ruler-toggle]').click();
  await expect(page.locator('[data-wave-ruler-panel]')).toBeVisible();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-ruler', 'true');
  await page.locator('[data-wave-ruler-snap="0.5"]').click();
  await expect(page.locator('[data-wave-ruler-readout]')).toContainText('0.50\u03BB');
  await page.locator('[data-wave-ruler-snap="1"]').click();
  await expect(page.locator('[data-wave-ruler-readout]')).toContainText('1.00\u03BB');

  // 2. Canvas Shift+Arrow probe nudge
  const canvas = page.locator('[data-wave-canvas]');
  await canvas.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('[data-wave-probe-panel]')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-probe-x', '0.64');

  // 3. Doppler Fly-By sweep button
  await page.locator('[data-wave-mode="doppler"]').click();
  await expect(page.locator('[data-wave-doppler-flyby]')).toBeVisible();
  await page.locator('[data-wave-doppler-flyby]').click();

  // 4. Analyze inline SVG scatter plot + dynamic columns
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="dopplerMach"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('svg[data-wave-inline-plot="true"]')).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-inline-r2]')).toContainText('R\u00B2');
  await expect(analyzePanel.locator('[data-wave-log-table] thead')).toContainText('Mach M');

  // 5. CER notebook mode evidence + live Cross-Tool Bridge handoffs
  await page.locator('[data-wave-mode="reflection"]').click();
  await page.locator('[data-wave-tab="notebook"]').click();
  await page.locator('[data-wave-cer-insert]').click();
  await expect(page.locator('#wave-cerEvidence')).toHaveValue(/\[reflection\]/);

  await page.locator('[data-wave-bridge="opticsLab"]').click();
  const opticsOut = await page.evaluate(() => ({
    switched: (window as any).__switchedTool,
    optics: (window as any).__toolData.opticsLab,
  }));
  expect(opticsOut.switched).toBe('opticsLab');
  expect(opticsOut.optics.mode).toBe('refraction');
  expect(opticsOut.optics.refrN1).toBe(1);

  await page.locator('[data-wave-bridge="musicSynth"]').click();
  const musicOut = await page.evaluate(() => ({
    switched: (window as any).__switchedTool,
    music: (window as any).__toolData.musicSynth,
  }));
  expect(musicOut.switched).toBe('musicSynth');
  expect(musicOut.music.synthTab).toBe('play');
});

test('Wave 6 standing Mersenne bench, N-slit grating, pulse collision, harmonic filter, sonar echo & snapshot tray work end-to-end', async ({ page }) => {
  await mountWave(page, '8th Grade');
  await page.locator('[data-wave-mode="standing"]').click();

  // 1. Standing String Mersenne Bench + disengage via Medium preset
  const stringBench = page.locator('[data-wave-string-bench="true"]');
  await expect(stringBench).toBeVisible();
  await stringBench.locator('[data-wave-string-preset="violin_a4"]').click();
  await expect(page.locator('[data-wave-mersenne-readout]')).toContainText('v = 200.0 m/s');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-speed', '1');
  await page.locator('[data-wave-medium="water"]').click();
  const afterWater = await page.evaluate(() => (window as any).__toolData.wave);
  expect(afterWater.stringMechanics).toBe(false);
  expect(afterWater.waveSpeed).toBe(1482);

  // 2. Ripple N-Slit Diffraction Grating + phased array + probe intensity
  await page.locator('[data-wave-mode="ripple"]').click();
  await page.locator('[data-wave-ripple-barrier="grating"]').click();
  await page.locator('[data-wave-grating-slits="5"]').click();
  await expect(page.locator('[data-wave-grating-badge]')).toContainText('5 slits');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-grating-slits', '5');
  await expect(page.locator('[data-wave-phased-array-controls]')).toBeVisible();

  // 3. Free Pulse Collision + Pause at Overlap
  await page.locator('[data-wave-mode="free"]').click();
  await page.locator('[data-wave-packet-mode="collide"]').click();
  await page.locator('[data-wave-collide-polarity="same"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-packet-mode', 'collide');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-collide-polarity', 'same');
  await page.locator('[data-wave-collide-snap="true"]').click();
  const afterSnap = await page.evaluate(() => (window as any).__toolData.wave);
  expect(afterSnap.paused).toBe(true);

  // 4. Spectrum Harmonic Filter Bench + Snapshot Save/Mutate/Restore/Clear
  await page.locator('[data-wave-mode="spectrum"]').click();
  await page.locator('[data-wave-type-btn="square"]').click();
  await expect(page.locator('[data-wave-filter-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-filter-mode="lowpass"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-spectrum-filter', 'lowpass');
  await expect(page.locator('[data-wave-filter-cutoff]')).toBeVisible();

  // Save snapshot in Spectrum+Square state, mutate to Reflection + check sonar badge, then restore!
  await page.locator('[data-wave-snapshot-btn="true"]').click();
  await expect(page.locator('[data-wave-snapshots-tray="true"]')).toBeVisible();
  await page.locator('[data-wave-mode="reflection"]').click();
  await expect(page.locator('[data-wave-sonar-badge="true"]')).toContainText('Echo:');
  await page.locator('[data-wave-snapshot-restore]').first().click();
  const afterRestore = await page.evaluate(() => (window as any).__toolData.wave);
  expect(afterRestore.waveMode).toBe('spectrum');
  expect(afterRestore.spectrumFilter).toBe('lowpass');
  await page.locator('[data-wave-snapshots-clear="true"]').click();
  await expect(page.locator('[data-wave-snapshots-tray="true"]')).toHaveCount(0);
});

test('Wave 7: Fresnel Brewster TM polarization, relativistic Doppler spectrograph, pluck harmonic sculptor, thermal sound speed & Analyze sweep', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Reflection -> Snap theta_B -> verify TM p-polarization & Brewster R=0% badge
  await page.locator('[data-wave-mode="reflection"]').click();
  await page.locator('[data-wave-snap-brewster="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-fresnel-polarization', 'p');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-brewster-match', 'true');
  await expect(page.locator('[data-wave-brewster-match-badge="true"]')).toBeVisible();

  // 2. Doppler -> Light / EM (Relativistic c) -> verify H-alpha spectrograph & redshift badge
  await page.locator('[data-wave-mode="doppler"]').click();
  await page.locator('[data-wave-doppler-regime="relativistic"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-doppler-regime', 'relativistic');
  await expect(page.locator('[data-wave-halpha-spectrograph="true"]')).toBeVisible();
  await expect(page.locator('[data-wave-relativistic-badges="true"]')).toBeVisible();

  // 3. Standing -> Pluck String in Spectrum -> Center Pluck (50%) suppresses H2 & H4
  await page.locator('[data-wave-mode="standing"]').click();
  await page.locator('[data-wave-standing-to-spectrum="true"]').click();
  await expect(page.locator('[data-wave-pluck-sculptor="true"]')).toBeVisible();
  await page.locator('[data-wave-pluck-preset="center"]').click();
  const afterPluck = await page.evaluate(() => (window as any).__toolData.wave);
  expect(afterPluck.pluckPosition).toBe(0.5);
  expect(afterPluck.harmonicWeights[1]).toBe(0);

  // 4. Longitudinal -> Couple v_air(T) -> verify thermal speed 343.2 m/s at 20 C
  await page.locator('[data-wave-mode="longitudinal"]').click();
  await page.locator('[data-wave-air-temp-toggle="true"]').click();
  const afterTherm = await page.evaluate(() => (window as any).__toolData.wave);
  expect(afterTherm.airTempCoupled).toBe(true);
  expect(afterTherm.waveSpeed).toBe(343.2);

  // 5. Analyze -> Fresnel theta1 vs. R (%) -> Run 5-Point Sweep
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="fresnelBrewster"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('svg[data-wave-inline-plot="true"]')).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(5);
});

test('Wave 8: Driven Q-Resonator Bode curve, FTIR prism tunneling, Ocean depth dispersion & damping telemetry, Analyze sweeps & Quantum Library deep-link', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Standing Driven Q-Resonator & Lorentzian Bode curve
  await page.locator('[data-wave-mode="standing"]').click();
  await expect(page.locator('[data-wave-resonator-bench="true"]')).toBeVisible();
  await expect(page.locator('svg[data-wave-resonance-curve="true"]')).toBeVisible();
  await page.locator('[data-wave-harmonic="2"]').click();
  await page.locator('[data-wave-resonator-snap="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-resonator-driven', 'true');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-resonator-is-peak', 'true');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-drive-freq-ratio', '2');

  // 2. Reflection FTIR Optical Tunneling Bench
  await page.locator('[data-wave-mode="reflection"]').click();
  await expect(page.locator('[data-wave-ftir-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-ftir-toggle="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-ftir-enabled', 'true');
  await page.locator('[data-wave-ftir-preset="0.10"]').click();
  const tNarrow = Number(await page.locator('[data-wave-canvas]').getAttribute('data-tunnel-transmission-pct'));
  await page.locator('[data-wave-ftir-preset="1.00"]').click();
  const tWide = Number(await page.locator('[data-wave-canvas]').getAttribute('data-tunnel-transmission-pct'));
  expect(tNarrow).toBeGreaterThan(50);
  expect(tWide).toBeLessThan(tNarrow);

  // 3. Free Ocean Water-Depth Dispersion & Damping Attenuation Telemetry
  await page.locator('[data-wave-mode="free"]').click();
  await page.locator('[data-wave-packet-mode="packet"]').click();
  await expect(page.locator('[data-wave-ocean-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-ocean-preset="shallow"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-ocean-depth-coupled', 'true');
  await expect(page.locator('[data-wave-ocean-readout="true"]')).toContainText('SHALLOW');
  await page.getByRole('checkbox', { name: /Enable damping/i }).check();
  await page.locator('[data-wave-damping-preset="heavy"]').click();
  await expect(page.locator('[data-wave-damping-readout="true"]')).toContainText('dB');

  // 4. Analyze -> Resonator Drive Ratio vs. Gain 5-Point Sweep
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="resonanceCurve"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('svg[data-wave-inline-plot="true"]')).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(5);

  // 5. Library -> Quantum waves -> Evanescent Barrier Tunneling deep-link
  await page.locator('[data-wave-tab="library"]').click();
  await page.getByRole('button', { name: /EM Spectrum/i }).click();
  await page.getByRole('button', { name: /Quantum waves/i }).click();
  await page.locator('[data-wave-try-sim="quantum_tunneling"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-wave-mode', 'reflection');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-ftir-enabled', 'true');
});

test('Wave 9 consonance interval lock, 1/r² distance attenuation, ripple nodal hyperbolas, and inverse-square sweep work end-to-end', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Just-intonation 3:2 interval lock & beat envelope overlay
  await page.getByRole('checkbox', { name: /Show second wave/i }).check();
  await expect(page.locator('[data-wave-consonance-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-interval-btn="3:2"]').click();
  await expect(page.locator('[data-wave-consonance-readout="true"]')).toContainText('Just 3:2');
  await page.locator('[data-wave-beat-envelope-toggle="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-beat-envelope', 'true');

  // 2. Longitudinal 1/r² vs 1/r distance attenuation bench
  await page.locator('[data-wave-mode="longitudinal"]').click();
  await expect(page.locator('[data-wave-acoustic-dist-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-dist-atten-toggle="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-distance-attenuation', 'true');
  await page.locator('[data-wave-spreading-law="cylindrical"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-spreading-law', 'cylindrical');
  await expect(page.locator('[data-wave-dist-atten-readout="true"]')).toContainText('dB');

  // 3. Ripple tank analytical nodal-hyperbola overlay
  await page.locator('[data-wave-mode="ripple"]').click();
  await page.locator('[data-wave-ripple-barrier="doubleSlit"]').click();
  await page.locator('[data-wave-nodal-overlay-toggle="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-nodal-lines', 'true');
  await expect(page.locator('[data-wave-ripple-fringe-readout="true"]')).toContainText('\u0394y');

  // 4. Analyze -> Inverse-Square Distance dB 5-Point Sweep
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="inverseSquareDb"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('svg[data-wave-inline-plot="true"]')).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(5);
});

test('Wave 10 Nyquist/ADC sampling & aliasing, standing y+/y- decomposition, Doppler off-axis 90 deg transverse redshift, and Data Studio sweeps work end-to-end', async ({ page }) => {
  await mountWave(page, '8th Grade');

  // 1. Spectrum -> Sub-Nyquist Aliasing & ADC Quantization Bench
  await page.locator('[data-wave-mode="spectrum"]').click();
  await expect(page.locator('[data-wave-nyquist-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-nyquist-alias-demo="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-digital-sampling', 'true');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-sample-rate-ratio', '1.25');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-adc-bit-depth', '4');
  await expect(page.locator('[data-wave-nyquist-readout="true"]')).toContainText('ALIAS');

  // 2. Standing -> Counter-Propagating Traveling-Wave Decomposition y+ + y-
  await page.locator('[data-wave-mode="standing"]').click();
  await expect(page.locator('[data-wave-traveling-decomp-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-traveling-decomp-toggle="true"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-show-traveling-components', 'true');
  await expect(page.locator('[data-wave-traveling-decomp-readout="true"]')).toContainText('PE');

  // 3. Doppler -> Relativistic 90 deg Transverse Redshift
  await page.locator('[data-wave-mode="doppler"]').click();
  await page.locator('[data-wave-doppler-regime="relativistic"]').click();
  await expect(page.locator('[data-wave-doppler-offset-bench="true"]')).toBeVisible();
  await page.locator('[data-wave-doppler-angle-preset="90"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-doppler-offset-angle', '90');
  await expect(page.locator('[data-wave-doppler-offset-readout="true"]')).toContainText('time-dilation redshift');

  // 4. Analyze -> ADC Bits vs. SQNR 5-Point Sweep
  await page.locator('[data-wave-tab="analyze"]').click();
  const analyzePanel = page.locator('[data-wave-analyze-panel]');
  await analyzePanel.locator('[data-wave-ds-plot="adcBitSqnr"]').click();
  await analyzePanel.locator('[data-wave-run-sweep]').click();
  await expect(analyzePanel.locator('svg[data-wave-inline-plot="true"]')).toBeVisible();
  await expect(analyzePanel.locator('[data-wave-log-table] tbody tr')).toHaveCount(5);

  // 5. Library -> Audio Formats & Quality -> PCM Bit-Depth & Nyquist deep-link
  await page.locator('[data-wave-tab="library"]').click();
  await page.getByRole('button', { name: /Sound & Music/i }).click();
  await page.getByRole('button', { name: /Audio formats/i }).click();
  await page.locator('[data-wave-try-sim="recordings_nyquist_adc"]').click();
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-wave-mode', 'spectrum');
  await expect(page.locator('[data-wave-canvas]')).toHaveAttribute('data-digital-sampling', 'true');
});

