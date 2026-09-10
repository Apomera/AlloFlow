# Position HUD layout

The previous keyboard/mouse recovery screenshot at 320×700 showed the Position heading and first coordinate rows covered by the game bar. The coordinate `<details>` is mounted directly under the workspace, while the builder's narrow sandbox CSS sets `top:8px` as though the panel were inside the viewport. The game bar has a higher stacking level and occupies up to 58px on narrow screens.

The core now adds one scoped CSS rule for sandbox screens up to 800px wide with touch controls inactive. Position starts at 68px with the game bar visible, or 56px below the collapsed-bar/fullscreen controls. Its summary and screen-reader toggle retain at least 44px targets; a visible +/− marker makes disclosure clear. Expanded content scrolls within its panel.

On portrait screens at least 620px tall, the panel's maximum bottom is 8px above the existing shape-action cue: `68 + (height / 2 - 188) = height / 2 - 120`, versus the cue's `height / 2 - 112`. At 320×700, this gives a maximum panel bottom of 230px, before the 238px cue. The keyboard/mouse placement hint returns below the crosshair, avoiding the old shared 128px slot. Short narrow landscapes put that hint on the right side. Existing hiding when the builder dock expands remains in effect.

The touch layout and screens wider than 800px are unaffected. Source comparison against the frozen baseline confirms exactly one added stylesheet line and no removed lines or runtime changes. Core and desktop mirror parse and match byte-for-byte. Actual-browser open/closed, normal/collapsed bar, and builder dock states are verified separately by the main QA run; no mock DOM layout test is presented as browser evidence.

Core SHA256: `a2127e6b153534bbcde4220acf14891d843f541d51c4e8c1369d258758ad5574`.

Evidence: `position-hud-source.json`; reproduction: `../geometry-world-building-tools-2026-09-09/after-import-recovery-320x700.png`.
