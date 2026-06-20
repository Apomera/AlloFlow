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
