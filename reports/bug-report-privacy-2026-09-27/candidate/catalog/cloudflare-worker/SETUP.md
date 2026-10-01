# District bug reporting

Bug reporting is disabled by default. Follow [BUG_REPORTING.md](BUG_REPORTING.md) for district authorization, gateway requirements, scoped credentials, retention, and legacy-data handling. The old shared-token reader and Google Form fallback are retired. A successful health probe does not establish reporting authorization.

# Plugin submissions (Tool Forge)

One-time setup so Tool Forge plugin submissions save to a **private** Cloudflare KV
store (`PLUGIN_SUBMISSIONS`). Until you do this, the `/submitPlugin` route returns a
500 (fail-closed) and the Forge's **Submit** button won't work — but nothing else
breaks, and you only need it when you're ready to accept plugin submissions. No rush.

> ⚠️ **READ FIRST — a real gotcha discovered 2026-06-29.** This `wrangler.toml` ships
> with **placeholder** ids for the *already-live* `BUG_REPORTS` and `PD_SUBMISSIONS`
> stores (`id = "REPLACE_WITH_…"`). If you run `npx wrangler deploy` while those are
> still placeholders, the deploy will **fail validation** (or, worse, overwrite the
> live worker's good bindings and break bug reports + PD). So you must put the **real**
> ids for all three stores in `wrangler.toml` before deploying. Two safe ways below.

## Option A (recommended — no command line, no placeholder risk): the Cloudflare dashboard
This avoids `wrangler.toml` entirely, so it can't disturb your live bindings.
1. **Create the store:** [dash.cloudflare.com](https://dash.cloudflare.com) → **Storage & Databases → KV** → **Create a namespace** → name it `PLUGIN_SUBMISSIONS` → Add.
2. **Bind it to the worker:** **Workers & Pages → `alloflow-catalog-submit` → Settings → Bindings** (or *Variables*) → **Add → KV namespace** → Variable name `PLUGIN_SUBMISSIONS`, Namespace = the one you just made → **Deploy**.
3. **Update the worker code** (so the new `/submitPlugin` route exists): same page → **Edit code** (the online editor) → replace the contents with this repo's `src/index.js` → **Deploy**. (It's a single-file module worker, so a copy-paste works.)

## Option B (command line, if your `wrangler` works): fill in the real ids, then deploy
1. List your existing stores to get their **real** ids:
   ```
   npx wrangler kv namespace list
   ```
   Copy the ids for `BUG_REPORTS` and `PD_SUBMISSIONS`.
2. Create the new store:
   ```
   npx wrangler kv namespace create PLUGIN_SUBMISSIONS
   ```
   Copy its id too.
3. In `wrangler.toml`, replace **all three** `REPLACE_WITH_…` placeholders with the real
   ids (or paste them to Claude and it'll do the edit). Save.
4. Deploy:
   ```
   npx wrangler deploy
   ```

The simple "create → paste id → deploy" recipe below is the original (and is exactly
right the *first* time you set up a store), but because BUG_REPORTS/PD are already live,
use Option A or B above instead.

### 1. Create the private KV store
```
npx wrangler kv namespace create PLUGIN_SUBMISSIONS
```
It prints `id = "…long string…"`. **Copy that id** — or just paste it to Claude.
*(Older wrangler: `npx wrangler kv:namespace create PLUGIN_SUBMISSIONS`.)*

### 2. Put the id in the config
Open `wrangler.toml`, find:
```
binding = "PLUGIN_SUBMISSIONS"
id = "REPLACE_WITH_PLUGIN_KV_NAMESPACE_ID"
```
Replace `REPLACE_WITH_PLUGIN_KV_NAMESPACE_ID` with the id (keep the quotes), save.
*(Or send the id to Claude and it'll do this edit.)*

### 3. Deploy the worker
```
npx wrangler deploy
```
Publishes the worker with the new `/submitPlugin` route.

### Reading the submission queue
No new password needed — the **`ADMIN_TOKEN`** used for PD submissions also gates
the plugin reader:
`https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/pluginSubmissions?token=YOURPASSWORD`
Add `&source=1` to include each submission's full source code.
Or from the terminal:
```
npx wrangler kv key list --binding PLUGIN_SUBMISSIONS
```

### Check it worked
```
curl https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/healthz
```
Should print `{"ok":true}`. (The route only accepts POST, so visiting `/submitPlugin`
in a browser correctly shows a 405 — that's expected.)
