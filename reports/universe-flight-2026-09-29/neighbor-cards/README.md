# Nearby destination cards — Enhancement 63

The landmark inspector now presents nearby destinations as cards with the landmark type, camera range, and an existing scenic preview where one is available. Numbered tiles identify destinations without a scenic preview. The ordering stays tied to the inspected landmark while the camera moves.

**Look** pauses and faces the destination without moving the camera. **Fly here** uses the existing guided approach and pauses at the viewing distance. Destinations already within range show a disabled **In range** action. The expanded inspector has more room for the cards.

Both actions remember the previous view. **Back** restores its position, direction, lens, journey counters, travel speed, viewing-distance setting, and expanded Details state. A flyby return point remains available throughout the exploration detour.

## Model and previews

Ranges use the existing model positions in light-years. The scene contains generated teaching scenery. Preview images show authored scenic viewpoints; they are not live views from the current camera. This enhancement changes the inspector and its navigation controls. The renderer, relativity calculations, landmark positions, and preview assets retain their Enhancement 62 hashes.

## Verification

See [verification.json](verification.json) for the completed checks, source hashes, and browser evidence. The focused inspector tests verify stable neighbor ordering and the mapping of all 18 scenic previews to the 21 current landmarks. Browser checks exercise keyboard Look, guided flight, arrival, Back, flyby detours, preview mapping, and narrow-screen layouts.

Browser graphics use Chromium SwiftShader. A physical-device GPU matrix and the full application test suite were not run.

Nothing was staged or committed.
