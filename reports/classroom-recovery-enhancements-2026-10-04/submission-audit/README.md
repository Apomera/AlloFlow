This audit's recipient-switch hypothesis was rejected before production integration.

`recipient-ownership.cjs` evaluates the actual source and generated factories but mutates a dependency object in place. The host instead builds `__alloHostDeps` once per React render; its getters and lazily created handler factory close over that render's values. The fixture therefore permits a recipient switch that the actual async submission closure does not permit. Its 4 passing and 8 failing observations are retained as investigation history and are excluded from validation counts. No submission fix was recommended or applied.

The save-action pulse is a periodic export reminder, not a dirty-response status. The two pulse assertions likewise do not establish response loss or false persistence feedback. Existing Studio restore code already checks response identity after file reads, and the prior real React fixture covers learner edits during restore.

The agent moved to actual Canvas restore/hydration generation regression coverage at the root agent's request.
