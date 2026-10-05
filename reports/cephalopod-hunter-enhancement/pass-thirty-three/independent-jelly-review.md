# Pass 33 independent jelly surface review

Reviewed the actual vendored Three.js r128 render policy, the guarded two-side proposal, all twelve baseline/candidate native GL image pairs (three pulse phases times side, oblique, phone and underside), and the rejected static-reorder contracted-side probe. This review did not execute tests or browsers and made no repository changes.

Baseline source SHA256: 7c37f74fe6f091e7b0e24ec37af280ac3d578b522c3e0dd586e24b9310a6f963.
Candidate probe source SHA256: d8cf8e7ddec6e8b47db41441e775a3130d2e106c737556e5786c77ca9efdcbbc.

Baseline images are in pass-thirty-three/baseline-jelly-views (nine) and baseline-underside (three). Candidate images are in probe-twoside-jelly (twelve). The manifests identify naturally seeded actor 0, seed 2743, ordinary Escape pause, fixed .05-second production steps, unchanged phase advancement and camera-only detail views. All three reviewed manifests record no errors or leaks. This is a review of their stated provenance, not an independent execution of the capture harness.

The static index reorder fails: the large contracted-side crown steps move from the right half to the left half. Preserve it as failed-probe evidence.

The two-side candidate passes visual review. At contracted, midpoint and expanded phases, side-view crown steps disappear from both halves and the surface reads as a continuous translucent dome. The crown has not been hidden or made opaque; its original silhouette, rolled rim and visible interior are retained. Oblique views keep the four distinct pink horseshoes, canals, oral ribbons and marginal tentacles. All three underside views retain a complete inside crown and rim rather than culling them. Phone views retain the entire jelly and its pulse silhouette; improvements are subtler at that smaller scale. No new clipping or detached anatomy is visible in the twelve pairs.

The exact guard preserves vertices, original indices, pulse update and randomness. Both Standard materials keep opacity .34, roughness .30, depthWrite false and ordinary alpha. The existing bell mesh receives two full-index geometry groups: BackSide then FrontSide. In vendored r128, group insertion order is preserved by the transparent comparator because both records share groupOrder, renderOrder, depth and object id; material id is not compared. Native validation should still record actual group and face-state order.

Cost is one extra material per jelly (+5 overall) and one extra draw per visible bell. Meshes, geometry buffers and textures are unchanged. FrontSide/BackSide replace the old DoubleSide shader variant; actual program delta needs the native receipt. Runtime disposal already handles material arrays.

Limits: this fixes bell self-compositing in the sampled views; it does not establish general order-independent transparency between different jellies or other scene objects. Existing faceted oral ribbons remain visible, and phone detail is not touch-control or performance validation. No universal camera-angle or frame-rate claim is supported by these stills.

Fixture migration review: the guarded old-test changes retain all geometry, phase, pause, shelter and cleanup assertions while handling both owned materials. Exact geometry remains 1721 vertices, 2970 triangles and 79776 attribute/index bytes per jelly; material ownership rises eight to nine and the geometry-plus-material resource set rises sixteen to seventeen. Native watch records rise thirteen to fourteen because the bell contributes two group submissions. This is not a global shader-program count. Positive-determinant native actor transforms support the expected cull-back CW then CCW face states, with FLIP_SIDED defined only for BackSide. The native receipt still needs to establish that these assertions pass.

Final-source follow-up: the twelve current-jelly-views pixel hashes equal the reviewed d8cf candidate byte for byte. Root verifies exact protected fixtures against matched-baseline-jelly-views and records the proof in capture-comparison.json.

---

# Pass 33 final independent evidence audit

Accepted source: ad1970ff112df529cc9115e0fbd69061c80393af9570aba38fa05b1c9cb6b91c.

Read README, validation-summary, resource-integrity, capture-comparison, scene-comparison and visual-review. Inspected both final keyboard/touch guidance images. Independently checked all twelve final jelly image hashes against the final comparison and the previously reviewed dual-side probe; every file matches. All twelve fresh baseline file hashes match the comparison. Pose states, per-view fixtures and cameras match exactly, and the recorded bell draws are positive with no lost contexts. Current test, support and preserved raw report/receipt hashes match the curated summary.

Raw validation supports ten passed unit cases in three files. The initial native report retains five passed preservation cases and two failed new fixtures; the subsequent corrected guidance report contains two passes. Counting those seven unique accepted cases is accurate and does not present the initial report as wholly passing. Accepted-run receipts report identical before/after source, mirrors, tests and support. The copied group-order fault fails the shell-compositing gate while retaining the ray gate; restoring old generic advice fails the real visible signed-depth assertion. ANSI normalization qualifies that preserved literal failure without another browser execution.

Resource reporting is appropriately scoped: one added material and one added draw per visible bell, unchanged geometry/texture bytes, fourteen watched draw-kind records distinct from absolute twenty-six-program samples. No global program delta or FPS claim is made. The crown luminance-step metric is explicitly a small fixture-specific evidence sample.

Desktop and phone lost-target instructions are readable. The desktop readout still shows the preceding STRIKING state in its screenshot, and this limitation is disclosed. Phone captures do not claim complete initial-page action visibility without scrolling. Bell fixes retain the prior paired visual acceptance; oral-ribbon faceting and general inter-object transparency remain acknowledged limits.

No blocking concern or genuine evidence overclaim found. This audit made no repository edits and ran no tests or browsers; it used read-only source/evidence inspection and file-integrity checks.
