# Mammal foot motion

Foxes, rabbits and voles now use separate stance and swing phases. The swing lifts each foot, with eased transitions at takeoff and landing. A local vertical correction cancels the foot centre's rotation arc during stance. Rabbit left/right feet move in pairs; fox and vole feet alternate diagonally. Rabbit body bounce is smaller during ordinary movement.

Stride strength follows actual recorded travel speed and changes by at most 0.20 per sample. Feet settle toward the neutral pose over several samples when an animal stops, rather than snapping as soon as speed reaches zero. The same recorded distance drives every replay. Starting and reduced-motion poses remain neutral. Existing fox pounce extension is retained.

This is illustrative animation, not a measured biomechanical gait or a terrain-contact solver. Stance compensation is local to the animal; it does not plant each paw at a fixed world position or solve foot contact on slopes. The changes do not alter paths, behavior decisions, feeding, or population equations. No new geometry, materials or animation timers are introduced.

## Validation

Nine targeted unit checks passed across the final runs: three foot-motion tests, four existing action-transition tests, and two ear-motion tests. The browser scenario passed with actual rendered limb transforms for foxes, rabbits and voles, exact rewind, frozen reduced-motion poses, unchanged saved runs and mobile layout checks. Desktop and mobile captures were reviewed. JavaScript syntax validation passed, and web/desktop source SHA-256 hashes match (8E18AD3224B77D9DBE142B87A20CBE6715154BDD5F433BD76FDD265C28ECFBC3). An initial action-transition timeout passed on rerun; a signed-zero neutral-angle assertion prompted canonical zero output before the final foot tests passed.
