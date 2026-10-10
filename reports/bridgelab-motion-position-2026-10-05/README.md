# Bridge Lab: see ground and deck motion together

The optional **Motion guide** now connects its three exact readings to a compact position diagram across the bridge. Students can see why deck motion from rest and deck motion relative to the ground are different quantities.

## What changed

- The gold deck and teal ground shapes follow their own unrounded positions. Dashed outlines mark rest, and a white segment joins the two positions to show their relative gap.
- Circle and diamond markers keep their shapes at both widths. Their centers follow the shared position scale.
- The diagram shares the rails' fixed experiment scale, including the common scale for A/B. Turning the camera leaves this direction and scale unchanged. The existing native readings show the actual signed motion in cm; the 3D scene retains its 10× magnification.
- An exact zero has no white gap. Small nonzero movement keeps its exact proportions, including when a tiny trial is compared with a much larger one. Shapes have no automatic minimum separation.
- The figure explains one sway mode. It does not imply individual member deformation or damage. Native captions and labels remain outside the decorative SVG.
- The diagram appears when the existing guide is opened. It follows deliberate stepping with reduced motion enabled and remains available in the current-experiment 2D graphics fallback.
- Both source copies and both English registries include the change. No new replay animation, texture, 3D geometry or control was added.

## Checked

| Check | Result |
| --- | --- |
| Complete unit suite | 283 passed across three files |
| New behavior coverage | Two new cases and three extended motion-coherence cases |
| Chromium workflows | 29 passed in one fresh run, no retries |
| Numerical sweep | 144 configurations |
| Source mirrors | Identical; syntax valid; CRLF retained |
| English labels | All 1,350 literal Bridge Lab fallbacks match both registries |
| Fresh feature captures | 24 verified images |

Geometry checks derive expected positions independently from the native physical readings and range. They cover opposing directions, same-side subtraction, exact rest, true zero, tiny-amplitude proportions, unequal saved A/B, camera independence, reduced-motion disclosure, fullscreen, current fallback and graphics recovery. Browser checks also use the SVG screen transform to verify rendered endpoint positions at desktop and phone widths.

The browser run includes the previously verified immersive scenery and energy-learning workflows. Source and test hashes stayed unchanged during the completed regression runs and match the final files. English registries were checked independently because the harnesses use literal fallbacks.

The initial visual preview found stretched markers and two test assumptions about scroll insets and an offscreen camera. Marker sizing was corrected, and the fixtures now deliberately expose the readings and camera before measuring them. Those preview records, artifacts and images are retained separately; the counts above come from the completed final runs.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-motion-position-2026-10-05/source-verification.json)

To check the stored results against the current source and labels:

```powershell
node reports/bridgelab-motion-position-2026-10-05/verify-shaking.cjs
node reports/bridgelab-motion-position-2026-10-05/verify.cjs
```

## Preview

### Compare the positions

![Ground and deck positions with resting outlines and exact relative gap](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-motion-position-2026-10-05/bridge-1000-position-diagram.png)

### Phone and 2D fallback

![The same position diagram at phone width in graphics fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-motion-position-2026-10-05/bridge-320-position-fallback.png)

Changes remain uncommitted.
