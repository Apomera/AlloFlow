# MakeHuman body surface — included free

This body surface is derived from the official MakeHuman Community base mesh, released under **Creative Commons CC0 1.0 Universal**. There is no purchase, subscription, royalty, or account requirement for this asset.

Source revision: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.

- [Original body mesh](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
- [Upstream license explanation](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md)
- [CC0 dedication](LICENSE-CC0.md)
- [Asset manifest and hashes](asset-manifest.json)

Courtesy credit: MakeHuman Community and contributors. The original asset names Data Collection AB, Joel Palmius, and Jonas Hauquier as the copyright holders at the September 2020 CC0 release.

Conversion: retained only the body face group; removed helper/joint geometry; triangulated polygons; computed smooth vertex normals; assigned a solid material; omitted textures and UVs. The app centers/scales the mesh, applies the selected surface tone, and allows rotation. No anatomical segmentation or diagnostic claims are added. The mesh is a generic character surface, not a patient scan, and includes no internal organs.

The detailed surface intentionally omits whole-body teaching markers because their procedural coordinates are not validated against this mesh. Blueprint and the 2D Atlas retain the structure-learning overlays.

Reproduce from the repository root with `node dev-tools/build-anatomy-body-surface.cjs`. The pinned source OBJ is retained in the source asset folder; only the generated GLB and provenance files are mirrored into the desktop public assets. No upstream program code is bundled.
