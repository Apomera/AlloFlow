# Pass36 static transported feeding-club oral surface candidate

Task-local version against source SHA `5c12f16227e6e002486a9cd9f801729636664bca0b64e08a5e286c55b65ef58c`. Two exact source guards; no repository writes, runtime tests or browser work. Candidate SHA `6e8b2ee8f763bfe6ae424c8875d5eca89b8b9f61eeb842dd09ac34acfa3ea46a`. The first four-patch candidate `fa38027e0b922e5e91c790d233a078a1c3280e3b1b4ac3d8922a5c44e20e33ee` remains available in ../pass36-oral-candidate/.

This version keeps the same limb-only cream oral shader and roughness response, while creating the scalar mask exactly once. It has no per-frame oral buffer writes or version increments. Existing position and normal buffers retain their original update code.

At each original tube t/theta, the inverse-ellipse gradient supplies oralDot=(cos(theta)/depth)/hypot(cos(theta)/depth,sin(theta)/width). Depth and width use the same existing club-bulge factor; common radius cancels. The tube's transported frame carries the theta=0 oral direction with every arbitrary reach, so its orthonormal pose rotation also cancels. The static mask therefore follows the exact cup-facing side without reading world up, camera direction, or runtime strike state. Eight arms retain zero; only the two feeding clubs receive the t=.75-.85 faded face cue.

The existing arm material gets its own shader wrapper and cache key. It reuses the current medium pigment field and derivative-filtered weight, adds no noise samples, and stays opaque with no emissive output. Mantle, head and fin compiler strings and cache keys remain unchanged.

The new static scalar attribute adds 7,560 bytes across ten existing limb geometries. No new materials, meshes, geometries, textures or draw calls; no frame allocations or new dynamic uploads. Positions, normals, indices, cup instances, exact contact curve, root motion and 200/260/650ms timing remain unchanged.

The current surface-filter membership contract needs to recognize three base-key materials plus the same existing arm material under cl-squid-limb-oral-v36. Existing scalar helper count and literal prefixes stay intact. Baseline-to-candidate all-attribute snapshots should compare the approved static attribute separately; old position/normal/index goldens should remain exact. Root validation should prove static mask agreement with actual transported normal dots and cup direction over forward, vertical, backward and lateral poses, and assess exposed-club discrimination in native captures.
