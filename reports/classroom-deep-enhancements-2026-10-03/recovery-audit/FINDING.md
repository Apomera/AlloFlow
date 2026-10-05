The complete Canvas clear helper leaves the previous learner response map in the fresh workspace.

`startFreshCanvasWorkspace` changes the current workspace ID and invokes `clearCanvasWorkspaceState`. That helper clears resources, text, profiles and practice state, and invalidates local hydration, but does not replace `studentResponses`. `buildCanvasWorkspaceSnapshot` later serializes that same map under `workspace.projectState.responses`. A new lesson draft can therefore carry private writing from the previous workspace into its new saved snapshot.

The narrow proposed correction is to call `setStudentResponses({})` inside the complete Canvas clear helper, after hydration invalidation. History-only clear is a different action and is outside this proposed change. Prior saved recovery snapshots must remain available and unchanged.

`workspace-response-isolation.node.cjs` contains three source-extracted regression proposals. It evaluates the current embedded recovery module and actual clear/fresh/snapshot functions with controlled synchronous React setters. It checks unchanged prior snapshots, fresh response ownership, and absence of old responses in the new snapshot. Root owns serial baseline/current execution. This audit did not modify production files or run browser/Vitest workers.

Adjacent restore-hydration ownership deserves a future controlled-read test: `restoreCanvasWorkspaceSnapshot` currently does not invalidate local data hydration before replacing responses. That observation was reported to root but is not treated as a reproduced defect or included in this correction.
