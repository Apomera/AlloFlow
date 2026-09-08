# Document Builder layout capture — 2026-09-08

Completed with exit code 0 using Playwright Chromium against http://127.0.0.1:8792. Seven screenshots saved; no page errors recorded. Every starting viewport used a new isolated context with empty storage and device scale factor 1. All geometry is measured in CSS pixels; the actual viewport matched the requested dimensions.

| Viewport/state | Iframe width | Iframe height | Iframe top (viewport y) | Dialog scroll top |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 standard | 1048 | 526.5 | 255 | 0 |
| 1024×768 standard | 652.8 | 286.1 | 329 | 0 |
| 768×1024 standard | 697.6 | 187.4 | 2335.8 | 0 |
| 390×844 standard, top | 326 | 2 | 2730.6 | 0 |
| 390×844 standard, bottom | 326 | 2 | 653.6 | 2077 |
| 390×844 Focus mode | 358 | 216.5 | 460 | 0 |
| 390×844 Focus + collapsed ribbon | 358 | 370.5 | 306 | 0 |

The standard phone layout leaves the editable iframe with only its 2 px border. Scrolling to the bottom does not recover editing space. This is more severe than extra setup scrolling: the editable surface is effectively collapsed. At 768 px, the surface starts below more than two viewport heights of settings. Focus mode and ribbon collapse provide a usable phone editing region, but are discovery-dependent workarounds rather than the standard entry state.

Visually inspected the 1440×900 standard screenshot, the 390×844 scrolled-bottom screenshot and the Focus + collapsed ribbon screenshot. The phone bottom capture shows controls and status with no usable document body; Focus + collapsed ribbon shows document content. Clicking Collapse ribbon scrolls the horizontal tab strip toward that button, so the resulting screenshot shows the later tabs.

Reproduce: node reports/document-builder-analysis-2026-09-08/layout/capture-layout.cjs while the fixture server is running. geometry.json stores viewport, iframe, document/dialog dimensions, scroll sizes, computed flex/overflow styles for iframe ancestors, browser version, errors and source hashes. The script blocks requests beyond this loopback fixture and data URLs.

Limitations: this is the real compiled ExportPreviewView and repository CSS rendered in the parent's controlled synthetic host, using a short Grade 7 ecosystems reading/table/quiz fixture. Host callbacks are stubbed, and the starting mode is History/print/author. It does not validate real project persistence, providers, exports, imports, the surrounding app shell or the fidelity of an actual remediated PDF. Production code and provider state were not modified.

Artifacts: 1440x900-standard-top.png; 1024x768-standard-top.png; 768x1024-standard-top.png; 390x844-standard-top.png; 390x844-standard-bottom.png; 390x844-focus.png; 390x844-focus-collapsed.png.
