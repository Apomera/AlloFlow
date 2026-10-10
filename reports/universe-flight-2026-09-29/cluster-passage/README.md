# Star cluster passage — Enhancement 62

The three nearby generated stellar groups are now destinations you can inspect, approach and orbit. **Star cluster passage** is a 36-second scenic route through the first group, with three moments to pause, look around, or leave the route and return.

The route moves slowly beside the stars, then pulls back for a wider view. Nearby stars shift more strongly than distant ones as the camera moves, making the scene’s depth easier to see. The groups use the stars that were already present in the neighborhood; their positions and brightness are unchanged.

Opening a landmark inspector during a flyby now starts an exploration detour automatically. This fixes an existing case where the inspector stayed hidden while the route remained active. **Return to flyby** restores the paused route position and settings.

## Model

These groups are generated teaching scenery, not surveyed star clusters. Their labels identify places in this model. The viewing path is an authored exploration-camera movement, not a spacecraft trajectory or a simulation of stellar orbits. The existing light-chase mode and its relativity calculations remain separate.

Pausing freezes the route while you look around. The existing playback pace, highlight stops, free look, camera lens, field notes and exploration detours apply to this route. Three new thumbnails show its paused highlights. Dust remains a separate illustrative display setting.

## Verification

See [verification.json](verification.json) for completed checks and source hashes. The [54 focused tests](unit/evidence.json) check movement, pause/resume, every highlight at multiple playback rates, detours, dust, and relativity. The [40 native WebGL captures](native-attempt1/check.json) confirm that the previous 15 highlights and a relativistic control remain pixel exact. The [18 preview cards](previews/check.json) retain all 15 previous images unchanged. The [browser checks](browser-attempt4/check.json) cover five interaction workflows and three accessibility scopes, including a 320-pixel phone layout and full-screen controls. Returning from a lens-and-orbit detour restores the exact camera state and pixels. Opening the current landmark during an active flyby creates a return point; choosing a different destination ends the route as before.

Focused unit tests use a Node canvas/event shim. Browser graphics use Chromium SwiftShader. The full application DOM suite and a physical-device GPU matrix were not run.

Nothing is staged or committed.
