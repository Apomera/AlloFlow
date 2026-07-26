// Shared reader for tests/QUARANTINE.txt — the known-failing-test allowlist (audit finding H1).
//
// The blocking CI job used to run the whole suite with no allowlist while ~271 assertions were
// already red, which meant the one blocking regression gate could not change colour and therefore
// gated nothing. This file is the single parser both the shard runner and the anti-rot guard use,
// so they can never disagree about what is quarantined.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUARANTINE_FILE = path.join(ROOT, 'tests', 'QUARANTINE.txt');

// Entries look like:  tests/foo.test.js  # 3 failing · some test name
// A note containing the word FLAKY marks a test that fails only under full-suite load or depends on
// the network. Those are excluded from the blocking job like any other entry, but the anti-rot guard
// must NOT demand they be removed when they pass — passing sometimes is what flaky means, and
// enforcing it would generate a permanent false chore, which is how allowlists die.
function readQuarantineEntries() {
  if (!fs.existsSync(QUARANTINE_FILE)) return [];
  return fs.readFileSync(QUARANTINE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((line) => {
      const hash = line.indexOf('#');
      const p = (hash === -1 ? line : line.slice(0, hash)).trim();
      const note = hash === -1 ? '' : line.slice(hash + 1).trim();
      return { path: p.replace(/\\/g, '/'), note, flaky: /\bFLAKY\b/i.test(note) };
    })
    .filter((e) => e.path.length > 0);
}

function readQuarantine() {
  return readQuarantineEntries().map((e) => e.path);
}

module.exports = { ROOT, QUARANTINE_FILE, readQuarantine, readQuarantineEntries };
