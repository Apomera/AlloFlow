# Pass nineteen: consistent ink defense timing

The ink input was accepted at different points relative to different enemies. Zonal predators, reef sharks and groupers could resolve a bite before the pending input created its cloud. Moray attacks ran afterward and could already see that cloud. A last-moment ink press could therefore consume a charge and still take 35–45 damage against one reef predator, while preventing a comparable moray bite. The existing search/ink regressions established a cloud before placing an attacker in bite range, so they did not exercise this frame-order discrepancy.

## Bounded change

`apply-ink-timing.cjs` moves the complete existing ink phase, without changing its contents, from immediately before the moray AI to immediately after:

`gameState.inShelterDen = nearAnyShelterDen;gameState.inDen=isShelteredNow();`

That insertion follows player movement, collision adjustment, camouflage calculation and portable shelter handling. It precedes the zonal, shark, grouper and moray AI phases. A cloud is therefore placed at the player's actual position for that frame, and every predator makes its decision against the same accepted defense and current cloud lifetime.

The phase still executes only inside the active, unpaused simulation branch. Inspection/pause use the same frozen simulation clock and existing input clearing. The patch does not change predator damage, detection, search, resistance, strike contact, prey rewards, movement or shelter rules.

## Exact preserved contracts

- Acceptance still requires an ink-capable species, no currently active `isInked` state, a remaining reserve, and `now > inkCooldownUntil`.
- The same single reserve is consumed, cooldown remains 8 seconds, and the cloud keeps its 3,200 ms simulation lifetime. The species restriction and three-reserve initial budget remain unchanged.
- Cloud position, geometry, material, fade, expansion, disposal, achievements, statistics, captions, sound and announcements use the exact original statements.
- The existing ink-resistant predator exceptions and spatial `inkBlocks` test remain unchanged. This grants no new general invulnerability and does not move old clouds with the player.
- No seeded random call or new resource is introduced. The same existing effects execute when a request succeeds; subsequent AI decisions can intentionally differ because they now see the defense immediately.

Expiry moves with activation. The existing filter removes a cloud when `(expiresAt - now) / 3200 <= 0`, before all enemy decisions in that frame. An expired cloud can no longer protect only the enemies that happened to update earlier. Scale and opacity use that same frame's simulation time. The existing status flag clears on `now > inkUntil`, so its equality-boundary behavior is deliberately preserved: at the exact expiry instant the physical cloud is already removed, even if the status flag clears on the following advancing frame. Cooldown is longer than cloud lifetime, so this flag equality does not permit an extra charge.

## Guards and execution

The script guards the exact full ink phase, its original moray successor, and the destination statement. It checks that the resulting phase precedes all four predator AI markers, parses the candidate, and reverses the move to prove every original byte is recoverable. It edits the original source bytes directly, preserving line endings and unrelated approved grouper work; no whole-file baseline hash is required.

Root owns execution and integration. `--check` writes nothing; `--candidate` writes only `ink-timing-candidate.generated.cjs`; `--apply` is available for root's guarded integration. The script reports source/candidate hashes and preservation results. This author has not executed the patch or browser tests.

## Focused validation plan

The test author owns a new actual-browser fixture using real predators and deterministic simulation steps. Use free mode, since Observe mode restores health and would conceal the bug. Each defensive comparison needs a no-ink control that demonstrably takes damage at the same position and attack state.

1. Put a real grouper/moray in bite range, freeze between frames, queue I, then advance one simulation step. The accepted charge and cloud must exist before that step's attack decision, preserving health; the no-ink control must take a bite. Extend the same contract to real shark/non-resistant zonal actors where feasible.
2. Check cloud expiry on the exact boundary and across pause/inspection. All predators must see the cloud removed on expiry; pause freezes lifetime and creates no extra cloud or reserve consumption.
3. Check rejection during cooldown, with empty reserves, and for non-inking species. No rejected request creates a fresh cloud or grants protection. Keep existing ink-resistant behavior and spatial cover/search regressions.

Retain original failing evidence if the baseline reproduction runs. Final results belong to root's serial validation report; no result is assumed here.

## Final integrated validation

Root integrated both exact guarded stages and verified all four runtimes. The grouper candidate passed six CPU cases; the final integrated batch passed 52 cases. Eleven Chromium scenarios passed without retries, skips or flaky results. Root and independent review accepted all six matched desktop/phone captures. The real baseline grouper reproduction recorded health 100 → 65 without ink, then 65 → 30 despite one accepted cloud and a consumed charge. The unchanged strict regression now passes after the ink phase move.

Actual grouper resources: 705 vertices, 969 triangles, 31,194 raw geometry bytes, four meshes/materials/geometries. Other model and environment regions remain exact. Full hashes, initial defect, native scope and limitations are recorded in validation-summary.json.
