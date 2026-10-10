# Bridge Lab: explain the starting energy

The damping investigation now connects energy received during shaking with the energy remaining afterward. Students can inspect the decay beside the fraction cards and explain why identical shaking can give A and B different starting energies.

## What changed

- **Where did the starting energy come from?** is an optional, initially closed disclosure available from 16 s onward. Native tables show each trial’s initial energy, signed net ground work over 0–16 s, damping loss, stored energy at 16 s, and numerical balance residual.
- The explanation connects input power per kg to ground acceleration and relative velocity. It attributes differences to damping only when response mode and nonzero ground motion match. A higher damping setting does not necessarily produce more total damping loss in J/kg.
- **Compare the fraction remaining** now contains a native time slider and precise numeric entry from 16–24 s. Both pause playback on focus. Valid entries update the shared live inspection; partial drafts retain focus, and Enter or blur resolves bounds or blank input.
- Recorded evidence keeps its original inputs and time. Reports reconstruct those inputs and show static evidence without interactive controls. Cached answer fields are ignored.
- Desktop cards use paired columns; phone cards stack. Tiny nonzero values and signed residuals remain visible. The balance explanation distinguishes unrounded calculations from rounded readings.

## Checked

| Check | Result |
| --- | --- |
| Complete unit suite | 272 passed across three files, including 11 new checks |
| Chromium workflows | 21 passed in one fresh run, no retries |
| Numerical sweep | 144 configurations; 36 controlled pairs and 48 amplitude comparisons |
| Canonical and desktop source | Identical; syntax valid |
| English labels | All 1,340 literal Bridge Lab fallbacks match both registries |
| New feature captures | 10 desktop/phone, recorded/print, and graphics-fallback images |

The source and test hashes stayed unchanged during both completed test runs and match the final files. English registries were checked independently because the test harnesses use literal fallbacks. Earlier startup and interrupted-run records are retained separately; the final counts come from the complete runs.

The browser checks cover native keyboard and pointer inspection, exact fractional times, reduced motion, graphics loss, independent notebook/scene selection, fixed recorded evidence, and fresh disabled-model report reconstruction. Visual review checked both screen widths and phone print layout.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-starting-energy-2026-10-05/source-verification.json)

To recheck the stored results against the current source and labels:

```powershell
node reports/bridgelab-starting-energy-2026-10-05/verify-shaking.cjs
node reports/bridgelab-starting-energy-2026-10-05/verify.cjs
```

## Preview

### Energy received and stored

![Paired energy tables and explanation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-starting-energy-2026-10-05/starting-energy-1000-controlled.png)

### Local time inspection on a phone

![Phone time controls and remaining-energy fractions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-starting-energy-2026-10-05/decay-time-320-controls.png)

Changes remain uncommitted.
