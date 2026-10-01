// Run from repository root. Loads the current unmodified model in Chromium.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  let browser;
  const watchdog = setTimeout(() => {
    console.error('Browser probe exceeded its 45-second limit; closing Chromium.');
    if (browser) browser.close().finally(() => process.exit(1));
    else process.exit(1);
  }, 45000);
  const hardLimit = setTimeout(() => process.exit(1), 60000);
  try {
    browser = await chromium.launch({ headless: true, timeout: 20000 });
    const version = browser.version();
    const page = await browser.newPage();
    await page.addScriptTag({ path: path.resolve('stem_lab/stem_tool_circuit.js') });
    const measurements = [];
    for (const count of [1, 4]) {
      const measurement = await page.evaluate(count => {
        const components = [{ id: 1, type: 'voltage', a: 'A', b: '0', value: 0,
          waveform: { shape: 'sine', amplitude: 1, frequency: 10 } }];
        for (let k = 0; k < count; k++) {
          const node = 'BCDE'[k];
          components.push({ id: k + 2, type: 'opamp', a: node, b: '0', value: 100000,
            control: { positive: 'A', negative: node } });
        }
        const start = performance.now();
        const result = window.StemLab.circuitNetworkTransient({ duration: 0.3, components });
        return { count, ms: performance.now() - start, ok: result.ok,
          steps: result.steps, frames: result.frames.length, rejected: result.rejected };
      }, count);
      measurements.push(measurement);
      console.log(JSON.stringify({ engine: 'Chromium', version, ...measurement }));
    }
    const outputPath = path.join(__dirname, 'model-results.json');
    const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    result.browserMeasurements = { engine: 'Chromium', version,
      context: 'Headless blank page; current source loaded with page.addScriptTag; model executed synchronously on the browser main thread. A full circuit test suite was running concurrently.',
      measurements };
    result.timingInterpretation = 'Use browserMeasurements for the browser finding. Direct Node and VM timings are retained for comparison. This measures model execution, not host rendering, and confirms that the calculation alone occupies the browser main thread.';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  } finally {
    clearTimeout(watchdog);
    if (browser) await browser.close();
    clearTimeout(hardLimit);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
