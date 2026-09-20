# Be the Water: softer river crests

September 19, 2026

The small white crests marking steeper river reaches now have varied span, curvature, and thickness. More cross-channel subdivisions smooth their silhouettes. A second edge coordinate feathers the front and back of each ribbon, while an irregular break pattern softens the previous dashed-bar appearance.

Crest vertices now sample the rendered stream mesh at construction, with a small clearance above it. The existing slope and lake-boundary selection, shared animation clock, and winter suppression are retained. Geometry is generated once and remains a single draw with no added textures. These are illustrative riffles, not a fluid solver.

Validation:

- JavaScript syntax passed; canonical and desktop source copies match.
- `dev-tools/watercycle_pilot_stream_riffle_qa.cjs` passed. Independent rays verified crest vertices within 0.002 units of the intended 0.085-unit water clearance. Checks also covered varied ribbon widths, feathering, shared motion clock, flow direction, pause, reduced motion, actual runoff collection, seasonal visibility, groundwater cutaway, mobile accessibility, and resource cleanup. No captured page or WebGL errors.
- Visually reviewed the close river capture. Screenshots are in `scratch/water-stream-riffle-review/`.
- Experience and kernel regressions: 117 passed, zero failed (pilot-stream-riffle-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `2431294a6648b2cd52de2caa6bff2ebebd020c5989e7b3ed3fd230841e570323`.
