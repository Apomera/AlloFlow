// Reproducible browser decoder; dependencies are pinned and vendored with licenses.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'vendor/skyschool-vector');
const notices = ['vector-tile', 'pbf', 'point-geometry'].map(folder =>
  folder + '\n' + fs.readFileSync(path.join(directory, folder, folder === 'vector-tile' ? 'LICENSE.txt' : 'LICENSE'), 'utf8').trim()).join('\n\n');
const result = esbuild.buildSync({
  stdin: { contents: "export { default as Pbf } from './pbf/index.js'; export { VectorTile, classifyRings } from './vector-tile/index.js';", resolveDir: directory },
  alias: { '@mapbox/point-geometry': path.join(directory, 'point-geometry/index.js') },
  bundle: true, format: 'iife', globalName: 'FlightCityVectorCodec', platform: 'browser', target: 'es2020',
  minify: true, legalComments: 'inline', write: false,
  banner: { js: '/*! SkySchool local MVT decoder: @mapbox/vector-tile 2.0.4, pbf 4.0.1, @mapbox/point-geometry 1.1.0.\nSee vendor/skyschool-vector for pinned source and provenance.\n\n' + notices + '\n*/' }
}).outputFiles[0].text;
const destination = path.join(directory, 'decoder.js');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== result) throw new Error('SkySchool vector decoder differs from pinned source.');
  console.log('SkySchool vector decoder matches pinned source.');
} else {
  fs.writeFileSync(destination, result);
  console.log('Built SkySchool vector decoder (' + Buffer.byteLength(result) + ' bytes).');
}
