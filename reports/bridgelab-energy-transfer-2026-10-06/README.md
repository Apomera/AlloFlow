# Bridge Lab: trace where energy goes

The optional **Energy transfer** view now groups energy crossing the stored-energy boundary separately from kinetic–elastic exchange. Native labels and numerical readings stay readable at phone width.

## What changed

- **External exchange** shows ground interaction and damping loss together. Ground interaction can add or remove stored energy; its arrow reverses when input power is negative.
- **Internal exchange** shows kinetic energy becoming elastic energy, or the reverse. Its explanation makes clear that this exchange occurs within stored mechanical energy.
- The stored-energy balance remains input power minus damping loss. The internal exchange is excluded from that total.
- Arrows keep a fixed size and show direction. Native text gives the instantaneous rate in W/kg, so arrow length does not imply a magnitude comparison.
- Small nonzero rates now use scientific notation instead of a “<0.001” threshold. Exact zero says “No transfer” and has no directional arrow. A short explanation appears when scientific notation is needed.
- The view follows the selected A/B trial and inspected time. The current experiment remains readable in 2D graphics fallback.
- Accessible group descriptions include directed routes and numerical rates. Decorative arrows contain no text and are hidden from assistive technology.

## Checked

| Check | Result |
| --- | --- |
| Complete unit suite | 285 passed across 3 files |
| New behavior coverage | Two new native-flow cases and three extended browser workflows |
| Chromium workflows | 32 passed in one fresh run, no retries |
| Numerical sweep | 144 configurations |
| Source mirrors | Identical; syntax valid; CRLF retained |
| English labels | All 1,353 literal Bridge Lab fallbacks match both registries |
| Fresh feature captures | 30 verified images |

The new checks cover signed input, exact zero, undamped internal exchange, tiny rates, unequal saved A/B trials, camera changes, reduced motion, fullscreen, phone scrolling, and graphics loss and recovery. Numerical checks use the recorded/interpolated power fields, preserving agreement with the rate history at intermediate times.

The browser run also checks the existing immersive scenery, motion-position diagram, and guided energy workflows. Source and test hashes stayed unchanged during each completed regression run and match the final files. English registries were checked separately because the test harnesses use literal fallbacks.

The initial unit run and focused browser preview remain in this folder for traceability. The final counts above come from the completed fresh runs.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-transfer-2026-10-06/source-verification.json)

To verify the stored results against the current source and labels:

~~~powershell
node reports/bridgelab-energy-transfer-2026-10-06/verify.cjs
~~~

## Preview

The scene keeps its existing scrollable readout. These captures show the complete optional diagram; ordinary-height phone checks verify that every reading is reachable by scrolling.

### External and internal exchange

![Native energy routes and rates in the scene readout](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-transfer-2026-10-06/energy-transfer-1000-native.png)

### Small rates at phone width

![Scientific rates and fixed-size arrows on a phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-transfer-2026-10-06/energy-transfer-320-tiny.png)

### Current experiment in 2D

![The current energy transfer diagram remains available in 2D](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-transfer-2026-10-06/energy-transfer-320-fallback.png)

Changes remain uncommitted.
