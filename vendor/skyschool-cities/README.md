# SkySchool Portland city detail

This bounded offline scenery pack preserves mapped OpenStreetMap building footprints and road centre lines for the Portland, Maine peninsula. Its bounding box is **43.643°–43.669° N, 70.285°–70.245° W**. It contains mapped geometry, not satellite imagery or photogrammetry. Coverage is deliberately local. The city explorer described below can create scenery at searched destinations worldwide; mapped streets and footprints load from OpenFreeMap by default.

## Reproduction

The retained Overpass response is `source/portland-osm.json`. From the repository root:

```sh
node dev-tools/build_skyschool_cities.cjs
node dev-tools/build_skyschool_cities.cjs --check
```

The converter performs no network requests. It records the exact source SHA-256, OSM database timestamp when supplied, source feature IDs, accepted counts, height provenance, and omitted feature IDs in `portland.json`. Identical source bytes produce identical output. Acquisition details and data terms are maintained in the adjacent provenance and license files.

## Geometry and heights

- Coordinates are WGS84 `[longitude, latitude]`, rounded to six decimal places (approximately 0.1 m in latitude). This precision does not imply survey accuracy.
- Rings are open coordinate arrays, with no repeated closing point; the final point connects back to the first. Exterior rings are counterclockwise and courtyard holes clockwise in longitude/latitude coordinates. Multiple disjoint exterior rings become separate records. Relation member ways are not emitted again, including when their relation was omitted: an isolated exterior would lose its courtyard.
- Multipolygon ways are joined by matching endpoints, including reversed members. Courtyards are preserved. Open, ambiguous, self-intersecting, overlapping, touching, or unsupported nested outlines are omitted and counted; courtyards are never filled to repair bad data.
- Only redundant collinear vertices are removed. Footprints are never replaced by rectangles. Rings exceeding 96 coordinates after this cleanup are omitted. Entire footprints must lie within the bounding box.
- `heightSource: "height"` means the height came from an OSM height tag, accepting metres, feet, and feet/inches. It does **not** certify that the value was surveyed. `"levels"` uses mapped storeys multiplied by 3 m. `"estimated"` uses a conservative building-type estimate between 6 and 18 m. All output heights are limited to 300 m and rounded to 0.1 m; these are visual building heights above ground, not elevations above sea level.
- Building parts, roofs without enclosed buildings, ruins, construction, and demolished/proposed buildings are omitted. Material styles are illustrative categories inferred from building type, not measured facade colours.
- Roads retain mapped centre lines. Widths are estimates by road class, not surveyed carriageway widths. Bridges, tunnels, nonzero layers, private/inaccessible roads, unsupported highway classes, lines exceeding 256 coordinates, and features crossing the bounding box are omitted. There are no claimed bridge decks, elevation profiles, road markings, or live vehicles in this dataset.

The pack is capped at 2,500 building records and 1,200 road ways. If the source exceeds either limit, features nearest the pack centre are retained first with deterministic ID tie-breaking. Source IDs and omission reasons remain available for auditing. The rendering engine separately controls geometry budgets, terrain support, distance visibility, and water exclusion; a mapped footprint does not guarantee it can be displayed over the simulator's coarser terrain.

## Attribution and license

**© OpenStreetMap contributors.** OpenStreetMap data is available under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright). This derived geographic database retains that license; the retained source response and adjacent `LICENSE.md` document its attribution. The converter code is separate from the geographic database. The building and road data should not be used for real-world navigation or taken as a complete or current inventory.

## Simulator integration

The current detail pack is used by the WebGL/3D renderer. The Canvas fallback remains illustrative. The district uses three merged meshes (walls, roofs, roads), loads within 14 nautical miles, and remains cached until 16 nautical miles. Buffers refresh only when the rendered terrain surface changes; all buffers and materials are disposed on eviction. Global procedural city clusters have an enforced five-cluster limit.

Walls have stable physical-scale glass and selected warm windows, with antialiasing and a distant average to avoid shimmering; roofs do not emit window light. Mapped window rows begin at each building’s highest sampled ground point, so terrain updates preserve their floor alignment. Exposed foundations and a narrow roof trim remain solid, including courtyard walls. This uses one extra two-float wall attribute, with no extra meshes, textures, or draw calls. Window placement and occupancy remain illustrative. Geometry uses the simulator’s east/up/south feet and the flight’s fixed projection latitude. Roofs clear the highest sampled foundation point. Road widths and materials are illustrative. Bridges and tunnels are omitted instead of being flattened into the terrain.

Road ribbons share endpoints around ordinary bends and use bounded bevels at sharp corners. Their ground checks include interior samples, not just corners. Pieces crossing unsupported or wet ground, excessive grades, or an interior ridge/hollow are omitted instead of forming a false bridge. This remains a visual approximation of road surfaces, not surveyed road engineering. Each district is limited to 12,000 road triangles and 120,000 ground probes; the existing three merged meshes are retained.

