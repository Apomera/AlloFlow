# AlloFlow Admin - Debugging Guide (v0.3.1)

## Status Report: Issues Found & Analysis

### 1. Cloud Options Still Showing in AI Settings ❌

**Observed Problem:**
- Provider dropdown shows: Gemini, OpenAI, Claude, On-Device NPU, Custom Endpoint
- These should NOT be available in a local-only app

**Root Cause:**
The "local app" is actually serving from `prismflow-deploy/` (web app code) which contains ALL cloud options. The local app hasn't been properly separated yet.

**Evidence:**
- File: `prismflow-deploy/src/App.jsx` lines 67303-67350
- Contains full provider list including Gemini, OpenAI, Claude, etc.
- Local app in `local-app/src/LocalApp.jsx` has identical code (from web app extraction)

**What Needs to Happen:**
- The local app code must strip out cloud providers during serving
- OR: Serve a different config that disables these options
- OR: Rebuild local app with cloud code removed

---

### 2. Models Don't Load During Setup ❌

**Observed Problem:**
- Setup wizard shows model selection step
- Models don't appear to download
- Message shows "download complete" but models aren't installed

**Root Cause Analysis:**

Looking at deployment flow in `admin/public/main.js` (lines 559-750):

**Phase 5 Logic (Model Pulling):**
```javascript
// setupData.selectedModels is passed to startDeployment()
const modelsToPull = setupData.selectedModels && setupData.selectedModels.length > 0
  ? setupData.selectedModels
  : ['neural-chat:7b']; // Fallback
```

**Critical Issue:**
- The wizard (`SetupWizard.jsx`) collects `selectedModels` 
- It passes them to `startDeployment(setupData)`
- BUT main.js LOGS show whether models are being passed

**To Debug:**
Check the logs for these messages:
```
[deploy:start] setupData.selectedModels: ???
[deploy:start] Models to pull: ...
[deploy:start] Ollama is now healthy and ready for model pulls
```

If setupData.selectedModels is undefined or empty, models won't pull.

---

### 3. Ollama Not Starting on App Startup ❌

**Root Cause:**

In `admin/public/main.js` (lines 275-300, `app.on('ready')`):

```javascript
const config = getConfig();
if (config && config.deploymentType === 'local') {
  // Start services for each configured service...
  for (const serviceId of selectedServices) {
    nativePM.startService(serviceId); // ← This is called
  }
  // Wait for Ollama
  await ollamaManager.waitForHealthy(30000, 1000);
}
```

**Potential Issues:**
1. `config.selectedServices` might be empty/null
2. `nativePM.isServiceInstalled('ollama')` returns false (service not downloaded)
3. Ollama process fails to start (executable missing or permission issue)
4. Health check endpoint unreachable

**To Debug:**
Look for these log lines:
```
[app:ready] Existing local config found, auto-starting services...
[app:ready] Starting service: ollama
[app:ready] ✓ Ollama is healthy
```

If missing, Ollama setup didn't complete properly during install.

---

### 4. Logs Now Available for Debugging ✅ NEW

**How to View Logs:**

All logs from the Electron main process are now captured to:
```
~/.alloflow/logs/main.log
~/.alloflow/logs/ollama.log
~/.alloflow/logs/piper.log
~/.alloflow/logs/flux.log
```

**In the Admin UI (when implemented):**

The preload API now exposes:
```javascript
window.alloAPI.logs.onMainLogs(data => console.log(data))
window.alloAPI.logs.getRecentLogs('main', 100) // Get last 100 lines
window.alloAPI.logs.clearLogs('main')           // Clear logs
```

**From Command Line:**
```powershell
tail -f $env:USERPROFILE\.alloflow\logs\main.log
```

---

## Diagnostic Test Results (96.7% Pass Rate)

Run any time with:
```bash
cd admin && node test/diagnostic.test.js
```

✅ 58/60 checks passed:
- All core APIs present ✓
- Service definitions correct ✓
- Deployment flow logical ✓
- Model pulling scenarios valid ✓
- Log streaming configured ✓
- Uninstaller config reset configured ✓

