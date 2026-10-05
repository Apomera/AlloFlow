# Cephalopod Hunter — pass 41

Hermit shells gain restrained spiral staining, fine growth lines, weathering and roughness variation. Their existing four pieces, colors, normals, bounds and interior material are retained. Crab eyes use scene-lit Standard materials with roughness 0.32 and retained vertex colors; pupils gain soft highlights and stalks gain consistent shading. No geometry, texture, per-frame uniform updates or seeded random draws were added.

Cycling a target while paused now calls the existing target and mission presentation functions immediately. This dismisses Observe, updates same-readiness details and clears an empty selection. The pending strike still owns its committed prey, including an explicitly empty strike; selection events do not advance gameplay.

## Validation

- **36 CPU checks passed** across geometry, cuticle, shell mapping/filtering, eyes, paused selection, fish surface finish, target presentation and strike feedback.
- **7 distinct native browser scenarios passed** for low/balanced crab/clam shader linkage, capture, clam drilling, disposal, target presentation, phone reduced motion, pause/inspection and the two new paused event/strike cases. Native eye and exterior shell programs bind real attributes and owned uniforms.
- The two paused cases additionally passed a **25 × 0.05-second** span in a separate retained run, crossing the HUD's whole-second sensitivity threshold. Exact CPU event-clock/cooldown/pending-strike checks complement this native loop coverage.
- **5 matched balanced-quality image pairs** preserve seed, actor pose, bounds, camera, camera target and lighting. The low-quality red-crab render is retained as standalone smoke evidence: its previous capture has a different initial heading and is excluded from exact A/B. Two ordinary desktop/phone squid views also completed without page errors or leaks.
- Syntax and scoped Git diff checks passed. All four runtime copies have SHA-256 `212a92ee1d0be28ef01f56a540486065d394d14e48e2bc63a3df8d5a2d05a6ba`. Reversing the four exact edits recovers accepted pass40 SHA-256 `73cc490a61ab9f2c0f85c8a0ab8478e242e7291a517148b5a3c3391b9ab09788`.

[Interactive comparisons](gallery.html) · [Verification receipt](final-verification.json)

## Retained corrections and limits

The first CPU run passed 30/31 checks: an older cuticle ownership assertion expected every non-body material to have no custom uniform. It was migrated to permit only the independently validated static shell-piece uniform on the three exterior pieces. The raw failure remains in `cpu-shell-eye.json`; the full current suite then passed 36/36. All five new paused CPU cases fail against the exact saved previous runtime and pass against current source. Those expected baseline failures remain in `baseline-paused-target.json`.

Independent shader review caught derivative filtering issues around atan wrapping and periodic high-frequency differences before current captures/tests. The accepted shader estimates angular footprint analytically; meaningful tests exercise the emitted formula at the wrap and across a full undersampled growth-line cycle. The two correction records are retained.

The original seven-scenario browser run used subsecond pause spans. Review identified that whole-second HUD equality could hide subsecond drift, so only the affected two cases were strengthened and re-run separately; the original result is retained. No source or test changed during any accepted test run.

Images are diagnostic material comparisons, not natural encounter or animation quality proof. Existing low-poly eye/shell outlines remain. No hardware frame-rate, audible-sound or whole-program budget claim is made. The guarded custom fine-detail fallback was source-tested; this does not establish full Three r128 Standard rendering without derivative support.

Changes remain uncommitted; no staging, commit, push or deployment was performed.

## Preview and gallery

[Try current simulator](http://127.0.0.1:64420/__harness?species=humboldtSquid&mode=observe&pass=41) · [Interactive gallery](http://127.0.0.1:64420/reports/cephalopod-hunter-enhancement/pass-forty-one/gallery.html)

The local preview serves the verified current runtime SHA. All eleven gallery images load; five comparison sliders respond, and the 390-pixel layout has no horizontal overflow. Desktop and phone gallery screenshots were visually checked.

## Capture audit clarification

The capture manifest describes the pause as preceding simulation ticks, but source review shows that queued Escape executes after one synchronous zero-delta loop. That loop can initialize wandering and assign a heading even with no elapsed time. The precise reason for the low-quality heading discrepancy remains unexplained by saved telemetry; the low pair is excluded rather than relaxing framing equality.

The capture index field also reuses the initial rock-crab index after type switches. It is not reliable red/hermit identity evidence. The five balanced comparisons were accepted by their matching actual type, position, rotation, scale, bounds, camera and camera target. The raw manifests remain intact. See [capture framing review](pass41-capture-framing-review.md).
