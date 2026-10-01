# Cephalopod Hunter — pass twenty-one

**Changes are unstaged and uncommitted, as requested.**

Conch shelters now use a continuous coiled shell with a thick rolled lip, warmer interior and a real recessed opening. Barrel sponges have joined fluted walls, a rounded uneven rim, a deep cavity and a basal skirt. Each object owns one static opaque mesh and material. The original spawn order, seeded randomness, shelter bonuses, carrying, drop and expiry rules remain unchanged.

Pickup guidance now follows the actual vertical reach of G for both shells and pearls. Shelter prompts show camouflage, the selected species' actual carrying cost and placed-cover lifetime. The carried status and placed-cover countdown follow simulation time, including pause. Giant Pacific octopuses correctly show no carrying slowdown; coconut octopuses show the reduced cost. Hidden prompts clear obsolete text.

**84 focused CPU cases and 14 Chromium scenarios passed**, with no pending, skipped, flaky or retried cases. The new native pair verifies actual GPU submission/bound attributes, static resource identity, pickup/drop, carrying speed, camouflage, den entry/exit, cover expiry, pause/inspection, existing reduced-motion wobble, larger text at 390 pixels and cleanup. Preserved predator search/cover, prey memory, ink timing, target selection and mission completion also pass.

Twelve unobscured, matched views use identical actual shelter transforms/state/wobble, other actor phases, twenty counted simulation steps and fixed world cameras. Nothing in the scene was moved or hidden for appearance captures. Only the native pause veil was hidden while the dive was paused. Two supplemental views use the third naturally spawned sponge on the shelf; the first sponge remains on the original steep drop-off.

Measured geometry costs per actor (vertices / triangles / all attribute and index bytes):

| Object | Before | After | Meshes / materials, before → after |
| --- | --- | --- | --- |
| Conch | 552 / 684 / 21768 | 1682 / 3360 / 80712 | 10 / 6 → 1 / 1 |
| Barrel sponge | 390 / 324 / 14424 | 1002 / 1920 / 47592 | 13 / 13 → 1 / 1 |

The two conches and three sponges together change from 59 meshes to five, while allocated geometry rises from 86,808 to 304,200 bytes. These are static resource counts, not an FPS benchmark. No new texture, shader, light or per-frame geometry update was added. Coconut and bottle geometry costs remain identical.

The models are illustrative. The conch retains a rounded loose upper spire and subtle ribs; its recess does not reproduce a complete internal spiral. Sponge tones and broad flutes do not simulate microscopic pores. The existing steep drop-off placement is not terrain-conforming around the entire sponge footprint; shelf views provide a clearer basal-contact check. Coral and phone controls obscure the first sponge's lower edge in some compositions.

- [Conch oblique](conch-oblique.png), [aperture](conch-aperture.png), [side](conch-side.png), [crown](conch-crown.png), [phone](conch-phone.png)
- [Sponge oblique](sponge-oblique.png), [top](sponge-top.png), [sand](sponge-sand.png), [reef](sponge-reef.png), [shelf](sponge-shelf.png), [shelf base](sponge-shelf-base.png), [phone](sponge-phone.png)
- [Model notes](model-notes.md), [environment notes](environment-notes.md), [validation notes](validation-notes.md), [summary](validation-summary.json)

All four runtime copies match SHA256 `a7c1436b7f06482e070246541d2ccbae11b572f2137fda80c7f3b76fe4ab6573`. Exact guarded replacements and reverse-byte proofs protect unrelated source. Twelve pre-existing translation wrappers per tracked runtime remain intact. HEAD remains `56b65930d599c5d2622a01744da4e2b85f712c5e`; the index remains empty. No commit, push or deployment.
