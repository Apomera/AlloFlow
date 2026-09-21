# Tool Forge: the last step (Cloudflare KV)

Tool Forge is committed and reachable in the app as of `d14762ef1`. Teachers can
open it, author a plugin, validate it and preview it in the sandbox. **One
control is still dead: Submit.** It POSTs to `/submitPlugin` on the catalog
worker, which fails closed with a 500 because the `PLUGIN_SUBMISSIONS` KV store
has never been created.

This is the only remaining piece, and it has to be done from the Cloudflare
dashboard — see "Why not the command line" at the bottom.

---

## Check first — you may only need part of this

Open this in a browser:

```
https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submitPlugin
```

| What you see | What it means | What to do |
|---|---|---|
| **405** (method not allowed) | The route is live; only the KV store is missing | Do **steps 1–2**, skip step 3 |
| **500** | Route live, binding missing | Do **steps 1–2**, skip step 3 |
| **404** | The deployed worker predates the route | Do **all three steps** |

A 405 is a *success* signal, not an error — the route only accepts POST, so a
browser GET is correctly refused.

---

## Step 1 — create the store

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Storage & Databases → KV**
2. **Create a namespace**
3. Name it exactly `PLUGIN_SUBMISSIONS` → **Add**

## Step 2 — bind it to the worker

1. **Workers & Pages → `alloflow-catalog-submit` → Settings → Bindings**
2. **Add → KV namespace**
3. Variable name: `PLUGIN_SUBMISSIONS` · Namespace: the one from step 1
4. **Deploy**

## Step 3 — only if you saw a 404 above

1. Same worker page → **Edit code**
2. Replace the contents with this repo's `catalog/cloudflare-worker/src/index.js`
   (2,240 lines, ~143 KB — it is a single-file module worker, so a straight
   copy-paste works)
3. **Deploy**

> The repo copy is current: last touched 2026-09-19, and that change did not go
> near the plugin route, which has been in the source since 2026-06-29.

---

## Verify

1. `https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/healthz`
   → should print `{"ok":true}`
2. Re-open `/submitPlugin` in the browser → **405** is correct. A **500** means
   the binding did not take.
3. End to end: open Tool Forge in the app as a teacher, generate or paste a
   plugin, validate, preview, then Submit. It should succeed rather than error.

## Reading the queue

No new password. The **same `ADMIN_TOKEN` you already use for bug reports** gates
the reader:

```
https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/pluginSubmissions?token=YOURPASSWORD
```

Add `&source=1` to include each submission's full source.

Nothing submitted ever goes live on its own — submissions sit in private KV until
a maintainer reviews them. That is by design.

---

## Why not the command line

**`wrangler deploy` can break things that currently work.**
`catalog/cloudflare-worker/wrangler.toml` still carries placeholder ids
(`REPLACE_WITH_…`) for `BUG_REPORTS` and `PD_SUBMISSIONS` — two stores that are
**live on this same worker**. Deploying with those placeholders in place can fail
validation or overwrite the good bindings, taking out bug reports and PD
submissions. The dashboard route never touches `wrangler.toml`, so it cannot
cause that.

**And wrangler cannot run on this machine at all.** Cloudflare ships no
`windows-arm64` build of `workerd`; the latest release has linux-64, darwin-64,
windows-64, linux-arm64 and darwin-arm64 only. `npx wrangler` therefore dies with
`Unsupported platform: win32 arm64`, and no upgrade fixes it. (The global
`wrangler` on PATH is also a broken stub, and the stored OAuth token expired
2026-09-20.) A non-ARM64 machine would work, but the dashboard is simpler.

See also `catalog/cloudflare-worker/SETUP.md` for the original notes.
