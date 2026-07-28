# Cloudflare Worker setup

**Deployed 2026-07-27** (version `573c807d`). KV namespaces created, bindings
wired, worker live.

**One step remains — set the Serper key:**

```
powershell -ExecutionPolicy Bypass -File catalog\cloudflare-worker\set-search-key.ps1
```

## Running wrangler on this machine

Native Node here is `win32-arm64`, and wrangler imports `workerd` at load time,
which ships no arm64 build — so `npx wrangler` dies before doing anything.

The workaround (documented in
[`docs/CLAUDE_HANDOFF_CLOUDFLARE_WRANGLER_2026-07-26.md`](../../docs/CLAUDE_HANDOFF_CLOUDFLARE_WRANGLER_2026-07-26.md))
is to run the official Windows **x64** Node under emulation with wrangler
installed against it. `dev-tools/wrangler.cjs` wraps that and forwards every
argument to the real CLI, so Cloudflare's docs work verbatim:

```
node dev-tools/wrangler.cjs whoami
node dev-tools/wrangler.cjs --cwd catalog/cloudflare-worker deploy
```

Verified working: wrangler **4.114.0**, authenticated as
`aaron.pomeranz@maine.edu`, account `37d398da…`. If `C:\tmp` gets cleaned, the
wrapper prints the exact recreation commands.

`node dev-tools/cf_worker.cjs status` is a read-only overview that cross-checks
`wrangler.toml` against what is actually live and names which feature each
missing binding disables.

## What is live right now
## What is live right now

Worker , version , deployed 2026-07-27.

| Feature | Needs | State |
| --- | --- | --- |
| Catalog lesson / translation / item-correction submissions |  | **working** |
| Tool Forge plugin submissions |  KV | **working** |
| In-app bug reports () |  KV | **working** (namespace created 2026-07-27) |
| PD module submissions () |  KV | **working** (namespace created 2026-07-27) |
| Web search () |  | **deployed, awaiting the key** |
| Reading any queue |  | **not set** |

## What was done on 2026-07-27

1. Created KV namespaces , ,  and wrote
   their ids into , so  and  no longer
   fail closed.
2. Corrected , which held a placeholder id in the repo while
   the live worker had the real namespace bound. Deploying from that config
   would have dropped a working binding.
3. Fixed , which would have rolled the runtime back from
   2026-05-04 to 2026-04-01.
4. Removed the  block. **This account is on the Workers Free
   plan, which rejects the whole deploy with  (code 100328) — so this config had never been deployable.**
   That is very likely why the live worker had drifted from the repo since June.
5. Deployed. Verified  still returns  and    survived, so catalog submissions were never interrupted.
6. Pointed Canvas at this endpoint by default in .

## The one remaining step

\Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.
Wrangler prompts for the key, so it never touches shell history, the repo, or a
transcript. The script then queries the live endpoint and reports whether
search is working.

Get a key at <https://serper.dev> (free tier: a one-time 2,500 searches, no
card required). Success looks like .
Then confirm in the app: Diagnostics → **🔎 Web search** → **Run test search**,
and Quick Start → Find should return standards with no "NOT web-verified"
banner.

Until the key is set,  correctly returns
 and the app falls back to
AI-knowledge standards, clearly labelled.

## Also worth doing: ADMIN_TOKEN

\
 ⛅️ wrangler 4.114.0
────────────────────
🌀 Creating the secret for the Worker "alloflow-catalog-submit"
✨ Success! Uploaded secret ADMIN_TOKEN
Any password you choose. Without it the queue readers stay closed — and
**plugin submissions have been accumulating in KV unread**, since that
namespace accepts writes but reading is token-gated:

\
Serper's free tier is a **one-time 2,500-search credit**, not a monthly refill,
so the guard that matters is total spend — not request rate.

| Guard | Default | Why |
| --- | --- | --- |
| Per-IP rate | 60/min | Loose on purpose. A school NATs its whole building behind one address; a tight cap would throttle thirty teachers as one abuser. Catches runaway loops only. |
| Daily budget | 500/day | The real protection. Refuses with `daily-budget-exhausted` so the app can say "today's budget is used up" rather than "search is broken" — and a teacher with their own key keeps working. |
| Cache | 15 min | Does most of the saving. Standards lookups repeat heavily; a cache hit costs no credit and is served even when the budget is spent. |

To retune, add these to the `[vars]` block at the top of `wrangler.toml` and
redeploy. On the $50/mo tier, `SEARCH_DAILY_BUDGET = "1500"` and
`SEARCH_RATE_PER_MINUTE = "120"` are comfortable.

Kill switch, no redeploy:

```
node dev-tools/wrangler.cjs --cwd catalog/cloudflare-worker secret put DISABLE_SEARCH_PROXY
# enter: true
```
