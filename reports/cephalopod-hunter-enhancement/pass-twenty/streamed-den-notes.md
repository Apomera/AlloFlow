# Continuous shelter finish during exploration

The initial four shelters had already gained angular mineral stones and a recessed interior. The exploration branch still spawned box pillars, a flat lintel and a single transparent dark plane. Long trips could therefore lose the established reef finish.

This pass reuses the accepted stone and shadow geometry helpers and derivative-aware rock material for newly streamed dens. The same palette cycles by den index; stable shape variants derive from the index without consuming world randomness. Five mesh slots and three material allocations remain. Existing initial dens and the shared geometry/shader helpers stay exact.

The new streamed arch matches the accepted initial arch's pillar/roof transforms and doorway. That intentionally updates the old streamed box silhouette and visual envelope. Safe radius, nearest-den threshold, cap of twelve, position selection, random yaw, terrain grounding, regeneration, shelter safety and minimap logic remain unchanged. There is no new collision or gameplay gate.

Root will validate real streamed construction, safe shelter entry, cap/RNG invariants, shader fallback and cleanup. Raw resource costs and matched views belong to the final report; no frame-rate improvement is claimed.

## Final integrated validation

Root integrated all three exact guarded stages. Final 69 focused CPU cases and eleven native Chromium scenarios passed with no retries, skips or flaky results. Candidate checks passed moray/home 7, moon jelly 6 and streamed shelter 4. Root and independent review accepted thirteen unobscured fixed-world desktop/phone captures with exact seeded state/camera/spawn agreement. Only the capture pause veil was hidden; actors and scenery remain.

Measured moray: 1164 vertices, 1856 triangles, 53040 raw geometry bytes. One stone home: 880 / 400 / 34080. Each moon jelly: 1721 / 2970 / 79776. Streamed den: 565 / 302 / 20120. Existing mesh/material counts remain. The original moray fin-normal failure and capture-fixture rejections are retained in local evidence; their corrections and limits are recorded in validation-summary.json. All four runtimes match and protected AI, ink timing, mission rules and other model regions remain exact.
