const fs = require('node:fs');
const file = 'docs/rendered-document-fidelity.md';
let s = fs.readFileSync(file,'utf8');
const anchor = '## Existing export acceptance reports';
if (!s.includes(anchor)) throw Error('Missing documentation anchor');
s = s.replace(anchor, `## Inspection failures and batch recovery

Browser context setup, navigation, accessibility inspection, dependency inspection, and context cleanup failures are recorded as unavailable coverage with bounded diagnostics. Successful observations remain available for review. Other source/candidate sides and rendering profiles still run. For multi-profile reports, \`profilesAttempted\` counts attempted profiles; \`profilesCompleted\` counts profiles whose source and candidate browser inspections both completed. A completed inspection may still detect a change or incomplete document dependencies.

The standalone manifest requires unique pair IDs and valid checkpoint/profile contracts. Malformed contracts fail before browser work. Within a valid manifest, an unreadable or incompatible HTML file produces an unavailable pair while later pairs still run; the CLI writes both JSON and HTML results and returns exit code 1 if any pair cannot pass. A manifest error or inability to start Chromium returns exit code 2.

The manifest's exact byte hash is recorded. Before returning a batch, the runner rechecks the manifest and all inspected source/candidate files, including earlier pairs. Changed or missing files invalidate the affected reports. The exported \`runRenderedManifest(manifestPath, { browser })\` function also supports a caller-owned browser.

` + anchor);
fs.writeFileSync(file,s);
