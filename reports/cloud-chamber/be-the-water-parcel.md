# Be the Water: parcel and molecular lens

Liquid, cloud-droplet, rain, and ice materials now share a small procedural environment texture. It adds curved-surface highlights and depth without new network assets. The environment approximates sky lighting; it does not reflect landscape objects. The liquid parcel is less transmissive, and the surrounding halo is softer.

The molecular lens uses smoother atom geometry and opaque atom materials with depth writes, avoiding the translucent overlap artifacts produced by instanced atoms. Atom counts, bond geometry, and phase arrangements remain unchanged. Flight options now includes a Molecular lens toggle, enabled by default, for switching between the enlarged molecular view and an unobstructed landscape. Turning it off preserves the simulation state and learning cues.

Validation: `node dev-tools/watercycle_pilot_parcel_qa.cjs` checks shared optics across all four forms, molecular depth and visibility, paused-time stability, canvas preservation, keyboard activation, phone accessibility, and exactly-once environment-texture disposal without JavaScript or shader errors. Close-up parcel and first-person molecular screenshots were reviewed. Experience and kernel regression results are in `pilot-parcel-regressions.json`; the existing source assertion was updated to permit the explicit hidden lens state.
