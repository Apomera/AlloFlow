# Maine SLD planning-review integration

The reviewed module is available at the preserved local URL: [open the activity](http://127.0.0.1:65063/app/?tool=maine-sld-practice).

Only the existing Maine loader version pin changed from `d69ff090` to `606ce307` in `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, and `desktop/web-app/src/App.jsx`. All three immediate destination files were archived under [pin-before](pin-before/) and verified before the first write. Each replacement used an exact current-byte guard and atomic rename; rereads confirmed that every unrelated byte was preserved. See [pin-verification.json](pin-verification.json).

One exact App.jsx snapshot was compiled with esbuild and no source transformations. The preview serves the captured module bytes, with a SHA-256 guard on module requests. Its reviewed identities are:

| Artifact | SHA-256 |
| --- | --- |
| Exact tested host | `7aa905b2c32795470cd16176df97926450807c86c95f1e237d7945a89b2889c9` |
| Preview bundle | `13a146aa57b210dfa3229b45a5243134152ac7085c50235dd3fff096a2341a57` |
| Frozen module, all four copies | `606ce30776177cc8faeb8d520f09ac15151b584eb8b09be9c25829f3883e5779` |

[Static verification](static-verification.json) confirms three host sources parse and match, four module copies match, and the prior accepted preview assets remain preserved. [Preview metadata](source-preview/preview.json) records the exact snapshot and empty transformation list.

Old task-owned PID `12900` was already absent and port `65063` was free; no process was stopped. New PID `64444` runs a pure HTTP server at the same origin. [Runtime metadata](source-preview/runtime.json) is the process record; [transition evidence](preview-switch.json) records the launch and preserved URL.

[HTTP verification](served-verification.json) records status 200 and exact byte hashes for the activity page, bundle, and frozen module. Browser validation passed five module checks and one full-host check. The [post-test observation](final-observed-identity.json), taken at `2026-10-03T18:08:20.728Z`, confirms all three current hosts still matched the tested snapshot and contained the sole reviewed Maine pin; four module copies remained unchanged. The bounded snapshot was retained without rebuilding.

No full application build, deployment, or commit was performed by this integration pass. Existing evidence and earlier report assets were preserved.
