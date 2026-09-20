# Fox and rabbit anatomy, rest, and stance contacts

Foxes have a more tapered skull and muzzle, smaller eyes and a slimmer lower jaw. Their resting pose lowers the body over folded legs, lowers the head and turns the tail alongside the body. Rabbits have a smaller head, shorter ears, a compact torso, distinct haunches, smaller paws and a smaller tail. Resting rabbits lower into a compact posture.

Recorded world-space paw contacts hold through stance within a bounded reach. Contact offsets fade through swing and release for absence or flight. The timeline reconstructs the contacts deterministically, so scrubbing and rewind produce the same poses. Fox terrain fitting accommodates the lowered body while preserving connected limb lengths. Rabbit soles now follow terrain beneath each paw; articulated upper and lower limb segments visibly connect hips to the moving paws.

Rabbit limbs share one instanced mesh per representative (eight segments), reusing existing geometry and fur material. No texture or material is added. Population calculations, animal decision states and movement paths are unchanged. These are illustrative rigs and bounded terrain fitting, not collision avoidance or a full locomotion physics model. Contacts may reset when they exceed reach; ankle fitting follows the longitudinal slope.

## Validation

Nine unit checks passed across mammal rest, fox footing, fox anatomy and foot motion. They cover held world positions, terrain clearance, fixed limb lengths, deterministic reconstruction, unchanged model rows and smooth settling. Rabbit limb lengths and paw endpoints were rechecked after adding the connected limb geometry.

Four browser scenarios passed: mammal rest, foot motion, fox anatomy and fox footing. These inspect rendered world transforms, terrain clearance, connected fox joints, pounce clearance, walking, rewind, reduced motion and mobile inspection. The new resting check explicitly accounts for reduced motion neutralizing tail sway. Saved food-web model data remains unchanged and no runtime errors were reported. Standing/resting fox and rabbit views, rabbit walking and mobile resting captures were visually reviewed.

JavaScript syntax validation passed. Web and desktop sources match at SHA-256 701B7A5D8FBAAAFEF802B4B65603E407C71C922900AE7222B229B5E8BFF7DD4C.