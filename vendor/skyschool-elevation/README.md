# SkySchool offline real elevation

This package is derived from the NOAA NCEI **ETOPO 2022 v1 Ice Surface Global
Relief Model**, using the official 60 arc-second surface NetCDF. The source grid
contains topography, ice surfaces and bathymetry. Horizontal coordinates are
WGS84 (EPSG:4326); heights are metres relative to EGM2008 (EPSG:3855), positive up.

Sources:

- [NOAA ETOPO product page](https://www.ncei.noaa.gov/products/etopo-global-relief-model)
- [NOAA dataset metadata and CC0 declaration](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022)
- [Official surface dataset](https://www.ngdc.noaa.gov/thredds/catalog/global/ETOPO2022/60s/60s_surface_elev_netcdf/catalog.html?dataset=globalDatasetScan/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc)
- [ETOPO 2022 user guide](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf)

## Package and reproducibility

`elevation-grid.json` is the compact runtime payload. `provenance.json` records
the exact source requests, retrieval metadata, source response hashes, grid
registration, quantization policy, builder hash and payload hash.
`source-samples.json` records raw NOAA floating-point heights and the matching
processed samples for independently checking orientation, negative land,
coastal masking, source indices and metre-to-foot conversion.
`independent-source-checks.json` additionally preserves twelve small responses
from NOAA's ASCII endpoint, checked separately from the binary array parser.

Run `python dev-tools/build_skyschool_elevation.py --download --global-stride 5`
from the repository root to retrieve missing source subsets and rebuild. The
builder uses only the Python standard library. It rejects missing/fill samples,
out-of-range values, unexpected response dimensions and altered cached data.
The Natural Earth mask is pinned by hash. Each encoded row is decoded and
compared with its original integer samples while building. The builder changes
only files in this package. Run `node dev-tools/embed_skyschool_elevation.cjs`
to embed the rebuilt data in both simulator source copies, or use `--check`
to verify that the committed data and embedded payloads agree.
Run `python dev-tools/build_skyschool_elevation.verify.py` to validate those
independent checks offline, or add `--download` to refresh the small source
responses and the recorded NOAA schema/datum metadata.

The `source/` directory is a reproducible build cache. Its `.dods.gz` files are
compressed original NOAA DAP2 responses, retained when available to permit an
offline rebuild. They are **not loaded by SkySchool** and may be omitted from a
runtime distribution. Their matching JSON files preserve exact requests and
hashes so they can be fetched again. No data service, account or key is required
when the simulator runs. The large compressed response caches are ignored by
Git; the runtime package, original-response metadata and small fixtures are
tracked.

## Coordinate and encoding contract

ETOPO's native 60-second cell centres are:

```
latitude  = -90  + (sourceRow + 0.5) / 60
longitude = -180 + (sourceColumn + 0.5) / 60
```

Rows run **south to north**, columns **west to east**. Each packaged grid records
its exact first source indices, source stride, first latitude and longitude,
angular step, width and height. Coarser grids select the centre source sample
at each stride; they are not area averages. Training/scenic patches retain the
60-second source spacing. Runtime bilinear interpolation and blending at patch
borders provide continuity without inventing fine geographic detail.

Each row is an independent base64 string containing unsigned LEB128 tokens.
The previous height begins at zero. A nonzero token represents a zigzag signed
delta plus one; add its decoded delta to the previous height and emit that
height. A zero token is followed by an unsigned repeat count (at least three),
which repeats the previous height. Heights are signed Int16 metres, quantized
as `floor(sourceHeight + 0.5)`. Decoders can retain a bounded row cache.

Only cells marked as water by the existing Natural Earth mask are set to zero
in the terrain payload, so ocean-floor values do not pull coastal terrain
underwater. Negative elevations on mapped land remain signed. Inland lake
levels are represented separately; zero in this terrain grid is not an
assertion that an inland lake sits at sea level. The raw source cache and
fixtures preserve the original floating-point values before water masking.

## Scope and limitations

This is measured geographic relief, with deliberate sampling limits. A
five-arc-minute global grid has about 9.3 km north/south spacing; one-arc-minute
regional data has about 1.85 km spacing. East/west spacing decreases toward the
poles. Runtime interpolation cannot recover smaller peaks, cliffs, channels or
runway features. Fine coastline shapes come from the separate Natural Earth
map, whose scale and grid are also generalized.

Airport pads are flattened to the simulator's airport elevations. Lake levels
are separately derived approximations. These adaptations, the displayed
terrain mesh and the interpolated source relief should not be confused with
a surveyed airport or obstruction dataset. ETOPO source dates vary by region;
the package is not live elevation data.

Recommended citation: NOAA National Centers for Environmental Information.
2022: ETOPO 2022 15 Arc-Second Global Relief Model. DOI: 10.25921/fd45-gt74.

