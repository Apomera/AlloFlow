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

