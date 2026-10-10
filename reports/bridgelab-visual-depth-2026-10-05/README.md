# Bridge Lab: visual depth and energy comparison

The immersive bridge views now have a softer sky and more river depth. Paired energy bars connect the amount received during shaking with the stored energy and damping loss students read in the tables.

## What changed

- The existing sky mesh has soft, static cloud colors above a clear horizon. The river has lighter shore colors, a deeper center, and restrained surface glints. The scenery stays fixed while the earthquake model runs.
- The optional **Where did the starting energy come from?** cards now show two stacked bars for each trial: initial energy plus net added work above, and energy stored at 16 s plus damping loss and net removed work below.
- A and B share one exact J/kg scale. Tiny values retain their proportions; exact-zero segments remain empty. Signed work and numerical residuals remain visible in the native tables. Positive and negative transfers can cancel, so these bars show net work.
- Native labels describe the rows, and decorative SVGs add the shapes. Damping and net removal use different patterns. Legend fills and patterns survive print styling.
- Live, saved, and printed evidence reconstruct the bars from their own original inputs. Inspecting later times leaves the 0–16 s accounting fixed.

## Checked

| Check | Result |
| --- | --- |
| Complete unit suite | 281 passed across three files, including 9 new visual checks |
| Chromium workflows | 23 passed in one fresh run, no retries |
| Numerical sweep | 144 configurations |
| Source mirrors | Identical; syntax valid |
| English labels | All 1,346 literal Bridge Lab fallbacks match both registries |
| Feature captures | 18 desktop/phone, immersive, saved/print and graphics-fallback images |

Source and test hashes stayed unchanged during both completed regression runs and match the final files. English registries were checked independently because the harnesses use literal fallbacks. Earlier preview and failed unit records are retained separately; the counts above come from the completed final runs. Print review found blank CSS legend swatches, which were replaced with SVG swatches before the full regression runs.

Scene checks cover orbit, walkway, river and riverbank views, stable colors after repeated bridge-size changes, unchanged texture counts, fewer than 650 draw calls and fewer than 40,000 rendered triangles. Clouds add 2,416 triangles to the existing sky mesh and use no texture or extra draw call.

Energy checks cover exact segment amounts and widths, common A/B scale, tiny-amplitude proportions, true zero, undamped response, fixed saved evidence, fresh print reconstruction, native labels and computed print legend fills. Visual review checked both widths and phone print layout.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-visual-depth-2026-10-05/source-verification.json)

To check the stored results against the current source and labels:

```powershell
node reports/bridgelab-visual-depth-2026-10-05/verify-shaking.cjs
node reports/bridgelab-visual-depth-2026-10-05/verify.cjs
```

## Preview

### From the riverbank

![Bridge, river and static atmosphere](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-visual-depth-2026-10-05/bridge-1000-landscape-bank.png)

### Compare energy during shaking

![Paired energy bars on one scale with exact tables](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-visual-depth-2026-10-05/starting-energy-1000-controlled.png)

Changes remain uncommitted.
