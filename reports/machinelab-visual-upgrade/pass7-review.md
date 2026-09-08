# Machine Lab: seventh visual pass

The shooting range now has a calibrated measuring lane and clearer feedback at the end of a flight.

- Round-number major marks and smaller subdivisions replace evenly spaced unlabelled ticks. The grid stays within the measuring lane and adapts to the throw distance.
- The launch platform has a supporting mast, projectile cradle, and corner bolts.
- Concentric landing rings and a crosswind bracket appear when the projectile arrives. The landing label matches total range in the result card; ruler marks measure straight downrange distance.
- Apex labels have stronger contrast. Narrow screens show fewer, larger ruler labels and a compact landing distance. Labels adapt when the canvas resizes; desktop labels also include drift.
- The neutral prediction screen keeps its lane dimensions independent of hidden shot results. Zero-distance shots retain their true endpoint.

**734/734 Machine Lab tests passed.** Nine new tests cover calibrated spacing across 8–1000 m lanes, bounded grid geometry, landing reveal and reset, neutral prediction state, reduced motion, and zero-distance landings.

Real Chromium/WebGL captures cover neutral, landed, positive and negative crosswind, short throws, and a flight frame in light, dark, and high-contrast themes. Each theme also includes 390px and 320px phone captures. All runs reported no page errors or horizontal overflow. Source syntax and whitespace checks passed; the desktop source is byte-identical to the main source.

![Short throw with calibrated ruler and landing rings](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-light/ruler-short-detail.png)

![Dark range with drift result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-dark/ruler-drift-detail.png)

![Phone range labels at 320px](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-light/mobile-320-detail.png)

[High contrast](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-contrast/mobile-320-detail.png) · [Neutral launch bay](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-light/ruler-neutral-detail.png) · [Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-summary.json) · [Previous pass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass6-review.md)
