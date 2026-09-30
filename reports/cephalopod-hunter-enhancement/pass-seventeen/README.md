# Cephalopod Hunter — pass seventeen

Silverside prey now have slimmer bodies, distinct silver side bands, separated dorsal fins, paired fins, more developed forked tails and attached eye detail. Rock dens gain deterministic irregular stone faces, the reef's existing mineral shading, a corrected dark stone palette, and a shallow interior with visible sides and ceiling.

Fish retain two meshes and one independently owned material each. Dens retain five meshes and three materials each, bounded stone profiles, grounded supports and checked doorway/contact planes. Placement draws, landmarks, shelter radius, capture rules and animation loops are unchanged. Full geometry/buffer costs and exact preservation checks are recorded in [the validation summary](validation-summary.json). All four runtimes match.

**43 focused unit cases and four serial Chromium browser cases passed**, with no browser retries or skipped cases. Browser checks cover native fish/den draws and shader bindings, static ownership, motion/pause/reduced-motion/resume, fish capture disposal and scene cleanup. Six final views were reviewed against the exact saved camera/seed fixtures.

The forms remain illustrative. The den uses a shallow illustrated interior rather than a complete volumetric cave; its shelter rules are unchanged. These checks do not establish FPS or temporal shimmer.

- Fish: [side](fish-side.png), [three-quarter](fish-three-quarter.png), [school](school.png)
- Den: [three-quarter](den-three-quarter.png), [entrance](den-entrance.png), [phone](den-phone.png)
- [Model construction and references](model-notes.md), [environment construction](environment-notes.md), [validation details](validation-notes.md)

The scoped commit excludes the twelve pre-existing translation-wrapper changes in each tracked runtime and preserves unrelated shared work. No push or deployment.
