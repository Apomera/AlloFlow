# AlloFlow Service Updates System

## Overview

Version **0.4.2** introduces a **unified service update checking system** that monitors Ollama, Piper, and Flux for available updates. This system runs in the background and notifies the admin UI when updates are available.

## Architecture

### Components

1. **serviceUpdatesManager.js** (`admin/public/serviceUpdatesManager.js`)
   - Unified update checking for all services
   - Manages update cache with 24-hour time-to-live
   - Handles GitHub API calls for releases
   - Handles PyPI API calls for Python packages
   - Non-blocking error handling (failures don't crash app)

2. **main.js** (Electron main process)
   - Imports `serviceUpdatesManager`
   - Registers main window with update manager
   - Starts background update detector after app initialization
   - Provides IPC handlers for React UI to query update status

3. **Preload Bridge** (when implemented)
   - Exposes update checking IPC handlers to React UI
   - Receives `service:update-available` events

## Services Supported

### Ollama (LLM)
- **Check Method**: GitHub API → `ollama/ollama` releases
- **Version Detection**: `ollama --version`
- **Download**: `https://ollama.ai/download`
- **Identifies**: Latest available version from GitHub

### Piper (Text-to-Speech)
- **Check Method**: GitHub API → `rhasspy/piper` releases
- **Version Detection**: File system version check or `pip show piper`
- **Download**: `https://github.com/rhasspy/piper/releases`
- **Identifies**: Latest available version from GitHub

### Flux (Image Generation)
- **Check Method**: PyPI API → `diffusers` package
- **Version Detection**: `pip show diffusers` (from venv)
- **Download**: `https://pypi.org/project/diffusers/`
- **Identifies**: Latest PyPI version of diffusers package
- **Note**: Flux uses the `diffusers` Python library; updates are via pip

### Search (Built-in)
- **Checked**: No external binary requires updates
- **Status**: Always available (in-process WebSocket server)

## How It Works

### 1. Startup

When the app launches:
```
app.on('ready')
  → createWindow()
  → initServices() [async, non-blocking]
    → start search server
    → start SQLite backend
    → start local app server
    → start remote services (if configured)
    → startServiceUpdateDetector() ← Checks for updates
```

### 2. Background Checking

The update detector:
- **Initial check**: 5 seconds after startup (allows app to stabilize)
- **Recurring check**: Every 24 hours
- **Cached results**: Reused for up to 24 hours per service
- **Non-blocking**: Errors are logged but don't affect app function

### 3. Update Notifications

When an update is available:
```
serviceUpdatesManager
  → Detects newer version available
  → Sends IPC: "service:update-available"
    {
      serviceId: "ollama" | "piper" | "flux",
      available: true,
      currentVersion: "0.19.3",
      latestVersion: "0.20.0",
      downloadUrl: "...",
      releaseUrl: "...",
      releaseName: "v0.20.0",
      releaseNotes: "..."
    }
```

### 4. Version Comparison

Uses semantic versioning (X.Y.Z):
- `1.0.0` → `1.0.1` = update available
- `1.0.0` → `1.1.0` = update available
- `1.0.0` → `2.0.0` = update available
- `1.0.0` = `1.0.0` = no update

## IPC Handlers

The React UI can interact with the update system via these handlers:

### **services:check-updates**
Check all services for updates (triggers HTTP calls)
```javascript
const result = await window.ipcRenderer.invoke('services:check-updates');
// Returns:
// {
//   success: true,
//   updates: {
//     ollama: { available: bool, currentVersion, latestVersion, ... } | null,
//     piper: { available: bool, currentVersion, latestVersion, ... } | null,
//     flux: { available: bool, currentVersion, latestVersion, ... } | null
//   }
// }
```

### **services:check-service-update**
Check a single service for updates
```javascript
const result = await window.ipcRenderer.invoke('services:check-service-update', 'ollama');
// Returns:
// {
//   success: true,
//   serviceId: "ollama",
//   update: { available: bool, currentVersion, latestVersion, ... } | null
// }
```

### **services:get-update-status**
Get cached update status (no network call)
```javascript
const result = await window.ipcRenderer.invoke('services:get-update-status');
// Returns:
// {
//   success: true,
//   statuses: {
//     ollama: { ... } | null,
//     piper: { ... } | null,
//     flux: { ... } | null
//   }
// }
```

### **service:update-available** (Event)
Emitted when the background detector finds an available update
```javascript
window.ipcRenderer.on('service:update-available', (data) => {
  console.log(`${data.serviceId} v${data.latestVersion} available`);
  console.log(`Download: ${data.downloadUrl}`);
});
```

## Caching Strategy

- **Cache TTL**: 24 hours per service
- **Cache Key**: Service ID
- **Last Check Time**: Tracked per service
- **Behavior**: 
  - First call: Fetches from GitHub/PyPI
  - Subsequent calls (same day): Returns cached result
  - Next day: Fresh network call

## Error Handling

All failures are **non-blocking**:
- Network errors → Logged, cached result returned or null
- Missing service versions → Skipped, logged
- Execution errors → Caught, logged, app continues normally
- DNS failures → Timeout after 10 seconds, graceful failure

## Logging

All update checking is logged with `[updates]` prefix:
```
[updates] Service update detector started
[updates] ollama: v0.19.3 → v0.20.0 available
[updates] Update check completed: ollama=✓ piper=✗ flux=✗
[updates] Service update detector stopped
```

## Potential UI Integrations

### Dashboard Widget
```jsx
<ServiceUpdates />
  ├─ Ollama: v0.19.3 → v0.20.0 [Download]
  ├─ Piper: Latest (v1.2.0) [i]
  └─ Flux: v0.45.0 → v0.46.0 [Download]
```

### Notification Badge
```jsx
<ServiceIcon isBadge={hasUpdates} />  // Shows "⚙️🔴" if updates available
```

### Settings Modal
```jsx
<UpdateStatus>
  Auto-check enabled: Every 24 hours
  Last checked: 2 hours ago
  [Refresh] [Open All] [Dismiss]
</UpdateStatus>
```

## Troubleshooting

### Update check not running
- Check console logs for `[updates]` entries
- Verify services are started
- Check network connectivity to github.com and pypi.org

### Always showing updates available
- May indicate cached result from previous session
- Check if service versions are correct (`ollama --version`, etc.)
- Try manual refresh via `services:check-updates`

### Missing version detection
- Verify service is installed
- Check PATH includes service binary (for Ollama)
- For Piper/Flux, verify Python venv setup

## Implementation Notes

**Files Modified:**
- `admin/public/main.js` — Added serviceUpdatesManager import, window registration, detector integration, IPC handlers
- `admin/public/serviceUpdatesManager.js` — New file with unified update checking

**Files NOT Modified:**
- `ollamaManager.js` — Exists for backward compatibility; `checkForUpdates()` still works but serviceUpdatesManager is preferred
- Service installers — No changes required; update checking is read-only

**Future Enhancements:**
- Auto-update mechanism (download + install)
- Delta/patch updates instead of full downloads
- Release note display in UI
- Update scheduling (off-hours, user preference)
- Rollback capability

## Version History

- **v0.4.2**: Initial unified update checking system
  - Services: Ollama, Piper, Flux
  - 24-hour background detection
  - UI event API ready for implementation

---

*For questions or issues, check app logs at `~/.alloflow/logs/main.log`*
