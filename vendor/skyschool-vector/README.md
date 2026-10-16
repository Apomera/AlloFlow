# SkySchool local vector tile decoder

The browser bundle contains pinned copies of `@mapbox/vector-tile` 2.0.4
(BSD-3-Clause), `pbf` 4.0.1 (BSD-3-Clause), and `@mapbox/point-geometry` 1.1.0
(ISC). Each source package and license is retained in its named folder; full
license notices are included in the distributed bundle. No runtime CDN or npm
installation is needed.

`provenance.json` records official npm tarballs, pinned SHA-512 integrity, and
downloaded archive SHA-256 values. `node dev-tools/vendor_skyschool_vector.cjs`
reproduces these source copies without running package scripts.
`node dev-tools/build_skyschool_vector.cjs` builds `decoder.js` using the
repository's esbuild. Add `--check` to compare without writing.

The adapter is authored in `dev-tools/skyschool-city-vector.js` and uses the
existing city converter for final ring topology, courtyard validation, nearest
feature selection, and output budgets. It validates protobuf message boundaries,
property indices, and geometry commands before calling the decoder. Only
`building` and `transportation` layers are decoded. Limits are nine z14 tiles,
4 MiB per decoded tile, 12 MiB total, one million decoded coordinates, 200,000
accepted input coordinates, and the existing 2,500 building / 1,200 road / 30,000
output coordinate limits. Before final conversion, bounded heaps retain nearby
candidates (at most 6,000 buildings / 150,000 coordinates and 3,000 roads / 50,000
coordinates). Dense cities reduce distant detail instead of failing when the
source supplies more eligible buildings than the simulator can render.

The default browser provider transfers downloaded buffers to a local Web Worker
for decoding and conversion, after a readiness handshake. Its source is assembled
from these same pinned libraries and runtime helpers by
`dev-tools/build_skyschool_city_worker.cjs`, then embedded by the city runtime
builder. No remote worker script, runtime import, or additional dependency is
required. A 20-second deadline and abort signal bound its lifetime. Worker startup
failures retain a synchronous compatibility path; conversion failures after
transfer never retry on the main thread.

OpenMapTiles `render_height` is approximate, so every resulting building height
is labeled estimated. Elevated parts and hidden 3D outlines are omitted, as are
bridges, tunnels, fords, unsupported roads, and marked restricted roads. Whole
building polygons must fit strictly inside one tile core: buildings crossing
tile boundaries are omitted rather than rendering clipped walls or filling
truncated courtyards. Road lines are clipped to tile cores and the selected
district. This conservative policy can leave small gaps along tile boundaries.

Primary references: [Mapbox vector tile parser](https://github.com/mapbox/vector-tile-js),
[PBF parser](https://github.com/mapbox/pbf), and
[OpenMapTiles schema](https://openmaptiles.org/docs/schema/).
