# AlloFlow performance improvements — 2026-09-04

Implemented locally in the shared checkout. No deployment, commit, or shared-index staging. Existing edits from other agents were preserved with anchored patches.

## Runtime changes

- Module-readiness snapshots are compared before updating root state. Synchronous events are coalesced. Polling stops when loading settles and restarts for new work. Cleanup cancels retry/hide timers and ignores callbacks after unmount.
- The two command surfaces share one context per root render. The closed palette skips building/filtering its command catalog. Existing keyboard, focus, and command tests pass.
- Report Writer and Math Fluency load when their workflow opens. Live Polling loads when a live session is joined, including student joins, preserving incoming-poll listeners. These three files total 1,206,222 uncompressed bytes removed from background loading for a normal session-free workspace.
- The registry owns deduplication and retries; no permanent started flag traps a failed load. Report Writer, the teacher's Live Polling panel, and Math Fluency have retry controls.
- Student Analytics remains on the background path because assessment helpers are used outside its panel. Games remains unchanged pending a consumer-by-consumer split.

## Directions composer extraction

The 24,796-byte JSX view moved into view_directions_composer_source.jsx. Its new builder produces the root/public module pair and is registered in build.js's MODULES and COMPILE_PAIRS.

A small wrapper supplies 25 explicit dependency props. Draft state, generation, goal capabilities, and saving remain in the host. The existing recoverable lazy-view bridge supplies loading/failure messages, retry, and Close. Tailwind already scans the public module mirror.

## Compact artifacts

Generate with:

    npm run build:performance

Output: scratch/performance-release/

- AlloFlowANTI.compact.txt: 1,674,783 bytes versus 3,336,289 bytes in the captured readable source, about 50% smaller. Preserves the first-line Canvas directive, import declarations, JSX, function names, and license notices. The canonical source remains readable.
- cdn/: minified overlay of 239 distinct statically referenced own-CDN modules, including lazy modules. 47,380,697 bytes becomes 32,160,670 bytes uncompressed. Gzip comparison: 10,889,094 to 8,674,607 bytes. Actual HTTP transfer depends on server compression; the inspected CDN already served Brotli.
- manifest.json: exact source/output hashes and sizes for the captured snapshot. Authoritative when the shared tree changes.
- Directions desktop/mobile screenshots from isolated Chromium.

Check freshness with:

    npm run verify:performance-artifacts

The CDN directory is a **partial overlay, not a complete site**. Merge only its manifest-listed assets into a separately prepared deployment after normal module/companion-asset generation, and review version pins against deployed bytes. Do not replace an entire deployment with this directory. Deployment scripts and cache headers were not changed. Minified CDN delivery remains opt-in.

Publish the newly extracted Directions module before distributing the updated Canvas source. The compact file retains canonical asset URLs. Regenerate artifacts from the intended release state; other agents continue editing the tree.

## Validation

- 192 focused checks passed across runs: readiness/retry lifecycle, compact output, Directions React interactions/goal capabilities, command behavior/focus/accessibility, live polling/reconnect, Word Sounds loading, and all three root bootstrap boundaries.
- One root parse case exceeded its default timeout on the busy machine; all three passed on rerun with a larger timeout. Compact-builder tests run in Node subprocesses because jsdom's typed-array realm is incompatible with esbuild.
- Module registry: all 209 consumers have valid producers; no missing or suspect-null producers.
- Canonical source and generated App.jsx parse successfully. Touched-file whitespace checks passed. Command, sidebar, and Directions root/public mirrors match.
- Isolated Chromium: draft edit and Add to pack passed, no page errors; at 390px viewport width the dialog fits at x=16, width=358px. The shared Chrome profile was not used.
- Separate existing mismatch: document_suite_lazy_loading_contract.test.js assumes CDN URLs in every shell, but the generated desktop source copies contain local development URLs. Performance patches do not change those document-suite URLs; their build mode was left intact.

No full-app Core Web Vitals timing claim is made. Savings are measured artifact bytes; runtime improvements are backed by lifecycle and UI checks.
Final artifact verification: the compact file and all 239 CDN outputs match their manifest hashes; the Canvas mode directive and 11 import declarations are present. Other agents changed the canonical source during generation, so this output is a verified snapshot rather than the final release state. Regenerate from the chosen release state before publishing.