# Cephalopod Hunter — pass nineteen

The grouper now has a stocky tapered body, a recessed mouth, attached fins, paired eyes with dark pupils, gill detail and a joined rounded tail. Its anatomical front now follows patrol travel and pursuit, so a nearby predator's direction is readable. The existing four mesh/material slots remain.

Gameplay review reproduced a fairness bug: a real grouper inflicted 35 damage even when a same-frame ink request consumed a charge and created a cloud. The complete existing activation/expiry phase now executes after player motion and shelter handling, before all predator AI. Accepted defense and expired clouds are therefore evaluated consistently, with the same finite reserves, cooldowns, spatial cover and resistance rules.

**52 focused unit cases, 11 Chromium scenarios and six matched native views passed.** Same-frame controls verify real grouper/moray bites and defense. Lifetime checks verify pause/inspection, first expired-frame damage, cooldown rejection, non-inking species and exactly-once disposal. Native low/balanced checks verify actual linked shaders and position/normal/color bindings, nose-first patrol/pursuit, immutable resources, phone visibility and cleanup. Existing search/cover, target selection and reef mission regressions pass. Initial failing evidence is retained; no retries or relaxed assertions.

Measured grouper cost: 228 → 705 vertices, 282 → 969 triangles, 8988 → 31,194 raw geometry bytes, with four meshes/four independent materials. The fish remains illustrative with static fins and subdued mottling. Additional detail is not an FPS claim.

- [Oblique](grouper-oblique.png), [side](grouper-side.png), [mouth](grouper-face.png), [tail](grouper-tail.png), [reef](grouper-reef.png), [phone](grouper-phone.png)
- [Model notes](model-notes.md), [gameplay review](gameplay-notes.md), [validation notes](validation-notes.md), [validation summary](validation-summary.json)

Accepted cephalopod, crab/clam/fish and environment geometry remain exact. Four runtime copies match. Twelve pre-existing translation-wrapper changes per tracked runtime and unrelated shared work are preserved outside the scoped commit. No push or deployment. The audit also identified older visuals in the streamed-den branch for a future pass.
