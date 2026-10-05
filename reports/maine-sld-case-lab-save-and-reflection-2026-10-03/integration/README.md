# Active managed runtime

The unchanged layout-final snapshot is active at the same [activity URL](http://127.0.0.1:65063/app/?tool=maine-sld-practice), running as PID **19372** in managed plain-pipe session **6860**. [Active runtime metadata](layout-final/source-preview/runtime.json) and [managed process signature](layout-final/runtime-restarts/restart-2026-10-04-01/managed-session.json) identify the owned launch.

[Restart HTTP evidence](layout-final/runtime-restarts/restart-2026-10-04-01/served-verification.json) confirms all three assets returned HTTP 200 with exact expected bytes: page `4ded475d…`, bundle `e2a7756f…`, and frozen module `8771e0b3…`. The immutable tested host remains `e3154edc…`. Verification used bounded 15-second curl requests with direct loopback routing and local response hashes. Two earlier Node fetch checks timed out; their cause remains unresolved and their records are preserved. No RAM serving change or rebuild was needed.

[Current file identities](layout-final/runtime-restarts/restart-2026-10-04-01/observed-identity.json) accompany this HTTP check; browser validation status belongs to the enclosing pass report. Previous runtime, start, stdout, stderr, HTTP records, and the prior integration README are archived under [restart evidence](layout-final/runtime-restarts/restart-2026-10-04-01/). The old stderr was empty. No source, module, loader pin, or index changes were made during this restart.

---

## Prior integration report before the runtime restart, preserved verbatim

# Active layout-final preview

The active immutable preview is [layout-final](layout-final/), available at the preserved [activity URL](http://127.0.0.1:65063/app/?tool=maine-sld-practice). This snapshot includes the bounded correction that keeps the active Q5 writer and focus outline visible after a late save failure at a short landscape viewport.

Only the exact Maine loader pin changed from `338944e4` to `8771e0b3` in the three latest shared hosts. [Pin evidence](layout-final/pin-verification.json) records archival of all immediate destinations before the first write, complete byte guards, atomic replacements, and verified preservation of every unrelated byte.

| Active artifact | SHA-256 |
| --- | --- |
| Exact tested host | `e3154edcba1aa5c418c8d658e051c304cad1a615eb1a769f27c06616bc42dbfb` |
| Host bundle | `e2a7756ffa68efabd9dc5e6c3906c824d905bdd3591271100241c01414a01882` |
| Frozen module, all four copies | `8771e0b351b088fe301060ffb8ce6be5ad6bb2df8504c8b5dc1ef2cf5927ca3a` |

[Preview metadata](layout-final/source-preview/preview.json) records one exact compilation, no source transformations, and no source drift. [Static verification](layout-final/static-verification.json) confirms three parsed host sources match the snapshot, all four modules match, and the preceding reviewed-final preview and its pin/static/HTTP/transition evidence remain unchanged.

The previous task-owned PID `43492` was present. Its exact helper, `338944e4` module hash, reviewed-final arguments, executable, and localhost `65063` listener were verified before stopping only that process. New PID `9384` runs a pure HTTP server; [runtime metadata](layout-final/source-preview/runtime.json) and [transition evidence](layout-final/preview-switch.json) record the same origin and URL. [HTTP verification](layout-final/served-verification.json) confirms status 200 and exact served page, bundle, and frozen module bytes.

The planning baseline, initial `69ea05c9` preview, and previous `338944e4` reviewed-final preview remain preserved. The prior integration README is archived verbatim at [preparation/prior-docs/integration-README.md](layout-final/preparation/prior-docs/integration-README.md); its complete text follows below. Browser validation and post-test identity observations belong to the enclosing pass report. No full application build, deployment, commit, or index mutation was performed.

---

## Earlier reviewed-final integration report, preserved verbatim

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
