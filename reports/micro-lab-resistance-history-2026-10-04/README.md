# Micro Lab: Resistance saved history charts

This pass improves saved Resistance history charts with responsive axes, fixed-size selection markers and exact round readouts. The work preserves saved snapshots, raw imported evidence and live playback. Runtime and test implementation are still being validated; this scaffold makes no passing-result claim.

The frozen runtime is mirrored and syntax checked at SHA-256 `6df770c9aa27f23b74c318d500d95fb526fd9db4b6803699e05fc689231d3de6`. Validation receipts will identify this source hash before final passing results are reported.

## Validation scope

The Micro Lab unit suite has 1,060 checks across 28 files, with no additional unit cases in this pass. The targeted Chromium scope has 51 scenarios across nine specs, including saved Resistance histories (8), Resistance live visuals (5) and the preceding Growth/annotation/navigation regression scope (38). The saved-history spec adds two browser cases. Focused browser validation runs both owned Resistance specs, totaling 13 scenarios. The runners capture 37 test files and ten support inputs, totaling 47 distinct inputs. Validation runs one worker at a time and uses fresh phase names, retaining earlier raw results and diagnostics. Final passing results remain pending.

Both runtime files must match the frozen candidate before and after each run. The audit checks exact file and case counts, zero failures, skips, flaky scenarios or browser retries, raw runner receipts and all captured input hashes. The eight required screenshot names are fixed in validation-inputs.cjs and candidate.json. They cover desktop divergence, extinction, 320px layout, 400% enlargement, a long history on desktop and phone, and forced dark/light colors. The manual visual receipt binds the exact PNG hashes to the candidate and final browser phase.

The interface audit expects all 1,936 source-used labels and all 2,055 Micro Lab registry labels to remain unchanged. No labels are added in this pass. Canonical and desktop Micro Lab namespaces must agree. Committed registry blobs exactly preserve the immutable parent text.

## Focused local save

The focused tree continues verified Micro Lab commit c79fce442cdece823cdc1df22165b9265fd0b909 from codex/micro-sweep-visuals-2026-10-04. It owns the canonical/desktop runtime pair, tests/microbiology_resistance_visuals.test.js, the saved/live Resistance browser specs and this report. The intended new local branch is codex/micro-resistance-history-2026-10-04.

Private Git indexes preserve the shared checkout and staging. Runtime, tests and reports use exact byte seals. Registry guards seal the full Micro Lab namespace against the immutable parent, allowing unrelated namespace edits and key ordering while Micro Lab labels stay fixed. Publication records an intent receipt before updating the new local branch; any existing receipt must be inspected before a retry. Verification checks the prepared or committed tree, inherited validated inputs, registry scope, source labels, hooks and shared-index preservation.

Final passing results, visual observations and commit verification remain pending.