Illustrative buildings are hidden only when their footprints overlap bounds of mapped geometry actually rendered. A bounded spatial index refreshes with the terrain surface. Empty, sparse, or terrain-rejected map features no longer clear the entire requested neighborhood. Coverage bounds are conservative around irregular footprints and courtyards; surrounding fallback buildings remain illustrative.

Fallback city centers use compact, deterministic blocks with a taller center and lower outskirts. Their footprints have guaranteed separation and fit within roughly 2,000 feet across, instead of scattering a few isolated buildings over several miles. The existing budget remains 8–64 boxes per city, one shared box geometry, three materials, and at most five nearby cities. These layouts represent illustrative neighborhoods, not actual streets or a full metropolitan area. Raw-water rejection, rendered-terrain support, and mapped-geometry coverage still control every visible building.

Both the raw water mask and rendered terrain support must be dry. Therefore waterfront and steep footprints can be omitted: in the documented 1,500 ft downtown preview, 1,858 of the 2,500 packaged buildings render and 642 are omitted. Counts vary with the terrain surface. The existing coarse coastline and elevation are not replaced by this pack. Buildings are visual scenery, not new collision obstacles.

Embed or verify after rebuilding the pack:

```sh
node dev-tools/embed_skyschool_cities.cjs
node dev-tools/embed_skyschool_cities.cjs --check
node dev-tools/verify_skyschool_cities.cjs
```

The simulator embeds the Portland pack. City search and automatic approach downloads are described below. Credits are visible in the menu and Controls and help, plus a compact scenery-corner attribution for the mapped district actually rendered. Automatic offline Portland gets the same credit without requiring a selected destination. Empty or rejected scenery and the illustrative Canvas fallback show no mapped-scenery footer.

## Worldwide city explorer

Open **Flight Planner → Explore a city**, enter a city and country, and select a result. **Fly near city** starts a short flight toward the center; **Depart toward city** uses the selected From airport. Coordinates in `latitude, longitude` format also work. City destinations use the existing navigation and map, without adding a cockpit panel. Latitude support is limited to ±85°.

