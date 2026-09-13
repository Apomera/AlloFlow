# Woodland tree refinement

Trees now use flared, tapered trunks and three connected branches anchored to each trunk. Crowns vary between wider, taller and asymmetric forms, with rounded vertical profiles and subtle foliage palette variation. The 175 tree sites, foliage instance count, clearing opening, seeded understory placement, and mushroom spacing are preserved. Trees remain scenery and no simulation equations changed.

Per-tree bark tinting was removed after it caused a rendering attribute conflict in the current Three.js runtime. The final build uses the established bark material and retains the new tree geometry and foliage variation. Both complete browser scenarios subsequently passed.

Validation: woodland lighting/camera/keyboard/mobile/reopen workflow and full soil-cycle workflow passed (2 scenarios). Reviewed forest-overview.jpg and mobile.jpg. JavaScript syntax validated; both source copies match. Additional captures include forest-rotated.jpg, daylight.jpg, golden-hour.jpg, overcast.jpg, and fox-inspection.jpg.