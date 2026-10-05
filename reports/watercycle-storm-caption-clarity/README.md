# Storm scene caption clarity

Storm Lab now uses a shared foreground caption layout. Natural text measurements determine wrapping and plate size; nearby captions avoid one another, and leader lines preserve their cloud, air-boundary and terrain anchors. Labels use opaque rounded plates, readable contrast, and 11–12 px type without horizontal text compression.

The captions now show the actual modeled cloud phase. A 0°C air crossing says whether air is warmer or colder below, with its schematic status visible. It no longer claims that every particle freezes at that boundary. Temperature readings retain small positive and negative values. Virga and windward/leeward explanations stay legible on narrow phones, and the airflow labels follow the selected wind direction.

All production bytes outside eight presentation slices match the frozen prior runtime. Weather calculations, particle paths, terrain collision, phase transitions, lifecycle clocks, 3D scenes, controls, records and scores are retained.

## Validation

- 36 focused tests passed for measured wrapping, geometry, spacing, context restoration, caption semantics, exact anchors, signed temperatures and byte preservation.
- 45 unchanged precipitation, sleet/freezing-rain and storm response regression tests passed.
- 335 real-browser checks passed across 15 scene cases and one native wind selection, producing 16 captures. These cover rain, snow, sleet, freezing rain, virga, mountain airflow in both directions, calm wind, dark mode, hail anatomy, and temperatures close to zero.
- The frozen baseline passed 94 checks with 16 captures.
- Native browser captures retain paused pixels, saved work, scores, canvas/context and sync/cleanup hooks. Captions preserve the exact cloud phase, thermal crossings and signed temperatures from the live kernel.
- Independent visual review of sleet, virga, west-wind mountain and hail anatomy comparisons found no new obstruction of weather, airflow, charge or lightning cues.

Runtime and public mirror SHA-256: `4bb912b9f1d00c1b54be26d29197f0c1bd9c1277161664d21842532f973f4bf3`.

`verify.cjs` checks runtime, manifest, test and browser receipts, capture hashes and resource closure without modifying evidence. `preview.cjs` separately checks the actual local Storm page and the JavaScript response loaded by its browser; `verify.cjs --preview` includes that receipt.

## Comparisons

| Scene | Before | Enhanced |
|---|---|---|
| Sleet on phone | [Before](baseline-initial-sleet-phone320.png) | [Enhanced](browser-initial-sleet-phone320.png) |
| Virga on phone | [Before](baseline-initial-virga-phone320.png) | [Enhanced](browser-initial-virga-phone320.png) |
| West-wind mountain on phone | [Before](baseline-initial-orographic-west-phone320.png) | [Enhanced](browser-initial-orographic-west-phone320.png) |
| Hail anatomy | [Before](baseline-initial-hail-anatomy.png) | [Enhanced](browser-initial-hail-anatomy.png) |

Changes remain uncommitted.
