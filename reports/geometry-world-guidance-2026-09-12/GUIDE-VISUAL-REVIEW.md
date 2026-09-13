The guide and compass pass is integrated in the canonical Geometry World core.

- NPC nameplates use a cream card, dark ink text and a sage symbol. Authored names such as “1. Sora - Arrival Quay” retain their exact identity while rendering the name and location on separate lines.
- Open activities use a drawn question mark, completed activities a drawn check, and ungraded discoveries a drawn diamond. Symbols do not depend on platform emoji fonts.
- A tracked guide receives an amber outline in its existing nameplate and a matching compass marker. The compass draws the tracked marker last when directions overlap.
- The compact compass now projects the camera’s actual forward and right axes. Turning east or west no longer reverses guide directions. Offscreen markers retain the same convention as spoken directions.
- Nearby guides show an E keycap and Talk; coarse-pointer devices show Tap Talk, matching the existing touch action. The distant question marker becomes smaller and more restrained, and yields to the nearby interaction prompt.
- All guide canvas textures are reused. They repaint only when name, dialogue, role, answer, pin or contrast state changes. Their materials bypass tone mapping and depth writes so text stays readable through environment changes.
- Showcase freezes NPC animation while hidden, preventing question markers from becoming visible again or new preview/ring objects being created. Existing clear-world ownership disposes every guide texture.

Verification: 13 actual-THREE regression tests passed against production after the contrast fix; the full output is in `npc-tests.txt`. Tests cover all four cardinal headings, both offscreen directions, camera transforms, role distinctions, text identity, stable textures, touch copy, pin ordering, Showcase and disposal.

Canonical screenshots `guide-day.png`, `guide-tracked.png`, `guide-close.png`, `guide-question.png` and `guide-contrast.png` were inspected. The world still contains all 2,673 Harbor cells. Pin, contrast, texture reuse and discovery-role checks passed without browser or console errors. Night graphics remain visually unverified in this pass. The initial night selector attempt timed out because the harness had not opened settings; this was a harness fixture issue, with zero product runtime or console errors. The optional night-only retry was intentionally stopped during final QA to free the shared browser slot. The prepared `capture-guide-night.cjs` is available for a later pass.

The compass remains decorative and aria-hidden. The parent’s journal tracking and spoken L directions provide the corresponding accessible navigation.
