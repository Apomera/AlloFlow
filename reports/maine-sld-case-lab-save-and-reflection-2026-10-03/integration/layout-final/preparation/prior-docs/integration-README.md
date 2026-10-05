# Maine SLD save-and-reflection integration

The final reviewed preview uses the preserved local [activity URL](http://127.0.0.1:65063/app/?tool=maine-sld-practice). Its active artifacts and evidence are under [reviewed-final](reviewed-final/).

Integration changed only the exact Maine loader version pin in `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, and `desktop/web-app/src/App.jsx`. Each transaction archived all three immediate current destinations before the first write, guarded the complete destination bytes, replaced atomically, and reread the results to confirm every unrelated byte remained intact.

The [initial pin record](pin-verification.json) captures `606ce307` → `69ea05c9`. A reviewer-requested warning group semantic correction then produced the final freeze; the [final pin record](reviewed-final/pin-verification.json) captures `69ea05c9` → `338944e4`. The initial exact preview was preserved unchanged and never served; [intermediate-build-preserved.json](intermediate-build-preserved.json) records its hashes. Preparation archives preserve the earlier planning preview, current host snapshots, and a read-only inventory of preexisting dirty paths.

One exact App.jsx snapshot was compiled for the final reviewed freeze with no source transformations. Its immutable identities are:

| Artifact | SHA-256 |
| --- | --- |
| Tested host | `b017b9ca7df4d830ed3933fa4efaaf0508d29415601f72156b93f4a415d2b4b2` |
| Host bundle | `e5b12aeb6ec8fbeae08972bd5735d1036a7e647bc0ac4daf0470b289849fcff0` |
| Frozen module, all four copies | `338944e463ff7f0cd48a4c5e83188ba8f2537af467adbd0a8c38d3ce0afec863` |

[Static verification](reviewed-final/static-verification.json) confirms three parsed host sources match the exact tested snapshot, all four module copies match, each host contains the sole final Maine pin, and the accepted planning preview remains preserved. [Preview metadata](reviewed-final/source-preview/preview.json) records an empty transformation list and no source drift during compilation. The completed snapshot was verified without rebuilding.

Old task-owned PID `64444` was already absent and port `65063` was free, so no process was stopped. New PID `43492` runs the pure HTTP server at the same origin. The authoritative process record is [source-preview/runtime.json](reviewed-final/source-preview/runtime.json); [transition evidence](reviewed-final/preview-switch.json) records the preserved URL and exact identities.

[HTTP verification](reviewed-final/served-verification.json) records status 200 and matching exact byte hashes for the activity page, host bundle, and final module. The server supplies the immutable frozen module snapshot and checks its SHA-256 on module requests. Browser validation and subsequent host observations belong to the enclosing pass report.

No full application build, deployment, commit, index mutation, or unrelated product change was performed by this integration pass. All earlier report and intermediate evidence files were preserved.
