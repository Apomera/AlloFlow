# AlloFlow Auto-Update System Guide

## Overview

AlloFlow Admin includes a built-in auto-update system powered by **electron-updater**. This allows you to push updates to all installed clients without requiring users to manually download and reinstall the application.

---

## How It Works

### Update Flow
1. **Check for Updates**: App checks for updates on startup (after 3 seconds) and can be checked manually
2. **Update Available**: User sees notification with version and release notes
3. **Download Update**: User clicks "Download Update" → progress bar shows download status
4. **Install Update**: After download completes, user clicks "Restart & Install" → app restarts with new version

### Auto-Update Features
- ✅ Automatic update checking on app startup (production only)
- ✅ Manual update check from UI
- ✅ Visual notification system with progress tracking
- ✅ Background download (doesn't block UI)
- ✅ Install on app quit (seamless update)
- ✅ Multiple update channels (test, production)
- ✅ Custom update server support
- ✅ GitHub Releases integration (optional)
- ✅ Semantic versioning support

---

## Setup: Update Server

### Option 1: Custom HTTP Server (Recommended for Test Environment)

**1. Create update server directory structure:**
```bash
/var/www/alloflow-updates/
├── test/                    # Test channel
│   ├── latest.yml          # Windows update metadata
│   ├── latest-mac.yml      # macOS update metadata
│   ├── AlloFlow-Admin-Setup-0.2.0.exe
│   ├── AlloFlow-Admin-0.2.0.dmg
│   └── AlloFlow-Admin-0.2.0-mac.zip
└── production/             # Production channel
    ├── latest.yml
    ├── latest-mac.yml
    ├── AlloFlow-Admin-Setup-0.1.0.exe
    └── AlloFlow-Admin-0.1.0.dmg
```

**2. Configure nginx to serve update files:**
```nginx
server {
    listen 80;
    server_name updates.alloflow.local;  # Or your domain
    
    root /var/www/alloflow-updates;
    
    # Enable directory listing for debugging (disable in production)
    autoindex on;
    
    # CORS headers (required for electron-updater)
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Cache control for update files
    location ~* \.(yml|yaml)$ {
        expires -1;  # Don't cache metadata files
    }
    
    location ~* \.(exe|dmg|zip)$ {
        expires 7d;  # Cache installers for 7 days
    }
}
```

**3. Set environment variables before building:**
```bash
# For test builds
export UPDATE_SERVER_URL="http://updates.alloflow.local/test"
export UPDATE_CHANNEL="test"
npm run publish-test

# For production builds
export UPDATE_SERVER_URL="http://updates.alloflow.local/production"
export UPDATE_CHANNEL="production"
npm run publish-production
```

**4. Deploy update files to server:**
```bash
# After building (files are in admin/dist/)
scp admin/dist/*.exe admin/dist/*.yml user@updates.alloflow.local:/var/www/alloflow-updates/test/
scp admin/dist/*.dmg admin/dist/*-mac.yml user@updates.alloflow.local:/var/www/alloflow-updates/test/
```

---

### Option 2: GitHub Releases (Free, Simple)

**1. Update electron-builder.yml:**
```yaml
publish:
  - provider: "github"
    owner: "yourusername"
    repo: "AlloFlow"
    releaseType: "release"  # or "draft"
```

**2. Set GitHub token:**
```bash
export GH_TOKEN="your_github_personal_access_token"
```

**3. Build and publish:**
```bash
npm run publish-production
# This will create a GitHub Release and upload installers
```

**4. Update channels with GitHub:**
```yaml
publish:
  - provider: "github"
    owner: "yourusername"
    repo: "AlloFlow"
    channel: "latest"  # or "beta", "alpha"
```

---

## Building Updates

### Development Workflow

**Test Channel (for testing updates before production):**
```bash
cd admin

# 1. Bump version in package.json
# Increment version: 0.1.0 → 0.2.0

# 2. Build test update
export UPDATE_SERVER_URL="http://your-test-server.local/test"
export UPDATE_CHANNEL="test"
npm run publish-test

# 3. Deploy to test server
scp dist/*.{exe,dmg,yml} user@test-server:/var/www/alloflow-updates/test/

# 4. Test on installed client
# Open AlloFlow Admin → Should see "Update Available" notification
```

**Production Release:**
```bash
cd admin

# 1. Bump version in package.json
# Use semantic versioning: 0.2.0 → 1.0.0 (major release)

# 2. Create release notes in CHANGELOG.md

# 3. Build production update
export UPDATE_SERVER_URL="http://updates.alloflow.com/production"
export UPDATE_CHANNEL="production"
npm run publish-production

# 4. Deploy to production server
scp dist/*.{exe,dmg,yml} user@production:/var/www/alloflow-updates/production/

# 5. Announce update to users
```

---

## Version Management

### Semantic Versioning (SemVer)
Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

### Version Channels
- **test**: For testing updates before production release
- **beta**: For early adopters (optional)
- **production**: Stable releases for all users

### Update package.json version:
```json
{
  "name": "alloflow-admin",
  "version": "0.3.0",  // ← Update this
  "description": "AlloFlow Admin Center"
}
```

---

## Update Metadata Files

electron-builder automatically generates these files when you build with `--publish`:

### latest.yml (Windows)
```yaml
version: 0.2.0
files:
  - url: AlloFlow-Admin-Setup-0.2.0.exe
    sha512: abc123...
    size: 85467234
path: AlloFlow-Admin-Setup-0.2.0.exe
sha512: abc123...
releaseDate: '2026-03-16T10:30:00.000Z'
releaseNotes: |
  - Added auto-update system
  - Fixed setup wizard GPU detection
  - Improved Docker management
```

### latest-mac.yml (macOS)
```yaml
version: 0.2.0
files:
  - url: AlloFlow-Admin-0.2.0.dmg
    sha512: def456...
    size: 92345678
  - url: AlloFlow-Admin-0.2.0-mac.zip
    sha512: ghi789...
    size: 88234567
path: AlloFlow-Admin-0.2.0.dmg
sha512: def456...
releaseDate: '2026-03-16T10:30:00.000Z'
```

**Note:** You generally don't edit these files manually. electron-builder creates them automatically.

---

## Testing Updates

### Local Testing (Without Server)

**1. Create local update server:**
```bash
cd admin/dist
python3 -m http.server 8080
# Or: npx http-server -p 8080 --cors
```

**2. Configure app to use local server:**
```javascript
// In main.js (for testing only)
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080',
  channel: 'test'
});
```

**3. Build two versions:**
```bash
# Version 0.1.0
npm run build && npm run dist-win

# Update version to 0.2.0 in package.json
npm run build && npm run dist-win

# Copy 0.2.0 files to dist/ folder where http-server is running
```

**4. Install 0.1.0, then check for updates:**
- Should detect 0.2.0 update
- Download and install

---

### Production Testing Checklist

- [ ] **Version incremented** in package.json
- [ ] **Release notes** written in CHANGELOG.md
- [ ] **Test update** deployed to test server
- [ ] **Update installed** on test machine successfully
- [ ] **App functionality** verified after update
- [ ] **Rollback plan** prepared (keep previous version available)
- [ ] **Production update** deployed to production server
- [ ] **Monitor** update adoption rate
- [ ] **User feedback** collected

---

## Manual Update Check UI

Users can manually check for updates from the admin center:

### Add to Security Tab (or create Updates tab)

```jsx
// In admin/src/pages/Security.jsx or new Updates.jsx
const [updateInfo, setUpdateInfo] = useState(null);
const [checking, setChecking] = useState(false);

const handleCheckUpdates = async () => {
  setChecking(true);
  const result = await window.alloAPI.checkForUpdates();
  setUpdateInfo(result);
  setChecking(false);
};

return (
  <div className="card">
    <h2>Software Updates</h2>
    <p>Current version: {updateInfo?.currentVersion || '0.2.0'}</p>
    
    <button 
      className="btn btn-primary" 
      onClick={handleCheckUpdates}
      disabled={checking}
    >
      {checking ? 'Checking...' : 'Check for Updates'}
    </button>
    
    {updateInfo?.available && (
      <div className="alert alert-info">
        Update available: v{updateInfo.latestVersion}
      </div>
    )}
  </div>
);
```

---

## Update Server Configuration

### Environment Variables

Set these when building:

```bash
# Test environment
UPDATE_SERVER_URL="http://test-updates.alloflow.local/test"
UPDATE_CHANNEL="test"

# Production environment
UPDATE_SERVER_URL="https://updates.alloflow.com/production"
UPDATE_CHANNEL="production"
```

### Runtime Configuration

Users can configure update server in the app (useful for self-hosted deployments):

```javascript
// Via IPC from renderer
await window.alloAPI.configureUpdates({
  updateServer: 'https://custom-updates.school.edu',
  channel: 'production',
  autoCheck: true  // Check on startup
});
```

---

## Troubleshooting

### Update Check Fails

**Problem:** "Failed to check for updates: net::ERR_CONNECTION_REFUSED"

**Solutions:**
1. Verify update server is accessible: `curl http://updates.alloflow.local/test/latest.yml`
2. Check CORS headers are present in server response
3. Verify UPDATE_SERVER_URL was set during build
4. Check electron-builder.yml publish configuration

---

### Update Download Fails

**Problem:** Download starts but fails at 50%

**Solutions:**
1. Check file permissions on server (should be readable)
2. Verify sufficient disk space on client
3. Check firewall/antivirus isn't blocking download
4. Try smaller update (split into multiple releases)

---

### Update Doesn't Apply After Download

**Problem:** "Restart & Install" doesn't work

**Solutions:**
1. Check app has write permissions to installation directory
2. On Windows: May need admin elevation for per-machine installs
3. On macOS: Check app signature (unsigned apps may be blocked)
4. Check logs: `~/Library/Logs/AlloFlow Admin/main.log`

---

### Multiple Update Channels Not Working

**Problem:** Test users getting production updates

**Solutions:**
1. Ensure UPDATE_CHANNEL was set during build
2. Check latest.yml has correct path (should be `test/` or `production/`)
3. Verify users have test build installed (check version)
4. Clear update cache: Delete `~/Library/Application Support/AlloFlow Admin/updates/`

---

## Security Considerations

### Code Signing (Recommended for Production)

**Windows:**
```bash
# Get code signing certificate (DigiCert, Sectigo, etc.)
export CSC_LINK="path/to/certificate.pfx"
export CSC_KEY_PASSWORD="certificate_password"
npm run publish-production
```

**macOS:**
```bash
# Use Apple Developer ID certificate
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
npm run publish-production
```

**Benefits:**
- Windows: No SmartScreen warnings
- macOS: Required for auto-updates to work
- Both: Users trust the installer source

---

### HTTPS for Update Server (Production Only)

Update server should use HTTPS in production:

```yaml
# electron-builder.yml
publish:
  - provider: "generic"
    url: "https://updates.alloflow.com/production"  # ← HTTPS
    channel: "production"
```

---

## Advanced: Differential Updates

For faster updates, use differential updates (only download changed files):

```yaml
# electron-builder.yml
nsis:
  differentialPackage: true  # Creates .nsis.7z for delta updates
```

This creates smaller update packages (~5-20MB instead of 80MB).

---

## Monitoring & Analytics

### Track Update Adoption

Log update events to analytics:

```javascript
// In main.js
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  
  // Send analytics event
  // analytics.track('update_downloaded', { version: info.version });
});
```

### Server-Side Metrics

Track update server requests:

```nginx
# In nginx.conf
log_format updates '$remote_addr - [$time_local] "$request" $status "$http_user_agent"';
access_log /var/log/nginx/updates.log updates;
```

Analyze logs to see:
- Update check frequency
- Download completion rates
- Most common client versions

---

## Files Created

```
admin/
├── package.json                    # Updated with electron-updater dependency
├── electron-builder.yml            # Added publish configuration
├── main.js                         # Added auto-updater logic (150+ lines)
├── preload.js                      # Added update IPC methods
├── src/
│   ├── App.jsx                     # Integrated UpdateNotification component
│   └── components/
│       └── UpdateNotification.jsx  # Visual update notification system
└── AUTO_UPDATE_GUIDE.md            # This documentation
```

---

## Quick Reference

### Build Commands
```bash
npm run dist-win              # Build Windows .exe (no publish)
npm run dist-mac              # Build macOS .dmg (no publish)
npm run publish-test          # Build + publish to test channel
npm run publish-production    # Build + publish to production channel
```

### IPC Methods (Renderer)
```javascript
await window.alloAPI.checkForUpdates()   // Manual update check
await window.alloAPI.downloadUpdate()    // Start download
await window.alloAPI.installUpdate()     // Install and restart
await window.alloAPI.getVersion()        // Get current version
await window.alloAPI.configureUpdates()  // Configure update settings
```

### Update Events (Renderer)
```javascript
window.alloAPI.onUpdateAvailable(callback)        // New version available
window.alloAPI.onUpdateDownloadProgress(callback) // Download progress
window.alloAPI.onUpdateDownloaded(callback)       // Download complete
window.alloAPI.onUpdateError(callback)            // Update error
```

---

## Next Steps

1. **Install dependencies:** `cd admin && npm install`
2. **Set up test update server** (nginx + simple directory)
3. **Build test update:** `UPDATE_SERVER_URL=... npm run publish-test`
4. **Deploy to test server** and verify update notification appears
5. **Document release process** for your team
6. **Set up production update server** with HTTPS and code signing

---

**Update System Ready!** 🚀

Users will now receive automatic updates without reinstalling. Test thoroughly on your test server before deploying to production.
