# Pass41 independent read-only review

Reviewed canonical runtime and literal change guards against baseline `73cc490a61ab9f2c0f85c8a0ab8478e242e7291a517148b5a3c3391b9ab09788`. Final reviewed candidate supplied by root: `212a92ee1d0be28ef01f56a540486065d394d14e48e2bc63a3df8d5a2d05a6ba`.

No remaining actionable correctness defect found in the reviewed changes. This is source review only. I did not execute CPU tests, browser scenarios, captures, renderers, or servers. Root owns those checks and visual acceptance.

## Resolved shader findings

The first candidate differentiated the unwrapped angle via `fwidth(growthPhase)`. Although the sine itself is periodic across the atan meridian, that derivative spikes at the branch and suppresses fine growth lines along a narrow stripe. The first refinement to derivatives of `vec2(sin(growthPhase),cos(growthPhase))` removed that stripe, but could underestimate an undersampled high-frequency phase step: a near-2π increment produces a near-zero periodic finite difference and can restore detail on a distant shell.

The final candidate uses derivatives of the continuous q.xz coordinates, divided by a bounded radius squared, to estimate angular change. Its footprint is `29*(abs(angleDx)+abs(angleDy))` plus the lower-frequency vertical modulation footprint. This avoids differentiating the atan branch and retains a conservative frequency estimate when the high-frequency sine is undersampled. Both findings are resolved in the inspected final source, before root validation.

## Shell mapping and rendering

- Piece0 reconstructs the original child transform exactly: local position multiplied by `[1,.85,1.2]`, then translated by `[0,.18,-.05]`.
- Pieces2 and3 reconstruct the retained +π/2 X rotation as `[x,-z,y]`, then their original translation. The shell geometry never applied body `sm`; its absence from this shader is correct.
- Whorl spiral phase follows the existing ridge phase approximately. Normalizing radial coordinates by their authored radii causes only a small phase deviation from the small ridge term. The spire phase slope and its 6.16 offset agree with the authored ring relief and whorl junction to the intended visual precision.
- The shader changes only color and roughness. Existing local normals and renderer normal-matrix transformation are retained; nonuniform shell scale is handled through the existing StandardMaterial path.
- All three finished exterior pieces share identical shader source and a static program cache key. Their piece number is a per-material uniform. Bundled Three r128 stores `onBeforeCompile` uniforms in each material's properties and refreshes material uniforms when material ID changes, so program sharing does not share the piece value.
- Piece1 keeps its original recessed dark material. New code retains the original four shell material and mesh slots; it does not add attributes, textures, runtime animation uniforms, allocations in the frame loop, or extra disposal duties.
- The partial-probe guard runs before changing shader text or uniforms. The custom no-derivative variant omits fine growth detail. This does not prove support for the entire existing r128 StandardMaterial on a device without derivatives.
- Finite guards prevent atan(0,0) and zero-denominator angular derivatives. No signed-base pow or negative roughness was introduced.

An angular band pattern necessarily converges at the spire axis. Broad, low-frequency staining remains unfiltered there, while the fine growth footprint suppresses most detail near the tip. A tiny pole fade could soften the final subpixel convergence, but source review does not identify this as a correctness defect. Root should judge the tip in close and distant captures.

## Eye material and target-cycle behavior

Changing crab eyes from BasicMaterial to StandardMaterial gives both stalk and pupil their requested scene-light response. Roughness .32 and metalness0 are finite and supported. Geometry, vertex colors, owned material count, visibility, and spawn RNG are retained. Actual appearance still needs root's native captures.

The new cycleTarget calls refresh tracked presentation and mission immediately after selecting the next prey, before announcing and focusing the canvas. `updateTrackedPrey` uses pendingStrike.target whenever a strike is committed, so cycling still prepares the next selection without presenting a different active strike target. It changes presentation fields and the marker only, without modifying gameNow, readiness thresholds, strikeReadyAt, pendingStrike, prey positions, or RNG.

cycleTarget already clears observationUntil; the immediate mission refresh therefore restores selected-prey guidance after Observe. During inspection the refresh preserves a hidden marker; inspection's existing stage CSS hides the mission group. During pause the event refresh uses the frozen game clock and poses. The existing frame loop still copies camera quaternion to a visible marker and advances gameNow only while active. No new clock drift, input listener, or frame scheduling path was introduced.

The existing updateMission function can complete a satisfied mission; that function already runs each paused/game-over HUD frame. Calling it on the selection event does not introduce a new mission condition or elapsed-time advance.

## Root validation focus

Verify actual GL program linkage and piece0/2/3 uniform values across the shared shell program; close and distant shell views across low/balanced profiles; real eye lighting; pause/inspection disposal; native desktop and touch Target cycling; Observe dismissal; pending-strike committed identity; frozen game clock while paused. The existing unit test's shell-only inverse comparison correctly keeps the separately changed eye material live, so its geometry/material retention claim should be described as shell finish scope rather than a claim that all pass41 materials are unchanged.
