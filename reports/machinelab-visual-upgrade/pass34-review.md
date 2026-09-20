# Machine Lab pass 34: focused camera framing

Focus mechanism now centers the machine's projected full-stroke envelope. The view remains steady when selecting Start, Halfway, and Full stroke, while leaving focus restores the workshop framing. A more compact desktop stage reduces unused vertical space.

The scene caches occupied regions from 17 motion samples, including margins for intermediate positions, with at most 216 points for camera fitting. Perspective-aware centering accounts for foreground parts; the frame follows orbit direction without following animated parts.

Validation: 564 passing tests (309 geometry and 255 UI), including 10 new full-stroke envelope cases. Browser checks passed for all six benches at 1150, 390, and 320 pixels in light, dark, and high-contrast themes, plus four orbit angles: 282 checks, 24 screenshots, no recorded browser errors or horizontal overflow. Verified source/desktop parity, JavaScript syntax, and scoped diff formatting.

Visually reviewed the final light lever desktop, dark screw desktop, and high-contrast wheel-and-axle phone screenshots. Full-stroke fitting is verified at default zoom; users can still zoom in intentionally.

- [Light desktop](pass34-light-centered/focused-lever-1150.png)
- [Dark desktop](pass34-dark-centered/focused-screw-1150.png)
- [High-contrast phone](pass34-contrast-centered/focused-windlass-320.png)
- [Validation summary](pass34-summary.json)

Changes remain local. No commit, push, or deployment was performed.
