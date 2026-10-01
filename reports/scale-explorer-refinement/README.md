# Scale Explorer — exploration without leaving the scene

## Changes

- A compact landmark navigator now sits beneath the rendered canvas, inside the scene frame. It works across specimens that have landmarks and stays available in fullscreen.
- Previous and next controls cycle through available landmarks. The title shows the current landmark and position in the sequence. A return control restores the whole specimen without changing scale.
- The title opens science notes and their source link in the viewing area. The notes scroll independently on a phone and are reachable by keyboard. Closing the notes or returning to the whole view preserves a useful focus position.
- Left and right arrows work while the navigator has focus. Escape closes notes first, then returns to the whole specimen. These shortcuts are scoped to the navigator.
- Planetary landmarks remain disabled when their surface imagery is unavailable. The navigator is omitted in chart and comparison views.
- Orion's cloud visibility now eases between full dust and revealed stars. The transition runs even when ambience is paused, then stops scheduling frames. Reduced-motion mode and the measurement comparison apply visibility immediately.

The nebula geometry, stellar positions, measured dimensions, and saved observation format are unchanged. No runtime dependencies or assets were added.

## Verification

- All 107 existing unit assertions passed, including fullscreen cleanup.
- Four focused browser scenarios passed for landmark cycling and sources, phone/fullscreen behavior, dust transitions and idle rendering, and unavailable planetary imagery.
- All 33 browser scenarios passed across the full run and focused continuations. The full run passed 27; two screenshot saves encountered `ENOSPC`, skipping four later scenarios. The six affected scenarios subsequently passed. A workspace refresh interrupted the continuation after its first success, so only the remaining five were restarted. See `browser-results.txt`, `browser-retry-results.txt`, and `browser-final-results.txt`.
- Source syntax and the desktop mirror are checked during synchronization. Only the Scale Explorer English entries are updated in the string catalogs.

The main source and desktop mirror matched SHA-256 `2CE79C8E47EFF809B1354D242B6FEFC6EC9922C6470CDAB5016D95D192FC0A83` during verification. The local preview returned HTTP 200 after its server was restored following the workspace refresh.

## Visual evidence

- `orion-notes.png` — navigation and science notes beside the dust ridge
- `phone-exploration.png` — 320-pixel phone with unobstructed canvas
- `phone-notes.png` — independently scrollable notes
- `fullscreen-exploration.png` — navigation inside fullscreen

Preview: http://127.0.0.1:54391/?tool=scaleExplorer&focus=orion-nebula&v=refined
