# Gentle foliage breeze

The mature canopy, young trees, shrubs and grass now have subtle foliage movement. Spatial variation keeps nearby leaves from moving in perfect unison. Leaf bases and grass roots flex less than their tips. Existing seeded plant positions and mushroom spacing are preserved.

The Foliage motion control offers Gentle breeze and Still. Breeze follows the meadow timeline, so pausing holds the scene and rewinding restores the same foliage deformation. Reduced motion disables the breeze while retaining the selected preference. Help text explains how to start the motion and how it relates to the timeline.

Shared shader uniforms deform existing instanced foliage. This adds no meshes, textures, materials, draw calls or animation timers. It is an illustrative visual effect, not a wind or weather model, and does not affect population calculations. Foliage normals remain unchanged for this small deformation.

## Validation

JavaScript syntax checks passed. Web and desktop source hashes match: E1B713062A96DF8B36A0F2E7CC2381D6C480D30F59D7F322A113335D357010EE.

Two browser scenarios passed: the new foliage-motion scenario and the existing woodland-layer regression. Checks cover compiled shader uniforms, an actual rendered difference between Breeze and Still, exact scene pixels after restoring Breeze and rewinding, pause/play, reduced-motion preference, mobile overflow, scene recreation, unchanged saved model data and no shader/runtime errors. Pixel comparisons hide only the text overlay, whose rounded-edge antialiasing otherwise varies by 10 pixels after timeline interaction. Overview and mobile captures were visually reviewed. The loaded test host required a longer setup allowance; the completed foliage run passed, and the subsequent mobile refinement rerun passed in 1.1 minutes.


## Mobile observation refinement

The fullscreen control now has a 44 by 44 pixel touch target. Scene labels reserve space beside it, wrap long text and remain readable on narrow screens. Browser checks confirm at least six pixels of separation, the target dimensions and no horizontal overflow at 390 and 320 pixels. The 320-pixel capture was visually reviewed. All foliage checks also pass with this refinement.