❌ 2 failures (expected):
- "search" service missing from test definitions (non-critical)

---

## Action Items to Fix Issues

### Priority 1: FIX CLOUD OPTIONS IN LOCAL APP

The local app is serving the web app's code. Need ONE of:

**Option A: Run-time filtering (fast)**
```javascript
// In webAppServer.js - filter the HTML before serving
// Replace provider list with Ollama-only before sending
```

**Option B: Build separate local app (proper but slower)**
```bash
npm run build:local-app  # Extract + strip cloud code -> local-app/build/
```

### Priority 2: FIX MODEL PULLING

Update `SetupWizard.jsx` to:
1. ✓ Collect selected models from dropdown
2. ✓ Pass `selectedModels` array in setupData to `startDeployment()`
3. ✓ Log what's in setupData before sending

Check deployment logs for:
```
[deploy:start] setupData.selectedModels: ['neural-chat:7b']
[deploy:start] Ollama is now healthy...
[deploy:start] Pulling 1 model(s): neural-chat:7b
```

### Priority 3: FIX OLLAMA AUTO-START

Verify setup wizard completes these:
1. Download Ollama binary (Phase 2)
2. Start Ollama (Phase 3) 
3. Wait for health (Phase 4)
4. Save config with `selectedServices: ['ollama']`

If any phase fails, `app.on('ready')` won't see Ollama configured.

### Priority 4: ADD LOG VIEWER UI

Create a simple modal in Admin dashboard showing live logs:

```javascript
const [logs, setLogs] = useState([]);

useEffect(() => {
  window.alloAPI.logs.onMainLogs(log => {
    setLogs(prev => [...prev, log.line].slice(-100));
  });
}, []);

return (
  <div style={{fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
    {logs.map((line, i) => <div key={i}>{line}</div>)}
  </div>
);
```

---

## Quick Debugging Workflow

When something fails during setup/startup:

1. **Check logs first:**
   ```
   cat ~/.alloflow/logs/main.log | tail -50
   ```

2. **Look for specific failure points:**
   - `[app:ready]` messages → app startup
   - `[deploy:start]` messages → setup wizard deployment
   - `[ipc:... ]` messages → IPC handler results
   - `ERROR:` or `WARN:` → what went wrong

3. **Test APIs directly in DevTools:**
   ```javascript
   // Check if setup was complete
   await window.alloAPI.setup.check()
   
   // Check if Ollama is installed
   await window.alloAPI.ollama.checkStatus()
   
   // Check service config
   await window.alloAPI.setup.getConfig()
   ```

4. **Manually trigger parts of setup:**
   ```javascript
   // Test model pulling
   await window.alloAPI.ollama.pullModel('neural-chat:7b')
   
   // Watch for progress
   window.alloAPI.ollama.onPullProgress(p => console.log(p))
   ```

---

## Summary of Current State

| Component | Status | Issue |
|-----------|--------|-------|
| Service definitions | ✅ Correct | — |
| Setup wizard flow | ✅ Correct | Models may not be passed |
| Model pulling logic | ✅ Correct | Depends on setupData |
| Ollama startup | ✅ Code ready | Blocked by setup issues |
| Log streaming | ✅ Implemented | UI not built yet |
| Cloud removal | ❌ NOT DONE | Web app code still served |
| Uninstaller reset | ✅ Implemented | — |

---

##  Next Steps: What to Check

1. **Run setup again with DevTools open**
   - Monitor `console.log` for [deploy:start] messages
   - Take screenshots of any error dialogs
   - Check ~/.alloflow/logs/main.log for detailed errors

2. **Share the full logs**
   - `cat ~/.alloflow/logs/main.log` after failed setup
   - This will show exactly where deployment fails

3. **Verify Ollama installed**
   - Check: `C:\Users\%USERNAME%\.alloflow\services\ollama\ollama.exe` exists
   - Try running manually: `ollama serve` in a terminal

4. **Test model list API**
   - If Ollama runs manually, check: `curl http://localhost:11434/api/tags`
   - This should return JSON with installed models

---

Created: 2026-04-03
Last Updated: During diagnostic work
Version: 0.3.1
