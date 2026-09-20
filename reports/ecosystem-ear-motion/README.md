# Mammal ear articulation

Foxes, rabbits and voles now have two articulated ear joints attached to their existing moving head. Inner and outer ear surfaces move together around an ear-base pivot, retaining their original geometry and materials.

Small independent swivels illustrate attention during existing alert, retreat, listening, tracking and stalking states. The direction uses existing predator/prey cues; fading herbivore alarm does not aim at a predator outside the existing alert range. Rest and fox leap poses add a small backward tilt. Changes are bounded per sample so the ears settle gradually instead of snapping. They return toward neutral when a representative disappears.

These are illustrative pose changes. They add no hearing range or new behavior decisions and do not affect movement, feeding or the population model. The ear angles are recorded with the deterministic behavior samples, preserving rewind and branch reconstruction. Starting poses are neutral, so reduced motion freezes ear articulation with the other pose details.

The renderer reuses the current ear meshes. Only two transform groups per mammal are added; existing geometry and material cleanup remains in place.

## Validation

All 22 unit checks passed. Three browser scenarios passed across the final runs: mammal ears, existing caterpillar/owl articulation, and steady-camera isolation. Fox, rabbit, vole and mobile rabbit captures were visually reviewed. The live-scene observers now use Object3D matrix updates rather than an unused renderer prototype hook; the related isolation regression was corrected and rerun as well. Syntax validation passed and the web and desktop copies have matching SHA-256 hashes. New tests check angle limits, gradual changes, asymmetric attention, rest poses, settling after removal, deterministic reconstruction and unchanged population results. Browser checks inspect the actual ear joints and their parent/child structure, verify exact sample angles, rewind, reduced motion and mobile layout. Desktop captures cover foxes, rabbits and voles.
