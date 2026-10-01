// Read-only model audit. Run from repository root with Node.
// Each performance case runs in a child process with a 60-second timeout.
const fs = require('node:fs');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const source = fs.readFileSync('stem_lab/stem_tool_circuit.js', 'utf8');

function load(mode) {
  if (mode === 'vm') {
    const context = { window: {}, document: { getElementById: () => true }, console: { log() {} } };
    vm.createContext(context);
    vm.runInContext(source, context);
    return context.window.StemLab;
  }
  global.window = {};
  global.document = { getElementById: () => true };
  const originalLog = console.log;
  console.log = () => {};
  try { new Function(source)(); } finally { console.log = originalLog; }
  return window.StemLab;
}

function followerNetwork(count) {
  const components = [{ id: 1, type: 'voltage', a: 'A', b: '0', value: 0,
    waveform: { shape: 'sine', amplitude: 1, frequency: 10 } }];
  for (let k = 0; k < count; k++) {
    const node = 'BCDE'[k];
    components.push({ id: k + 2, type: 'opamp', a: node, b: '0', value: 100000,
      control: { positive: 'A', negative: node } });
  }
  return { duration: 0.3, components };
}

if (process.argv[2] === '--case') {
  const mode = process.argv[3] || 'direct';
  const count = Number(process.argv[4] || 1);
  const model = load(mode);
  const start = performance.now();
  const result = model.circuitNetworkTransient(followerNetwork(count));
  console.log(JSON.stringify({ mode, count, ms: performance.now() - start,
    ok: result.ok, steps: result.steps, frames: result.frames.length, rejected: result.rejected }));
} else {
  for (const count of [1, 4]) {
    const result = spawnSync(process.execPath, [__filename, '--case', 'direct', String(count)],
      { encoding: 'utf8', timeout: 60000, windowsHide: true });
    console.log(result.stdout.trim() || JSON.stringify({ mode: 'direct', count,
      error: result.error && result.error.message, status: result.status, stderr: result.stderr }));
  }
  const model = load('direct');
  const input = { voltage: 12, signalMode: 'step', components: [
    { type: 'voltmeter', value: 1, branch: 1 },
    { type: 'inductor', value: 1, branch: 1 },
    { type: 'capacitor', value: 10000, branch: 1 }
  ] };
  const result = model.circuitTimeFrame(model.circuitTimeConfig(input), 0);
  console.log(JSON.stringify({ case: 'overdamped initial condition', input,
    expected: { current: 0, voltmeterVoltage: 0, inductorVoltage: 12, capacitorVoltage: 0 },
    actual: result.rows.map(row => ({ type: row.component.type, current: row.current, voltage: row.voltage })) }));
}
