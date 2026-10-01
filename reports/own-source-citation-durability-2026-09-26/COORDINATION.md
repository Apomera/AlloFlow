# Citation durability follow-up

The user asked to keep enhancing document research after the reliability pass. Current repository handoff records the prior integration/release as complete; this new work remains local, with no release authorization.

Planned owned scope: the evidence runtime in `own_sources_module.js`, its exact public mirror, focused citation tests/browser fixtures and this report. Add bounded cache retention and quota recovery, validate stored snapshots and improve reliable reopening. Investigate recovery from saved passage data before choosing any additional integration surface. Preserve imported-document stores and every other storage namespace.

Shared source/host/reader changes, if needed, must be narrow and explicitly recorded here. No broad build, unrelated mirror rewrite, commit, push or deployment. The initial tracked changes are unrelated SEL report images; preserve those and all untracked artifacts.

Chosen scope: bounded citation cache, quota recovery, immutable snapshot IDs, and a wrapping/keyboard-scrollable citation dialog with focus restoration. Full automatic restoration from exported appendices is deferred because it needs separate source/comparison reader bindings; no unused recovery API or broad provenance rewrite is added.

After validation, synchronize the helper's three existing mirrors (`desktop/web-app/public`, `desktop/app-build`, `desktop/web-app/build`), all of which matched the prior helper SHA256 `45a610136690bed52c6b06e2be7d98180e2bf4a5de2143341050d42fef17a05a` before editing. Update only the OwnSources loader pin in `AlloFlowANTI.txt` and its two matching source copies (`desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx`). This single-module cache bust is the only planned host edit. No shared reader or engine change is needed.

Completed locally: all four helper copies match `1c5dc26a858ecf69f0e44dc28e0198d770816a27d44c9fa6ddcecc21b06db96a`, with OwnSources pin `1c5dc26a` in all three hosts. Integrated tests passed 168/168 across ten files; final Chromium verification passed five grouped scenarios with zero page errors. A concurrent owner changed the ViewSimplifiedModule pin in those hosts; that change and all other unrelated work were preserved. See `README.md` for the completed scope and limitations. No commit, push or deployment occurred in this follow-up.
