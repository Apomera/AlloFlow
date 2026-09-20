# Geometry World grant building demonstration

These screenshots show the actual current local Geometry World interface using a fictional, authored equal-layers lesson. They are demonstrations, not student records, evidence of classroom outcomes, production deployment verification, or district approval.

- `01-one-layer.png`: One layer: a 4 × 3 array contains 12 unit cubes.
- `02-two-layers.png`: Stack an equal layer: 12 + 12 = 24 cubic units, or 4 × 3 × 2 = 24.
- `03-concept-reasoning.png`: The learner saves a concept snapshot and explains the calculation. The panel provides controls to open a worksheet or learning record; a worksheet is not pictured.

The cyan and gold layers are created through the real Geometry World batch-building command. The local app's measurement API verifies 4 × 3 × 1 = 12 and 4 × 3 × 2 = 24 occupied cubic units. The actual Menu → Concept snapshots workflow captures the rendered camera view and accepts the caption and reasoning.

Capture harness: `dev-tools/geometry_world_grant_build_capture.cjs`. It serves current repository source with software WebGL in headless Chrome and blocks external services. It does not call AI providers or contact a school deployment. Browser-side page errors and cube measurements are recorded in `capture-results.json`.

JPEG preview files are separate browser screenshots of the same views for visual QA. Final packet figures use the PNG files.
