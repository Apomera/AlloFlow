  const images=views.map(id=>`### ${id}\n\n| Before | After |\n| --- | --- |\n| ![Before ${id}](evidence/${nativeDirectory(id)}/${id}-baseline-wrist.png) | ![After ${id}](evidence/${nativeDirectory(id)}/${id}-candidate-wrist.png) |\n\n[Full stage before](evidence/${nativeDirectory(id)}/${id}-baseline-stage.png) · [Full stage after](evidence/${nativeDirectory(id)}/${id}-candidate-stage.png)`).join('\n\n');
  const readme=`# First Response Lab: patient wrist shading

The patient wrist surfaces transition more smoothly into the forearms. Surface normals in the wrist root region follow the adjoining forearm shading, then blend back into the existing wrist surface.

Only the two patient wrist normal buffers change. All vertex positions, silhouettes, geometry counts, materials, cameras, poses, supporting-hand contact, metadata and lesson state are preserved.

## Validation

- ${cpu.results.length} CPU geometry cases passed (${cpu.assertions.toLocaleString('en-US')} assertions). The validator checks the current wrist normals and exact preservation of positions and unrelated scene data. Deliberate defects were rejected, then saved source bytes were restored and reread.
- ${raw.numPassedTests} unchanged raw tests passed: 33 patient-wrist compatibility cases and 23 current hand-surface tests. The runner also rejected a deliberate source-pin mismatch and restored and reread the saved bytes.
- Three native Supporting hand close-up comparisons passed: adult wide, child narrow, and infant narrow high contrast. Every accepted run used one worker and zero retries. Cameras, framing, contact, lesson state, draw counts and allocated resources match within each pair. A real child-view resize verifies the camera and resource behavior. Each wrist crop comes from its full-stage capture.
- Root and independent visual reviews accepted the same 12 image hashes.
- Nineteen exact history reversals passed. All 39 raw fixtures and 8 existing checkers are preserved. The Git index is guarded against the fresh delivery snapshot. The raw tests were **not run as a whole suite**.

| View | Changed stage pixels | Browser duration |
| --- | ---: | ---: |
${rows}

## Visual review

${visual.observations.map(line=>'- '+line).join('\n')}

## Before and after

${images}

## Scope and limits

These checks load the raw module through the existing browser harness. The full application loader, full-app build and deployment were not tested. The change remains uncommitted; this delivery performs no staging, commit, push or deployment.

Source: \`${beforeSHA}\` → \`${sourceSHA}\`.

## Retained attempts and diagnostics

${unsuccessfulNative.length?unsuccessfulNative.map(run=>'- ['+run.directory+'](evidence/'+run.directory+'/failure.json): '+run.error).join('\n'):'No unsuccessful native attempts were recorded.'}

The initial CPU check found an inward-facing normal at an existing folded wrist crease in recovery pose 8. The same triangle and normal agreement are present in the baseline. The final check requires all changed root faces to face outward and preserves every unchanged face exactly. The failed check and diagnosis are retained under winding-diagnostics and winding-diagnosis.json.

An intermediate CPU attempt ran out of disk space while writing its deliberate-failure evidence and did not produce a completed report. The accepted final run completed all 30 cases and both deliberate-failure checks; its original report is retained under geometry-contract-final and matches the canonical report byte for byte. The saved partial write is retained in winding-diagnostics. The disk-recovery manifest records older private duplicates removed only after their completed report copies were verified as identical.

CPU and browser evidence, the source delta, compatibility checks and visual reviews are saved under [evidence](evidence). ${retained.length?'Supporting audit files and directories: '+retained.join(', ')+'.':'No additional supporting audit files were found to archive.'}

[Post-write verification](post-write.json) records the installed bytes, syntax, history reversals and preserved inputs.
`;
