# Reviewed simulator render snapshots

The owners changed Bridge Lab's digest, making the unchanged science-simulator golden suite a necessary additional release check. The first attempted command used --update=false; this installed Vitest treated its presence as an update request. That run's apparent 36 passes are invalid verification evidence. Its output was preserved and the exact staged preimage restored (SHA-256 483383e32f0ab6009db050fc1adfd3d1369da160609286f07427336381f4cc38).

The corrected CI=true run with no update flag passed 31 tests and failed five stale snapshots, without modifying any of 153 monitored inputs. Review established the following intended differences:

| Tool | Intended difference | Supporting acceptance |
| --- | --- | --- |
| Anatomy | Consolidated body-system, learning-level and search navigation replaces duplicate rails/buttons; 91 to 86 buttons, 5 to 4 selects. | Both assembled compact-controls/search suites passed all 40 cases. |
| Astronomy | Tonight layout adds direct Observatory/Sky Map actions, a section selector and overhead SVG preview; 20 to 22 buttons. | Twelve assembled Astronomy suites passed 370 cases, including 80 UI resilience and 34 observing-workflow cases. |
| Microbiology | Mystery specimens gains a primary tab and Home route card (stem_lab/stem_tool_microbiology.js:1907,1923,1962); 14 to 16 buttons. | Nine selected Microbiology suites passed 120 cases, including nine Mystery-workflow cases. |
| Moon Mission | Previously committed header contrast/background/padding changes at stem_lab/stem_tool_moonmission.js:4121–4139 change length/hash while all control counts stay fixed. | Existing owner handoffs document the three completed enhancement passes; this is a stale digest of already committed styling, not an imported runtime change. |
| Physics | Guided investigation and model-comparison controls add four buttons and one select. | Assembled investigation UI (16) and evidence (26) cases passed, alongside the other selected Physics suites. |

Root approved exactly these five entries; the owner's Bridge Lab entry remains unchanged. A subagent's combined mutation/run request was rejected by automatic review based on the original planning restriction and did not execute. Root verified the restored preimage, used the user's later explicit commit/merge/deploy authorization to apply a transparent minimal five-entry patch, and ran validation separately.

The final command used CI=true and no update flag: `node node_modules/vitest/vitest.mjs run tests/stem_sim_tools_golden.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/releases/collective-2026-09-27/aggregate-unit/sim-golden-final.json`. All 36 tests passed, exit 0; the snapshot's SHA-256 was unchanged across the run. No production source or quarantine file was changed for this check. Existing SSR/act warnings remain visible in sim-golden-final.log.
