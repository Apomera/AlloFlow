# Test Prep item corrections

Community-submitted corrections to Test Prep practice items, collected by the
in-app **Suggest a correction** button (`item_correction_module.js` →
Cloudflare worker `/submitItemCorrection` → committed here as one JSON per
correction under `pending/`).

Triage them with:

```
node dev-tools/i18n/ingest_item_corrections.cjs
```

These are **review-only**. A correction can change a keyed answer, which is
exactly the licensed-professional / psychometric judgment the packs are
candidly waiting on — apply accepted fixes by hand (per item), then move the
record to `applied/`. Nothing here is auto-applied.
