# Offline lake surfaces

`lake-levels.json` supplies a constant elevation for each of 1,355 Natural Earth lake records and the Caspian Sea. Its sparse row spans share the shipped land/water mask's 0.01-degree cell centres. Every output span is checked against that mask. No map request is made during flight.

Natural Earth's lake DBF contains names, classes, and identifiers **but no water elevations**. The default levels therefore are explicitly approximate: the 20th percentile of adjacent **land-classified** ETOPO 2022 DEM nodes at 3 arc minutes. Lake interiors are not sampled as surfaces, because ETOPO includes lake bathymetry. Sampling spreads, counts, and any search expansion are preserved for every record. This prevents a bathymetric bottom or the ocean's zero datum from being used as an inland lake's surface.

For example, the estimates are 1,910 m for Tahoe, 192 m for Superior, 3,813 m for Titicaca, and −28 m for the Caspian. These are terrain estimates, not exact or current water levels. Coarse sampling and generalized shorelines can noticeably bias steep-sided and small lakes. Reservoir operations, tides, seasonal changes, and connected-lake hydraulics are not modelled.

The northern Dead Sea record (`ne_id=1159126747`, independently checked to contain 31.5 N, 35.5 E) instead uses the Israel Water Authority's dated **−441 m measurement on July 1, 2026**. `lake-levels-references.json` records the observation URL, date, source datum limitation, and matching point. The southern evaporation basin has a distinct source polygon and retains its own DEM estimate. This one observation is fixed, not live; no national-datum-to-EGM2008 transformation is claimed.

The Caspian is missing from Natural Earth's lake layer, but its exact boundary is a counterclockwise hole in the pinned land source (record 0, ring 15; zero-based). The builder checks that this 2,388-vertex hole contains the existing 42 N, 51 E geographic fixture, then includes it directly. Intersecting the result with the existing water mask preserves islands represented by separate land polygons. No approximate hand-drawn bounding box is used.

## Rebuild

The Python 3 standard-library builder reads only local inputs and pins both Natural Earth archive hashes and the uncompressed NOAA subset hash. Obtain the cached global 3-minute response using the URL recorded in `lake-levels.json` (or the elevation builder's download option), then run from the repository root:

```powershell
python dev-tools/build_skyschool_lake_levels.py --dem-source vendor/skyschool-elevation/source/global-3min.dods.gz
```

The NOAA request selects native 60-second samples at indices `[1:3:10798][1:3:21598]`, yielding 7,200 × 3,600 cell-centred samples at 0.05 degrees, starting at 89.975 S, 179.975 W. Its uncompressed SHA-256 is `ce17f2d9965f85df04e74e36a5e70c4adbe050c6e844b9d36695b9b4d19427f4`. The large raw response may be omitted from the packaged runtime; the generated JSON and source metadata remain available.

## Format

- `levelsMeters[lakeId]`: signed integer metres; zero is a valid level.
- `rows["row"]`: sorted, disjoint `[startColumn, exclusiveEndColumn, lakeId]` runs.
- Row 0 is northmost; column 0 is westmost. Grid dimensions are 36,000 × 18,000.
- Coordinates wrap longitude and clamp latitude exactly as the existing land/water mask does.
- A location without a matching run is **not a mapped lake**; callers receive `null` and preserve their ocean/land classification.
- `lakes`: source identifiers, estimates, sampling diagnostics, and any observation override; metadata can be omitted from the runtime bundle.
- Rare overlapping polygons are resolved in original source-record order and counted in the artifact.

## Sources

- [Natural Earth 1:10-million lakes](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/) and [land](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/); pinned archives and public-domain terms are already recorded in `../skyschool-geography`.
- [NOAA NCEI ETOPO Global Relief Model](https://www.ncei.noaa.gov/products/etopo-global-relief-model), ETOPO 2022 surface, EGM2008 elevations for DEM-derived values. The model includes topography and bathymetry.
- [Israel Water Authority / Government of Israel, Dead Sea water levels since 1976](https://www.gov.il/he/pages/dead_sea_report), measurement row July 1, 2026, −441 m.
- [USGS Tahoe environmental setting](https://pubs.usgs.gov/wri/wri024030/text/environmental.htm) provides an independent reasonableness reference (about 6,224 ft above sea level); it is not used to fit the DEM-derived estimates.
