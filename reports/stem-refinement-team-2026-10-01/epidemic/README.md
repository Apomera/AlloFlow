# Epidemic Inquiry recovery candidate

The original Inquiry handler silently discarded the oldest observation when a ninth was logged, and Reset immediately discarded both observations and explanation drafts. The saved baseline is `../source-before/stem_tool_epidemic.js`.

The canonical candidate keeps the eight-observation limit and all existing model equations. At capacity it keeps every saved observation and the current slider settings, with a visible polite status. Imported histories above eight remain intact. Removing an observation retains its exact values and position; its place stays reserved until Undo or explicit Discard. A second removal is disabled while recovery is pending.

Reset retains the complete previous Inquiry state, including both drafts, pending observation recovery and additional stored fields. Repeated Reset cannot overwrite the backup. Restore exchanges the two investigations, keeping work entered after Reset recoverable. An explicit Discard previous investigation and its drafts action preserves current work and enables Reset again. Recovery is stored in the tool state and survives remount. Focus moves to Undo after removal, Log after observation undo/discard, Restore after reset/restore, and Reset after discarding the previous investigation.

`tests/epidemic_inquiry_recovery.test.js` mounts the actual tool with React and drives its handlers. `EPIDEMIC_INQUIRY_SOURCE` can select the saved baseline without editing production files. `tests/e2e/epidemic-inquiry-recovery.spec.ts` drives keyboard recovery on desktop and 320px viewports through the existing isolated loopback harness. Browser baseline substitution uses `STEM_GL_SUBSTITUTE`.

Validation is pending the coordinator's single-runner token. No tests, browser, build, staging or commit were performed by this worker. The coordinator owns runtime mirrors. The fixed model assumptions, scientific labels, tool breadth and shared translation registry are outside this change.
