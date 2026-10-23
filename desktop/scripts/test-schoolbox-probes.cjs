'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setImmediate: nextTurn } = require('node:timers/promises');
const { test } = require('node:test');

test('slow Docker probes keep the event loop responsive, share work, and refresh before actions', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-probe-test-'));
  const previousHome = process.env.ALLOFLOW_DESKTOP_HOME;
  process.env.ALLOFLOW_DESKTOP_HOME = home;
  const calls = [];
  t.mock.method(childProcess, 'execFile', (command, args, options, callback) => {
    assert.equal(command, 'docker');
    assert.equal(options.timeout, 5000);
    assert.equal(options.windowsHide, true);
    calls.push({ args, callback });
    return {};
  });
  try {
    const runtime = require('../runtime/alloflow-desktop-runtime.cjs');
    const config = structuredClone(runtime.DEFAULT_CONFIG);
    const pending = [runtime.getSchoolBoxStatus(config), runtime.getSchoolBoxStatus(config)];
    await nextTurn(); // Must run while the version command is still pending.
    assert.equal(calls.length, 1, 'Concurrent health requests must share one Docker probe');
    assert.deepEqual(calls[0].args, ['--version']);
    calls.shift().callback(null, 'Docker version test', '');
    await nextTurn();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args, ['compose', 'version']);
    calls.shift().callback(null, 'Docker Compose version test', '');
    const statuses = await Promise.all(pending);
    assert.ok(statuses.every((status) => status.docker.available));
    assert.equal((await runtime.getSchoolBoxStatus(config)).docker.available, true);
    assert.equal(calls.length, 0, 'Repeated status polling must use the short-lived cache');

    const action = runtime.runSchoolBoxCompose('up', config);
    const rejectedAction = assert.rejects(action, /Docker unavailable during test/);
    assert.equal(calls.length, 1, 'A server action must recheck Docker despite a cached success');
    calls.shift().callback(new Error('Docker unavailable during test'), '', '');
    await rejectedAction;
    const unavailable = await runtime.getSchoolBoxStatus(config);
    assert.equal(unavailable.docker.available, false);
    assert.match(unavailable.docker.error, /Docker unavailable/);
    assert.equal(calls.length, 0, 'A missing Docker executable must not trigger Compose');

    const now = Date.now();
    t.mock.method(Date, 'now', () => now + 16000);
    const expired = runtime.getSchoolBoxStatus(config);
    assert.equal(calls.length, 1, 'Status polling must retry after the cache expires');
    calls.shift().callback(new Error('Docker still unavailable'), '', '');
    assert.equal((await expired).docker.available, false);
  } finally {
    if (previousHome === undefined) delete process.env.ALLOFLOW_DESKTOP_HOME;
    else process.env.ALLOFLOW_DESKTOP_HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
  }
});
