'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const parser = require('@babel/parser');
const { createTwoFilesPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const hostFiles = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'reflective_journal.md'];
const before = Object.fromEntries(hostFiles.map(file => [file, fs.readFileSync(path.join(root, file))]));
if (sha(before['AlloFlowANTI.txt']) !== '2b9cf47c2c3aec735721f2b09066aa1234c33e2863c466790fbfdeef66dc168b') throw Error('Held host changed; reconcile before making proposal');
const host = before['AlloFlowANTI.txt'].toString('utf8');
const start = host.indexOf("      {(activeView === 'word-sounds-generator' || wsGeneratorMinimized) && (");
const end = host.indexOf('\n          />', start);
if (start < 0 || end < start) throw Error('Word Sounds setup mount not found');
const section = host.slice(start, end);
const oldProp = '              onClose={handleCloseDashboard}';
if (section.split(oldProp).length !== 2) throw Error('Close prop is not unique in the owned proposal region');
const nextProp = `              onClose={() => {
                  setWsGeneratorMinimized(false);
                  setActiveView(current => current === 'word-sounds-generator' ? 'input' : current);
              }}`;
const candidate = host.slice(0, start) + section.replace(oldProp, () => nextProp) + host.slice(end);
parser.parse(candidate, { sourceType: 'unambiguous', plugins: ['jsx'] });
const patch = createTwoFilesPatch('a/AlloFlowANTI.txt', 'b/AlloFlowANTI.txt', host, candidate, '', '', { context: 3 });
fs.writeFileSync(path.join(__dirname, 'word-sounds-navigation-host-proposal.patch'), patch);
const unchanged = Object.fromEntries(hostFiles.map(file => [file, before[file].equals(fs.readFileSync(path.join(root, file)))]));
if (!Object.values(unchanged).every(Boolean)) throw Error('Held file changed while preparing proposal');
fs.writeFileSync(path.join(__dirname, 'word-sounds-navigation-proposal.json'), JSON.stringify({
  at: new Date().toISOString(), appliedToWorkspace: false, hostSha256: sha(before['AlloFlowANTI.txt']),
  patchSha256: sha(Buffer.from(patch)), syntax: 'passed', unchanged,
  behavior: 'Close clears the minimized mount flag; only the setup view returns to input. Other current views and resource content are retained. Functional view update uses the latest state.',
  scope: 'Only the WordSoundsGenerator onClose prop. The shared dashboard callback, preparation cancellation, and other tools are unchanged.',
  limits: ['Review-only until host ownership is clarified.', 'This does not prove production keyboard, focus restoration, or preparation cancellation behavior.']
}, null, 2) + '\n');
console.log('Word Sounds close proposal created and parsed in memory; shared host files and journal unchanged.');
