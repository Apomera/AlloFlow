'use strict';
// Assemble a self-contained, local-only worker from the same audited runtime
// functions used by the browser and offline converter. No CDN, eval or imports
// run inside the worker; all code is fixed at build time.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function buildFlightCityWorkerSource() {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8').trimEnd();
  const shared = {};
  vm.runInNewContext(read('dev-tools/skyschool-city-online.js') + '\n' + read('dev-tools/skyschool-city-worker.js'), shared);
  const names = ['flightCityText', 'flightCityTarget', 'validateFlightCityPack', 'flightCityVectorWorkerMain'];
  const source = ['"use strict";', read('vendor/skyschool-vector/decoder.js'),
    read('dev-tools/skyschool-city-converter.js'), read('dev-tools/skyschool-city-vector.js'),
    ...names.map(name => {
      if (typeof shared[name] !== 'function') throw new Error('Missing worker dependency: ' + name);
      return shared[name].toString();
    }), 'flightCityVectorWorkerMain();'].join('\n\n') + '\n';
  new vm.Script(source);
  return source;
}
module.exports = { buildFlightCityWorkerSource };
if (require.main === module) {
  const source = buildFlightCityWorkerSource();
  if (process.argv.includes('--check')) {
    const marker = 'var FLIGHT_CITY_WORKER_SOURCE = ' + JSON.stringify(source) + ';';
    for (const file of ['stem_lab/stem_tool_flightsim.js', 'desktop/web-app/public/stem_lab/stem_tool_flightsim.js']) {
      if (!fs.readFileSync(path.join(root, file), 'utf8').includes(marker)) throw new Error('Worker embed differs: ' + file);
    }
  }
  console.log(JSON.stringify({ bytes: Buffer.byteLength(source), sha256: crypto.createHash('sha256').update(source).digest('hex') }));
}
