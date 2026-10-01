'use strict';
const fs = require('node:fs'), path = require('node:path');
const dest = path.join(__dirname, 'completed-pass');
fs.mkdirSync(dest, { recursive: true });
const files = ['README.md', 'candidate.json', 'candidate-verification.json', 'validation-summary.json', 'reader-parity-tests.json', 'reader-adjacent-tests.json', 'reader-adjacent-validation.json', 'reader-browser-results.json', 'reader-verification.json', 'generation-tests.json', 'generation-validation-summary.json', 'audio-tests.json', 'audio-verification.json', 'api-tests.json', 'reporter-tests.json', 'storage-validation.json', 'storage-diagnosis.json', 'url-key-tests.json', 'url-key-validation.json', 'supporting-validation.json', 'build-reader.json', 'build-core.json', 'build-audio.json', 'build-recovery.json', 'build-url.json', 'proposal-validation.json', 'audio-host-proposal.patch', 'generation-host-proposal.patch', 'flow-host-proposal.patch', 'security-host-proposal.patch', 'module-pins-host-proposal.patch'];
for (const file of files) {
  const target = path.join(dest, file);
  if (!fs.existsSync(target)) fs.copyFileSync(path.join(__dirname, file), target);
}
console.log(JSON.stringify({ archivedCompletedPass: files.length, overwritten: false }));