Explicit searches use [Photon](https://photon.komoot.io/) with city/locality filtering; there is no autocomplete or background location tracking. Only the submitted search string is sent. Bundled major-city matches appear immediately and remain selectable while the online search runs, with an eight-second network deadline. Editing the query or selecting a result cancels the old request and prevents late responses from replacing the current results. Search is paced, cached in memory, abortable, and retains bundled results when offline. Turning off online search/scenery sends no new requests. Natural Earth population is used when available; arbitrary destinations otherwise use a deterministic illustrative cluster.

Same-name bundled cities include compact coordinate labels so locations such as London in England and London in Canada are distinguishable. The bundled list has no country metadata, so no country names are guessed. Unique names retain their short labels. When online results arrive, a focused result stays in place and remains selectable by keyboard. Starting a city flight cancels an unfinished search.

Real streets and building footprints now load automatically from **[OpenFreeMap](https://openfreemap.org/)**. No account, API key, new server, or host configuration is needed. OpenFreeMap uses the [OpenMapTiles schema](https://openmaptiles.org/docs/schema/) and OpenStreetMap data. Its [current terms](https://openfreemap.org/tos/) explicitly allow embedded-map end users of any age. The public service is free and has no availability guarantee.

Selecting a city does not download detail. A request starts when the aircraft comes within 18 nautical miles of that chosen city. The client fetches only the zoom-14 tiles needed for a roughly 900 m radius city-center box, using the stable `https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf` endpoint. At most nine tiles are requested with two simultaneous fetches; very high-latitude coverage is reduced to keep that limit. This is live scenery rendering, not a whole-city or offline map-pack download.

Each tile is limited to 4 MiB after decompression, the full district to 12 MiB, and a district attempt to 45 seconds. The selected district is built only after the necessary tiles arrive and validate. There is no automatic retry loop or rolling flight-path tiling. Manual retry becomes available after 60 seconds. Switching destinations, disabling online access, and leaving the tool cancel obsolete requests. A failure or empty result retains illustrative scenery.

Dense vector decoding and topology validation run in a short-lived, locally bundled Web Worker. Tile buffers transfer only after the worker reports readiness; conversion has a 20-second deadline within the overall attempt. Cancellation terminates the worker, and completion releases its Blob URL. Hosts without Worker support, or which block worker startup, use the bounded synchronous compatibility path. Failures after transfer do not repeat conversion on the flight screen's thread. GPU geometry construction still runs on the main thread.

Newly displayed districts reveal over 0.6 seconds using an opaque coverage pattern, preserving depth testing between walls, roofs, and roads. Paused flight and reduced-motion preferences show the complete district immediately. Terrain updates retain the reveal state; they do not restart it. A loaded, nearby chosen destination takes priority over an overlapping district; nearby bundled scenery remains available while it loads. Otherwise the current available district remains within 16 nautical miles, and the nearest available district is selected within 14 nautical miles. The transition adds no meshes or cockpit controls.

Changing destinations retains only the currently rendered district while its replacement loads or fails, provided it remains within 16 nautical miles. Nearby ready replacement detail takes priority. Clearing the destination or leaving that radius releases the old district; it cannot reappear from a retained scene history. Turning off online loading cancels requests while preserving existing nearby scenery for that flight. A fresh flight starts with a fresh scene. Paused destination changes repaint without advancing flight physics, including a clear action that leaves the available-pack list unchanged. This adds no requests or cached districts.

The [vector decoder](../skyschool-vector/README.md) is reproducible with `node dev-tools/build_skyschool_vector.cjs --check` and bundled locally; no third-party JavaScript runs from a CDN. Only the `building` and `transportation` layers become scenery. OpenMapTiles may merge thousands of separate buildings into one tile feature, so the adapter separates polygons while preserving courtyard rings. Derived `render_height` values are labelled approximate, not claimed as surveyed OSM heights. Elevated parts, hidden 3D outlines, bridge/tunnel roads, ambiguous tile-edge buildings, and unsupported geometry are omitted. Ordinary road pieces are clipped at tile boundaries to avoid duplication.

OpenFreeMap scenery is retained in memory for the current tool session (at most three districts), alongside the browser's normal HTTP cache. The app does **not** persist OpenFreeMap tiles or derived packs to IndexedDB or offer offline-area downloads. This avoids applying OpenFreeMap's separate offline-download rules to browser clients that cannot reliably set an identifying User-Agent. The bundled Portland district remains available offline. Tool/project state stores only the selected city and online preference.

Compact linked **© OpenMapTiles · © OpenStreetMap** attribution appears in the scenery corner when a vector district is rendered. It follows the active district’s source rather than a pending destination or configured provider, and clears on renderer failure or when leaving mapped scenery. Source links and limitations also remain in the menu and Controls and help. Buildings are visual scenery, not collision obstacles; Canvas-only rendering remains illustrative.

### Optional host overrides

No configuration is required for OpenFreeMap. Existing authorized Overpass-compatible services still work when the host supplies `overpassUrl` before mounting SkySchool:

```js
window.SkySchoolCityServices = {
  overpassUrl: 'https://your-city-service.example/api/interpreter',
  // searchUrl: 'https://your-photon-service.example/api/',
  // enabled: false, // disables all online requests
  // provider: 'none', // disables building/street downloads only
};
```

An explicit invalid provider fails closed rather than silently switching services. A custom Overpass endpoint must allow the host origin with CORS and return streamed Overpass JSON for a bounded GET `data` query. Its older limits remain 4 MiB/25 seconds, with validated IndexedDB caching of three recent packs for seven days. Configure aggregate quotas and shared caching at that provider; client-local pacing is not a global traffic limit. Do not put credentials in browser configuration. Volunteer public Overpass services are not used as the default.

Dense vector districts first retain at most 6,000 nearby building candidates (150,000 coordinates) and 3,000 road candidates (50,000 coordinates). Courtyard relations stay intact. Farthest candidates are dropped deterministically before topology validation, so a busy city can reduce distant detail without failing its whole download.

The shared converter rejects partial Overpass replies and malformed/topologically unsafe shapes. Limits are 12,000 input elements, 200,000 input coordinates/references, 30,000 output coordinates, 2,500 buildings, and 1,200 roads, with deterministic nearest-feature selection and a topology-work budget. Its original Portland rebuild is byte-identical. The district renderer retains one real district and up to five illustrative city clusters, disposes old meshes, and suppresses overlapping illustrative buildings while a real district is active.

Runtime authoring files are `dev-tools/skyschool-city-converter.js`, `skyschool-city-vector.js`, `skyschool-city-worker.js`, `skyschool-city-provider.js`, `skyschool-city-online.js`, `skyschool-city-start.js`, `skyschool-city-reveal.js`, `skyschool-city-coverage.js`, `skyschool-city-roads.js`, `skyschool-city-selection.js`, and `skyschool-city-layout.js`. After editing, run `node dev-tools/embed_skyschool_city_runtime.cjs`; it also syncs `skyschool-city-facade.js`. `--check` verifies helpers and simulator mirror parity. `node dev-tools/build_skyschool_city_worker.cjs --check` independently checks the embedded worker source. City starts sample local approach terrain and respect aircraft ceilings, stall margin, rotor hover power, and glider release; they are simulator introductions, not real obstacle-clearance planning.
