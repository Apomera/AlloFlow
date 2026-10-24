# Shared simulation assets: compatibility pilot

This pilot adds a small catalog over existing providers. It preserves the current animal construction, native pose contracts, controller behavior, learning evidence, and host presentation scale. It introduces no shared clock, physics world, behavior engine, or automatic species enrollment.

## Scope

- `stem_lab/stem_sim_assets.js` describes a mourning dove and four meadow vegetation primitives.
- Bird Lab and Raptor Lab can create their existing mourning doves through the catalog. Other animals keep their current paths. Missing, incompatible, or unavailable catalogs use the original dove factory.
- `StemLab.ensureSimulationAssets()` loads only the small catalog beside the host/tool scripts. It does not fetch providers. Optional discovery never blocks native scene readiness; if the catalog arrives later, existing instances continue unchanged and later instances can use it.
- Meadow primitives are registered and exercised in the developer preview. Existing Bee Lab and Butterfly Lab consumers remain unchanged.
- The desktop mirrors and the explicit build companion list include the catalog. No student menus or lesson content are added.

## Native units and explicit limits

The dove provider authors geometry in metres, with +Y up, +Z forward, and the resting ground at y=0. The catalog returns its exact handle with no wrapper, rescaling, pose changes, or resource ownership changes. These authored proportions and cadence remain illustrative, not verified individual measurements. In particular, the native profile's size tuning value is not automatically a measured body length.

The meadow primitives use authored relative units. They are decorative geometry, not identified botanical species or calibrated metre-scale plants. Their metadata records this limitation rather than inventing physical dimensions. A later calibrated variant can have its own explicit entry.

Raptor Lab retains its existing display and handling conversion in its own adapter. The catalog never applies Raptor's enlargement to Bird Lab or another consumer. Shrinking the live prey is outside this compatibility pilot because visual size also participates in grounding, movement, and contact logic. See [the Raptor vision and physics review](raptor-vision-and-shared-physics-review.md).

## API

```js
const entry = StemSimAssets.get('animal.mourning-dove', '1.0.0');
if (StemSimAssets.available(entry.id, entry.version)) {
  const bird = StemSimAssets.create(THREE, entry.id, entry.version, { quality: 'low' });
  // The existing provider's native update(pose), root and dispose() contract.
}
const grass = StemSimAssets.createData('plant.meadow-grass', '1.0.0');
```

Metadata is deeply frozen. Unknown IDs, missing/wrong versions, wrong creation methods, and missing providers are rejected. There is no silent species substitution. Each creation retains the provider's existing independent mutable state and cleanup responsibility.

Entry versions identify maintained compatibility contracts. They do **not** archive or content-pin the provider source: existing provider version strings alone cannot supply that guarantee. A future incompatible provider change must introduce a separately loadable version or variant and rerun consumer checks. Consumers must not infer biological capabilities from a visual entry.

## Inspection

Serve the repository with a local static server and open `/dev-tools/shared_assets_preview.html`. This isolated developer page compares the native and catalog paths under identical lighting, camera, pose, and unmodified native model scale. It creates no WebGL renderer before **Open preview**. It supports fixed resting, walking and flight poses, two detail levels, mobile layout, keyboard controls, and explicit cleanup. Camera fitting affects the view only.

The preview is not installed in student menus or copied into the desktop application. Its source and local provider dependencies remain available in the development workspace.

## Regression evidence

The pass preserves a pre-pilot source snapshot and hashes existing verification files in `tmp/shared-assets-pilot-20261021/baseline.json`. New unit checks compare actual geometry, materials, transforms, native poses, Raptor motion, Bird Lab guided/free observation states, instance isolation, cleanup, loader failures, stalled optional loading, and deployment mirrors.

New real-WebGL workflows compare the two live tool scenes with the pre-pilot sources, the catalog path, and the unavailable-catalog fallback. They assert actual catalog use, actual dove geometry, motion/observation parity, and live shader/rendering state. The preview workflow compares actual rendered pixels and checks cleanup, mobile layout, keyboard access, and local-only dependencies. Existing affected-tool regression tests remain unchanged.

One existing Raptor flight-continuity workflow times out during its animation-frame-based mount wait despite a visible canvas. The same failure was reproduced with the preserved pre-pilot tool source. Its original test and shared harness remain unchanged; the new real-host flight coverage waits independently of the manually stepped animation clock. The failed runs remain in the report directory rather than being counted as passes.

Final results and scope are recorded in `reports/shared-assets-pilot/verification.json`. These checks cover this limited pilot; they are not evidence that arbitrary animals, physical models, or complete environments can be interchanged.
