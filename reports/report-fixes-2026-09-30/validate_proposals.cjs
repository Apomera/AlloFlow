'use strict';
const fs = require('node:fs'), path = require('node:path');
const parser = require('@babel/parser');
const { parsePatch, applyPatch, createTwoFilesPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const beforeHosts = Object.fromEntries(hosts.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const modules = ['text_utility_helpers', 'view_simplified', 'generate_dispatcher', 'generation_helpers', 'gemini_api', 'guided_mode_config', 'tts', 'view_kokoro_offer_modal', 'error_reporter', 'view_canvas_recovery_dialog', 'utils_pure', 'personas', 'word_sounds_setup', 'word_sounds'];
const crypto = require('node:crypto');
let pinned = beforeHosts['AlloFlowANTI.txt'];
const pins = [];
for (const name of modules) {
  const file = name + '_module.js';
  const pin = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 8);
  const pattern = new RegExp('https://alloflow-cdn\\.pages\\.dev/' + file.replace(/\./g, '\\.') + '(?:\\?v=[^\'"\\s)]+)?', 'g');
  let count = 0;
  pinned = pinned.replace(pattern, () => { count++; return 'https://alloflow-cdn.pages.dev/' + file + '?v=' + pin; });
  pins.push({ file, pin, matchedUrls: count });
}
if (pinned !== beforeHosts['AlloFlowANTI.txt']) fs.writeFileSync(path.join(__dirname, 'module-pins-host-proposal.patch'), createTwoFilesPatch('a/AlloFlowANTI.txt', 'b/AlloFlowANTI.txt', beforeHosts['AlloFlowANTI.txt'], pinned, '', '', { context: 3 }));
const proposals = ['audio-host-proposal.patch', 'generation-host-proposal.patch', 'flow-host-proposal.patch', 'security-host-proposal.patch', 'storage-media-host-proposal.patch', 'word-sounds-navigation-host-proposal.patch', 'module-pins-host-proposal.patch'];
const candidates = new Map();
const results = [];
for (const file of proposals) {
  const result = { file, appliedToWorkspace: false, files: [] };
  try {
    for (const patch of parsePatch(fs.readFileSync(path.join(__dirname, file), 'utf8'))) {
      const relative = patch.oldFileName.replace(/^a\//, '');
      if (!['AlloFlowANTI.txt', 'ui_strings.js'].includes(relative)) throw new Error('Unexpected proposal target: ' + relative);
      const current = candidates.has(relative) ? candidates.get(relative) : fs.readFileSync(path.join(root, relative), 'utf8');
      const candidate = applyPatch(current, patch);
      if (candidate === false) throw new Error('Proposal does not apply to cumulative current candidate: ' + relative);
      if (relative === 'ui_strings.js') JSON.parse(candidate);
      else parser.parse(candidate, { sourceType: 'unambiguous', plugins: ['jsx'] });
      candidates.set(relative, candidate);
      result.files.push({ file: relative, syntax: 'passed' });
    }
    result.ok = result.files.length > 0;
  } catch (error) { result.ok = false; result.error = error.message; }
  results.push(result);
}
const hostsUnchanged = hosts.every(file => beforeHosts[file] === fs.readFileSync(path.join(root, file), 'utf8'));
fs.writeFileSync(path.join(__dirname, 'proposal-validation.json'), JSON.stringify({ at: new Date().toISOString(), hostsUnchanged, pins, results,
  limits: ['Only in-memory patch applicability and syntax; no functional validation or host integration.', 'Shared writer clarification is still required. Longer session code and mailbox changes are not included.'],
}, null, 2) + '\n');
console.log(JSON.stringify({ hostsUnchanged, results: results.map(result => ({ file: result.file, ok: result.ok, error: result.error })) }));
