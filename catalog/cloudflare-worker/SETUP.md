# Bug-report KV setup — quick steps

One-time setup so bug reports save to a **private** Cloudflare KV store (not the public repo).
Translation corrections do NOT need any of this.

## Where to run these
Use a terminal **inside this folder** (`catalog/cloudflare-worker/`). Easiest in VS Code:
1. **Terminal → New Terminal** (or press **Ctrl + `** — the backtick key, top-left).
2. It usually opens at the project root. Move into the worker folder:
   ```
   cd catalog/cloudflare-worker
   ```
   (If it opens somewhere else, run: `cd "C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/catalog/cloudflare-worker"`)

You do **not** need to install wrangler — `npx wrangler` fetches it automatically.

## The steps

### 1. Create the private KV store
```
npx wrangler kv namespace create BUG_REPORTS
```
- The **first** wrangler command may open a browser and ask you to **log in / authorize Cloudflare** — approve it. (This is the part only you can do.)
- When it finishes it prints an `id = "…long string…"`. **Copy that id** — or paste it to Claude and it'll put it in the config for you.
- *(If you ever see "unknown argument", your wrangler is older — use `npx wrangler kv:namespace create BUG_REPORTS` instead.)*

### 2. Put the id in the config
Open `wrangler.toml` (same folder), find this line:
```
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```
Replace `REPLACE_WITH_KV_NAMESPACE_ID` with the id from step 1 (keep the quotes), save.
*(Or just send the id to Claude.)*

### 3. Deploy the worker
```
npx wrangler deploy
```
Publishes the worker with the new bug-report route. Prints the worker URL + "Published" when done.

### Optional — browser reader for reports
```
npx wrangler secret put ADMIN_TOKEN
```
Type any password you like, press Enter. Then you can view reports at:
`https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bugs?token=YOURPASSWORD`

Skip it if you prefer; you can always read reports from the terminal:
```
npx wrangler kv key list --binding BUG_REPORTS
npx wrangler kv key get  --binding BUG_REPORTS "bug:….the-id"
```

## Check it worked
```
curl https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/healthz
```
Should print `{"ok":true}`.

---

**No rush:** until you deploy the worker, the in-app error reporter falls back to the
Google Form automatically, so nothing is broken in the meantime.

**Troubleshooting:** if `npx wrangler` errors, run `npm install` once in this folder, then retry.
If a command says you're not logged in, run `npx wrangler login` and approve in the browser.

---

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
No new password needed — the **same `ADMIN_TOKEN`** you set for bug reports also gates
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
