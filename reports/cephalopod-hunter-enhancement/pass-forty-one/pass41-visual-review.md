# Pass 41 visual review

Read-only review of existing `baseline-balanced` and `current-balanced` captures. Baseline runtime SHA: `73cc490a61ab9f2c0f85c8a0ab8478e242e7291a517148b5a3c3391b9ab09788`; current runtime SHA: `212a92ee1d0be28ef01f56a540486065d394d14e48e2bc63a3df8d5a2d05a6ba`.

The capture manifests report matching crab index, type, position, rotation, scale, bounds, camera, and camera target for both reviewed pairs. The recorded scope is a seeded paused diagnostic with other mesh visibility masked and original world lighting retained. This is material appearance evidence in that framing; it is not a natural-world pixel comparison, motion test, performance result, or sound verification.

`eye-close.png`: the two previously flat black pupils gain small soft highlights from the scene lighting. The colored stalks now shade consistently with the body and legs, giving their cylindrical curvature more depth. Highlight strength looks restrained in this view; eyes remain clearly dark. No obvious new clipping, seams, speckles, or displaced outlines are visible. The polygonal pupil silhouette remains an existing geometry limit at this close distance.

`hermit-shell.png`: the shell gains quiet tan bands that wrap around the whorl and fine growth-line hints. The pale shell remains visually calm rather than strongly striped. The lower shaded band shows the surface detail more clearly than the very bright upper region, which is reasonable for this lighting. Its aperture and the carried crab remain readable; there is no obvious new seam or silhouette change. Both hermit pupils gain the same soft scene-light response.

Recommendation: accept the visible material polish for this pass. Any later geometry refinement should be a separate measured change; the existing close-up faceting does not invalidate the current material improvement.

Only existing PNGs were opened with `view_image`; manifests and filenames were read. No browser, server, test, GPU job, capture, or repository edit was performed by this reviewer.
