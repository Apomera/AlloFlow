# SkySchool offline land and water

Made with Natural Earth. The bundled land and lakes are public domain.

## Sources

- Land 1:10 million, version 5.1.1: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/
- Lakes and reservoirs 1:10 million, version 5.0.0: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/
- Terms: https://www.naturalearthdata.com/about/terms-of-use/

The original ZIP archives are unchanged. Their hashes and download URLs are in provenance.json. No access key, map tile service, or network request is required at runtime.

## Rebuild

From the repository root, run:

    python dev-tools/build_skyschool_geography.py

Python 3.9 or later's standard library is sufficient. The builder verifies the pinned input archive hashes, versions, WGS84 projection, closed polygon rings, and already split antimeridian edges. It reads Polygon shapefile records directly, rasterizes cell centres with an even/odd scanline fill (including holes), unions land polygons and subtracts lakes. It writes land-water-mask.json plus independent source-polygon fixture classifications in tests/fixtures/skyschool_geography_points.json.

The default command writes only the dataset and independent fixtures. To also replace the embedded RLE, dimensions, and RLE hash comment in both simulator copies, run:

    python dev-tools/build_skyschool_geography.py --embed

Embedding accepts only the 0.01-degree v1 format. Before any output is written, it verifies that the canonical and mirrored sources are identical regular paths inside the repository, that exactly one RLE declaration and each dimension constant exist, and that the decoder bounds match. It accepts the decoder's single null assignment that releases the RLE text after splitting. Generated row count, run totals, and RLE hash are validated from the in-memory build result; no external mask is loaded for embedding.

Both source replacements are staged in their own directories, flushed, and checked against the preflight bytes before atomic renames. If the second rename fails, the first is restored only while it still contains the builder's candidate bytes, preserving concurrent edits. Cross-file renames cannot be one atomic filesystem transaction. An already matching source pair is left unchanged. The dataset and fixture generation remain usable independently of this optional source mutation.

The default grid is 36,000 columns by 18,000 rows at 0.01 degree. RLE rows run north to south; columns run west to east. Commas separate base36 lengths. Semicolons separate rows. Each row starts with a water run and alternates water/land. An initial or final zero-length run is valid. Runtime decoders must use an upper-bound search when looking up cumulative run ends, so zero-length runs do not change classification.

The source archives and generated JSON are development/provenance assets. The simulator embeds the generated RLE so existing offline/single-file tool loading still works. No global 648-million-byte raster is required at runtime: each decoded row needs at most 177 Uint16 run ends. The total of all run ends occupies about 1.4 MB before cache limits; the RLE text is about 1.84 MB.

## Scope and limits

Natural Earth's "10m" means a map scale of 1:10,000,000, not ten-metre resolution. The cell size is about 1.11 km north/south (0.6 nautical miles), ten times finer linearly than SkySchool's previous 0.1-degree grid. The source is generalized cartography: small islands, local waterways, tidal details, and recent shoreline changes can be absent. In particular, the independently checked Casco Bay small-island cell illustrates that limitation. This is land/water geography, not surveyed elevation data or an aeronautical navigation chart.

Terrain elevations, settlement shapes, roads, and ground colors remain illustrative unless another data source is explicitly identified. Airport training surfaces may still differ from geographic shorelines to keep the simulated runway usable. Natural Earth's published source notes also flag coastline accuracy concerns in northern Russia and southern Chile.
