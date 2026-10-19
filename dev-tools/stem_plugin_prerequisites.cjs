'use strict';
// The STEM loader fetches a plugin's declared prerequisites (stemModuleDependencies
// in AlloFlowANTI.txt) before the plugin itself. Gates that evaluate stem_lab files
// directly use this to load the same data files first, so they measure the program
// the app runs: SkySchool, for example, cannot start without its geography data.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
let cachedMap = null;

function stemModuleDependencies() {
  if (cachedMap) return cachedMap;
  const host = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const block = /var stemModuleDependencies = \{([\s\S]*?)\n\s*\};/.exec(host);
  if (!block) throw new Error('stemModuleDependencies was not found in AlloFlowANTI.txt');
  cachedMap = {};
  for (const entry of block[1].matchAll(/'([^']+)':\s*\[([^\]]*)\]/g)) {
    cachedMap[entry[1]] = [...entry[2].matchAll(/'([^']+)'/g)].map((dependency) => dependency[1]);
  }
  return cachedMap;
}

// Repo-relative stem_lab/stem_data_*.js files a plugin needs, in load order.
function stemDataPrerequisites(pluginFile) {
  const key = 'stem_lab/' + path.basename(pluginFile);
  return (stemModuleDependencies()[key] || []).filter((dependency) => /^stem_lab\/stem_data_[\w-]+\.js$/.test(dependency));
}

module.exports = { stemModuleDependencies, stemDataPrerequisites };
