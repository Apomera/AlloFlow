# veraPDF in-browser — AlloFlow integration plan (ready to apply)

> **Prototype integration plan, not current product documentation (2026-07-09):** This plan is additive guidance for a gated browser-veraPDF experiment. Do not cite it as shipped behavior until hosting, Canvas/runtime testing, size gating, and user opt-in UX are verified. Current guidance lives in `docs/verapdf_install.md`, `docs/wcag_sc_coverage.md`, and `PIPELINE_ARCHITECTURE.md`.

Status: feasibility PROVEN; component (`verapdf_validator.html`) + driver (`verapdf_client.js`)
BUILT + headless-tested. This is the exact, additive, **default-OFF** wiring into the live app.
Apply once the two gates clear:

- **Gate 1 (hosting):** host `cli-1.30.2.jar` + `verapdf_validator.html` on AlloFlow's CDN.
- **Gate 2 (Canvas):** confirm CheerpJ boots when `verapdf_validator.html` is opened from a
  Canvas-launched companion window (open it from Canvas; expect *"✅ Validator ready"*).

Everything below is gated behind `window.__ALLOFLOW_VERAPDF_URL` being set **and** the user
toggle — so until both exist, behavior is unchanged. Validate edits with
`npx vitest run tests/issue_locator_ui.test.js` (compiles the audit view; SSR-only — the
browser runtime still needs Gate 2).

---

## 1. Load the driver + validator URL (host shell, AlloFlowANTI.txt)

Load `verapdf_client.js` from the CDN alongside the other lazy modules, and expose the URL:

```js
// where window.__ALLOFLOW_VERAPDF_URL is set (config/boot):
window.__ALLOFLOW_VERAPDF_URL = CDN_BASE + '/verapdf_validator.html'; // '' to disable
// verapdf_client.js defines window.createVeraPdfValidator(...)
```

## 2. view_pdf_audit_source.jsx — state (next to `lastTaggedValidation`, ~line 1671)

```jsx
const [veraPdfResult, setVeraPdfResult] = useState(null);   // {compliant, failedChecks, failedRules, sizeWarn}
const [veraPdfBusy, setVeraPdfBusy] = useState(false);
const veraRef = useRef(null);
const VERAPDF_URL = (typeof window !== 'undefined' && window.__ALLOFLOW_VERAPDF_URL) || '';
const veraEnabled = (typeof window !== 'undefined' && window.createVeraPdfValidator && VERAPDF_URL)
  ? (localStorage.getItem('alloflow.verapdf.optin') === '1') : false;
function getVera() {
  if (!veraRef.current && VERAPDF_URL && window.createVeraPdfValidator) {
    veraRef.current = window.createVeraPdfValidator({ validatorUrl: VERAPDF_URL, mode: 'window' });
  }
  return veraRef.current;
}
```

## 3. Pre-remediation opt-in toggle (in the audit setup UI, before "Make Accessible")

```jsx
{VERAPDF_URL && window.createVeraPdfValidator && (
  <label className="flex items-center gap-2 text-sm mt-2">
    <input type="checkbox" defaultChecked={veraEnabled}
      onChange={(e) => {
        localStorage.setItem('alloflow.verapdf.optin', e.target.checked ? '1' : '0');
        if (e.target.checked) { const v = getVera(); if (v) v.warmUp().catch(() => {}); }
      }} />
    <span>{t('pdf_audit.verapdf.optin') || 'Check with veraPDF (ISO 14289-1)'}
      <span className="text-slate-500"> — {t('pdf_audit.verapdf.note') || 'downloads ~25 MB once, runs locally in your browser; no document is uploaded to an AlloFlow server'}</span>
    </span>
  </label>
)}
```

## 4. Warm-up trigger — when remediation STARTS (hides the ~14s boot)

In the "Make Accessible" / `runAutoFixLoop` entry (AlloFlowANTI.txt) — fire-and-forget:

```js
if (localStorage.getItem('alloflow.verapdf.optin') === '1' && window.createVeraPdfValidator && window.__ALLOFLOW_VERAPDF_URL) {
  try { getVera() && getVera().warmUp(); } catch (e) {}
}
```

## 5. Validate the exported bytes (view_pdf_audit_source.jsx, after `pdfUa1Checks` is set, ~line 7690-7701)

`_result.bytes` are the shipped tagged-PDF bytes. After `setLastTaggedValidation({...})`:

```js
if (veraEnabled && _result && _result.bytes) {
  setVeraPdfBusy(true);
  getVera().validate(_result.bytes)
    .then((r) => setVeraPdfResult(r))
    .catch((e) => setVeraPdfResult({ error: String(e && e.message || e) }))
    .finally(() => setVeraPdfBusy(false));
}
```

## 6. Display — beside the self-check panel (~line 8014)

```jsx
{(veraPdfBusy || veraPdfResult) && (
  <div className="mt-2 text-sm">
    {veraPdfBusy && <span className="text-slate-600">⏳ {t('pdf_audit.verapdf.running') || 'Independently validating with veraPDF…'}{veraPdfResult && veraPdfResult.sizeWarn ? ' (large file — may take a few minutes)' : ''}</span>}
    {veraPdfResult && veraPdfResult.error && <span className="text-amber-700">veraPDF validation unavailable ({veraPdfResult.error}) — rely on the self-check + verify in PAC 2024.</span>}
    {veraPdfResult && !veraPdfResult.error && (
      <details>
        <summary data-help-ignore="true" className="cursor-pointer font-bold">
          {veraPdfResult.compliant ? '✅' : '❌'} {t('pdf_audit.verapdf.title') || 'veraPDF check (ISO 14289-1)'} — {veraPdfResult.compliant ? (t('pdf_audit.verapdf.pass') || 'No PDF/UA-1 rule failures reported') : `${veraPdfResult.failedRules.length} rule(s) failed`}
        </summary>
        {!veraPdfResult.compliant && (
          <ul className="mt-1 pl-5 list-disc">
            {veraPdfResult.failedRules.map((f, i) => (
              <li key={i}>ISO 14289-1 §{f.clause} (test {f.testNumber}): {f.message}{f.count > 1 ? ` ×${f.count}` : ''}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 mt-1">{t('pdf_audit.verapdf.disclaimer') || 'Independent open-source validation — not a legal accessibility certificate; human review still recommended.'}</p>
      </details>
    )}
  </div>
)}
```

## 7. Teardown — on modal close / start-new (free the companion window)

```js
try { veraRef.current && veraRef.current.teardown(); veraRef.current = null; } catch (e) {}
setVeraPdfResult(null);
```

## Notes
- **Size-gate** is built into the driver (`sizeWarn` at >600 KB → 10-min timeout + the "may take a few minutes" hint). Big docs still run; just slowly. Optionally route >Ngate docs to a self-hosted veraPDF service for institutional builds.
- **Cold-run watchdog** is in the driver (timeout → reopen → retry once) — mitigates CheerpJ's flaky first validation.
- **Service-worker cache** the jar + runtime so the ~25 MB is a one-time cost.
- **Institutional builds** may default the toggle ON.
- The driver's `mode: 'window'` matches PDF Compare (escapes Canvas's sandboxed iframe). Switch to `'iframe'` only if the validator is hosted same-origin & un-sandboxed.
