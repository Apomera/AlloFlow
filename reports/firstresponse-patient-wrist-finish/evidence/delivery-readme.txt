  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-wrist.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-wrist.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: patient wrist shading

The patient wrists have smoother shading where they meet the forearms and a more rounded transition into the sculpted palms. Surface normals follow the adjoining surfaces near each join and blend back into the existing wrist shading.

Only the two patient wrist normal buffers change. All vertex positions, silhouettes, geometry counts, materials, cameras, poses, supporting-hand contact, metadata and lesson state are preserved.

## Validation

- ${cpu.results.length} CPU geometry cases passed (${cpu.assertions.toLocaleString('en-US')} assertions). The validator checks the current wrist normals and exact preservation of positions and unrelated scene data. Deliberate defects were rejected, then saved source bytes were restored and reread.
- The two unchanged raw fixtures ran all 56 tests: **53 passed and 3 failed**. All 33 patient-wrist compatibility cases passed; the current hand-surface fixture had 20 passes and three palm-crease mirroring failures. The final candidate results were compared with the preserved, hash-verified baseline run of those three tests. Test names, assertions and numeric values match exactly. That baseline run deliberately skipped the other 20 hand tests; it was reused rather than executed again. No fixture assertion or tolerance was changed. The source-pin and changed-failure selftests rejected deliberate defects, then restored and reread saved bytes.
- Three native Supporting hand close-up comparisons passed: adult wide, child narrow, and infant narrow high contrast. Every accepted run used one worker and zero retries. Cameras, framing, contact, lesson state, draw counts and allocated resources match within each pair. A real child-view resize verifies the camera and resource behavior. Each wrist crop comes from its full-stage capture.
- Root and independent visual reviews accepted the same 12 image hashes.
- A separate adult recovery-pose-8 comparison passed the same scene, camera, contact, normal-buffer and resource checks. Root and independent visual reviews accepted its four image hashes, retained separately below. The diagnostic fixture changes only the adult pose from 5 to 8; the exact derivation and deliberate-rejection checks are saved with it.
- Nineteen exact history reversals passed. All 39 raw fixtures and 8 existing checkers are preserved. The Git index is guarded against the fresh delivery snapshot. The raw tests were **not run as a whole suite**.

| View | Changed stage pixels | Browser duration |
| --- | ---: | ---: |
${rows}

## Visual review

${visual.observations.map(line=>'- '+line).join('\n')}

## Before and after

${images}

### Adult recovery pose 8 — additional diagnostic

| Before | After |
| --- | --- |
| ![Recovery before](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-baseline-wrist.png) | ![Recovery after](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-candidate-wrist.png) |

[Full stage before](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-baseline-stage.png) · [Full stage after](evidence/recovery-fold-native-diagnostic/native-adult-recovery-fold/adult-wide-candidate-stage.png)

${recovery.observations.map(line=>'- '+line).join('\n')}

${recovery.limitations}

## Scope and limits

These checks load the raw module through the existing browser harness. The full application loader, full-app build and deployment were not tested. The change remains uncommitted; this delivery performs no staging, commit, push or deployment.

The raw test run remains red because of the three pre-existing palm-crease mirroring failures. Their measured distances are approximately 0.0000114755 against the unchanged 0.00001 tolerance. This shading change leaves those crease positions exact; it does not resolve that separate issue. The gate requires the actual baseline and candidate result files to agree on each failure:

| Test age | Baseline and candidate measured distance | Existing tolerance |
| --- | ---: | ---: |
${rawBaseline.comparisons.map(row=>'| '+row.test.split(' for ').pop()+' | '+row.actual+' | '+row.expected+' |').join('\n')}

Source: \`${beforeSHA}\` → \`${sourceSHA}\`.

## Retained attempts and diagnostics

The shared STEM host changed after the first accepted captures. All four comparisons were rerun against the updated host using unchanged fixtures. Their 16 PNG files exactly match the reviewed images. Previous captures, input manifests and repeat-run logs are preserved under candidate-rejected-host-refresh. The first repeat attempt also discovered an archived fixture; its two browser workflows passed, but the runner rejected the unexpected count. The archive was moved under the existing test exclusion before the successful repeats. These earlier runs are excluded from the final comparison counts.

${unsuccessfulNative.length?unsuccessfulNative.map(run=>'- ['+run.directory+'](evidence/'+run.directory+'/failure.json): '+run.error).join('\n'):'No unsuccessful native attempts were recorded.'}

The first candidate adjusted only the forearm join. Its adult comparison showed a small improvement, so it was set aside for a more useful palm-junction refinement. Its source, successful checks and adult images are retained under candidate-rejected-root-only. The accepted adult evidence is stored under native-adult-fold-final; the gate verifies that the superseded native views remain identical to their respective archived copies.

The next candidate improved the palm join in all three native views, but its complete CPU pass found that one already reversed triangle became worse in the adult recovery wrist fold. That candidate and its 253 evidence files are retained under candidate-rejected-recovery-fold. The final refinement preserves the existing shading normals at vertices adjoining a reversed fold face. A fifth deliberate defect removes that protection in recovery pose 8 and must fail. All final native and raw evidence was rerun for the corrected source.

The initial CPU check found inward-facing shading at an existing folded wrist crease in recovery pose 8. The same issue is present in the baseline. The final check prevents newly reversed shading, requires existing reversed faces to retain or improve their normal agreement, and preserves every unchanged face exactly. The failed check and diagnosis are retained under winding-diagnostics and winding-diagnosis.json.

An intermediate check of the rejected root-only candidate ran out of disk space while saving its deliberate-failure evidence. A later rerun completed, and both attempts remain with that candidate's diagnostics. The accepted wrist-and-palm CPU evidence is under geometry-contract-palm-fold. The disk-recovery manifest records older private duplicates removed only after their completed report copies were verified as identical.

The initial filtered baseline test comparison did not complete. A JIT-disabled retry failed before tests because Vite requires WebAssembly. Those unsuccessful attempts and their launch settings are retained under raw-memory-diagnostics. Only the preserved completed baseline run supplies the baseline failure evidence. Two final-candidate raw attempts were interrupted by app refreshes before a result was saved. Their prepared inputs, original runners and available launch/log evidence remain under raw-memory-diagnostics/fold-interrupted-no-result and raw-memory-diagnostics/fold-interrupted-streaming; neither supplies a test outcome. The completed final candidate run is under raw-wrist-fold-tests.

CPU and browser evidence, the source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?'Supporting audit files and directories: '+retained.join(', ')+'.':'No additional supporting audit files were found to archive.'}

[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.
`;
