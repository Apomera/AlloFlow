# CC0 3D decoration assets (GLB)

Low-poly `.glb` models served to the Memory Palace "Collectibles" shelf (and any
other GlbLibrary consumer). Referenced by `glb_library_module.js` catalog entries
with relative `glbUrl: 'assets/glb/<file>.glb'` — resolved against the module's
own script origin, so the same catalog works from the Firebase host and the
alloflow-cdn.pages.dev mirror.

## Provenance

All models in this directory are from **KayKit — Dungeon Remastered Pack 1.0**
by **Kay Lousberg** (https://kaylousberg.com), retrieved 2026-07-05 from
https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0

License: **CC0 1.0 Universal (public domain)** — see `KAYKIT_LICENSE.txt`
(verbatim copy from the source repo). Attribution is not required by the
license; we credit Kay Lousberg in the in-app About → open-source credits
anyway, per project practice.

| file | source file |
|---|---|
| torch_lit.glb | torch_lit.gltf.glb |
| chest_gold.glb | chest_gold.glb |
| coin_stack.glb | coin_stack_medium.gltf.glb |
| candle_triple.glb | candle_triple.gltf.glb |
| key.glb | key.gltf.glb |
| banner_shield.glb | banner_shield_blue.gltf.glb |
| crates_stacked.glb | crates_stacked.gltf.glb |
| barrel_decorated.glb | barrel_large_decorated.gltf.glb |
| pillar_decorated.glb | pillar_decorated.gltf.glb |
| table_decorated.glb | table_small_decorated_A.gltf.glb |
| potion_bottle.glb | bottle_A_labeled_green.gltf.glb |

## Adding more

Keep files small (this whole set is ~660 KB; the CDN rejects >25 MiB files —
see the 2026-07-05 CDN freeze post-mortem). Copy the pack's license file
alongside any new pack's models, add the catalog entry (with a Prim3D fallback
recipe + `unitScale`) in `glb_library_module.js`, and mirror this directory to
`desktop/web-app/public/assets/glb/`. Non-CC0 licenses (CC-BY etc.) REQUIRE an
entry in the About-tab credits (`view_info_modal_source.jsx` OSS_CREDITS).
