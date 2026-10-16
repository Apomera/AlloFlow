# Portland OpenStreetMap source extract

© OpenStreetMap contributors. This source data and derived city data are available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). [OpenStreetMap copyright and source credits](https://www.openstreetmap.org/copyright). The ODbL applies to the data; it does not by itself license the simulator code.

The raw Overpass response is preserved unchanged in `portland-osm.json`. The exact bounded query, response checksum, query checksum, endpoint, source timestamp, bounds, and feature census are recorded alongside it. This is an offline development asset; the simulator must not query a public Overpass server at runtime.

## Acquisition

One successful POST to https://overpass-api.de/api/interpreter with an identifying User-Agent returned the JSON for the Portland peninsula bbox south 43.643, west -70.285, north 43.669, east -70.245. Snapshot: 2026-10-15T03:21:55Z. The output contains 3,936 building ways, 736 roads, and 13 building multipolygon relations. Ways are returned complete and can extend beyond the requested bbox. Relations include segmented outer rings and inner courtyards.

To deliberately refresh, post the contents of `portland-query.overpassql` as the form field `data`, using the User-Agent `SkySchool-offline-city-provenance/1.0`. Regenerate provenance and fixtures after any refresh; the checksums pin the current response. Respect the [Overpass usage guidance](https://wiki.openstreetmap.org/wiki/Overpass_API): small serialized queries, caching, and at least 30 seconds before retrying 406/429 responses. The current source can be rebuilt without any network request.

## Attribution and distribution

Show “© OpenStreetMap contributors” with a link to the copyright page in an accessible game menu/credits location. The [OSMF guidelines for games and simulations](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines#Computer_games_and_simulations) allow these locations, so a persistent cockpit overlay is unnecessary. Preserve this notice and the ODbL link with redistributed data. Publicly used derivative databases must be offered under ODbL with corresponding access to the derivative data or alteration material; keep the compact derived file, pinned source, provenance, and converter available with the distribution.

## Limits

Only 7 building ways have explicit `height` and 293 have `building:levels`; all other rendered heights need estimates. [Height](https://wiki.openstreetmap.org/wiki/Key:height) is physical height above the lowest ground point, including the roof, and defaults to metres. It is not MSL elevation. [Building levels](https://wiki.openstreetmap.org/wiki/Key:building:levels) exclude roof/basement storeys; converting these into metres is also an estimate. Geometry, completeness, and tag accuracy reflect community mapping. This pack is not a surveyed 3D city.

The raw response contains original feature tags for provenance; runtime data should keep only geometry, relevant rendering tags, and source IDs. Do not infer window placement, roof details, facade materials, or missing heights as measured facts.
