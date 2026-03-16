# Auto-Update System - Quick Start

## 🚀 Features

✅ **Automatic update checking** on app startup  
✅ **Visual notifications** for available updates  
✅ **Progress tracking** during download  
✅ **Seamless installation** on app restart  
✅ **Multiple update channels** (test, production)  
✅ **Custom update servers** or GitHub Releases  

---

## 📦 What Was Added

### Dependencies
- `electron-updater` v6.1.4 - Auto-update engine
- `electron-log` - Update logging system

### New Files
```
admin/
├── src/components/UpdateNotification.jsx  # Visual update UI
├── scripts/
│   ├── test-updates-local.sh              # Test updates locally
│   └── deploy-update.sh                    # Deploy to remote server
├── .env.updates.example                    # Server configuration template
├── AUTO_UPDATE_GUIDE.md                    # Complete documentation
└── AUTO_UPDATE_QUICK_START.md              # This file
```

### Modified Files
- `main.js` - Added auto-updater logic (150+ lines)
- `preload.js` - Added update IPC methods
- `App.jsx` - Integrated UpdateNotification component
- `package.json` - Bumped to v0.2.0, added scripts
- `electron-builder.yml` - Added publish configuration

---

## 🧪 Testing Updates Locally (No Server Required)

### 1. Build Version 1
```bash
cd admin
# Ensure package.json version is 0.2.0
npm run build
npm run dist-win  # or dist-mac
```

### 2. Install Version 1
- Install the `.exe` or `.dmg` from `admin/dist/`
- Launch AlloFlow Admin

### 3. Build Version 2
```bash
# Bump version in package.json: 0.2.0 → 0.3.0
npm run build
npm run dist-win  # or dist-mac
```

### 4. Start Local Update Server
```bash
./scripts/test-updates-local.sh
# Server runs on http://localhost:8080
```

### 5. Test Update Flow
1. Open installed AlloFlow Admin (v0.2.0)
2. Wait 3 seconds → Should see "Update Available: v0.3.0" notification
3. Click "Download Update" → Progress bar appears
4. Click "Restart & Install" → App restarts with v0.3.0

**Note:** In development, updates are disabled. This only works on production builds (.exe/.dmg files).

---

## 🌐 Setting Up Update Server

### Option 1: Simple HTTP Server (Test Environment)

**1. Create directory structure on server:**
```bash
sudo mkdir -p /var/www/alloflow-updates/test
sudo mkdir -p /var/www/alloflow-updates/production
sudo chown -R $USER:$USER /var/www/alloflow-updates
```

**2. Configure nginx:**
```nginx
server {
    listen 80;
    server_name updates.alloflow.local;
    root /var/www/alloflow-updates;
    
    autoindex on;  # For debugging
    
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    
    location ~* \.(yml|yaml)$ {
        expires -1;  # Don't cache metadata
    }
}
```

**3. Deploy updates:**
```bash
# Set environment variables
export TEST_UPDATE_SERVER="http://updates.alloflow.local/test"
export TEST_REMOTE_USER="alloflow"
export TEST_REMOTE_HOST="updates.alloflow.local"
export TEST_REMOTE_PATH="/var/www/alloflow-updates/test"

# Deploy
./scripts/deploy-update.sh test
```

---

### Option 2: GitHub Releases (Free & Simple)

**1. Update `electron-builder.yml`:**
```yaml
publish:
  - provider: "github"
    owner: "yourusername"
    repo: "AlloFlow"
```

**2. Set GitHub token:**
```bash
export GH_TOKEN="your_github_personal_access_token"
```

**3. Build and publish:**
```bash
npm run publish-production
# Automatically creates GitHub Release and uploads installers
```

**4. Updates work automatically** - electron-updater checks GitHub Releases

---

## 📝 Deployment Workflow

### Test Channel Workflow
```bash
# 1. Bump version
# In package.json: 0.2.0 → 0.3.0

# 2. Test locally first
./scripts/test-updates-local.sh

# 3. Deploy to test server
./scripts/deploy-update.sh test

# 4. Verify on test machines
# Install test build → Check for updates → Should see v0.3.0

# 5. If successful, deploy to production
./scripts/deploy-update.sh production
```

### Production Release Workflow
```bash
# 1. Bump version (use semantic versioning)
# 0.2.0 → 1.0.0 (major release)

# 2. Update CHANGELOG.md with release notes

# 3. Build and deploy
export UPDATE_SERVER_URL="https://updates.alloflow.com/production"
export UPDATE_CHANNEL="production"
npm run publish-production

# 4. Deploy to production server
./scripts/deploy-update.sh production

# 5. Monitor update adoption
# Check server logs: tail -f /var/log/nginx/updates.log
```

---

## 🔧 Configuration

### Environment Variables (Build Time)

Set these before building to configure update server:

```bash
# Test builds
export UPDATE_SERVER_URL="http://test-updates.alloflow.local/test"
export UPDATE_CHANNEL="test"
npm run publish-test

# Production builds
export UPDATE_SERVER_URL="https://updates.alloflow.com/production"
export UPDATE_CHANNEL="production"
npm run publish-production
```

### Runtime Configuration (User-Facing)

Users can configure updates from the app:

```javascript
// Future feature: Add to Settings page
await window.alloAPI.configureUpdates({
  updateServer: 'https://custom-updates.school.edu',
  channel: 'production',
  autoCheck: true
});
```

---

## 🐛 Troubleshooting

### Updates Not Detected

**Problem:** App doesn't show "Update Available" notification

**Check:**
1. Is this a production build? (Updates disabled in dev mode)
2. Is update server accessible? `curl http://updates.alloflow.local/test/latest.yml`
3. Check browser DevTools console for errors
4. Check logs: `~/Library/Logs/AlloFlow Admin/main.log`

### Download Fails

**Problem:** Download starts but fails mid-way

**Solutions:**
- Check server logs for 404/500 errors
- Verify file permissions on server
- Ensure sufficient disk space on client
- Check antivirus/firewall isn't blocking

### Won't Install After Download

**Problem:** "Restart & Install" button doesn't work

**Solutions:**
- On Windows: May need admin rights for per-machine installs
- On macOS: App must be code-signed for auto-update to work
- Check app has write permissions to installation directory

---

## 📊 Monitoring Updates

### Server-Side (nginx)

Check update requests:
```bash
tail -f /var/log/nginx/access.log | grep latest.yml
```

### Client-Side (Electron logs)

Check update logs:
```bash
# macOS
tail -f ~/Library/Logs/AlloFlow\ Admin/main.log

# Windows
type %USERPROFILE%\AppData\Roaming\AlloFlow Admin\logs\main.log
```

---

## 🔒 Security (Production Recommendations)

### 1. Use HTTPS for Update Server
```yaml
publish:
  - provider: "generic"
    url: "https://updates.alloflow.com/production"  # ← HTTPS
```

### 2. Code Sign Installers

**Windows:**
```bash
export CSC_LINK="/path/to/certificate.pfx"
export CSC_KEY_PASSWORD="your_password"
npm run publish-production
```

**macOS:**
```bash
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
npm run publish-production
```

### 3. Enable Update Verification

electron-updater automatically verifies:
- SHA512 checksums (in latest.yml)
- Code signatures (if app is signed)
- HTTPS certificate validity

---

## 📚 Additional Resources

- **Complete Guide:** [AUTO_UPDATE_GUIDE.md](AUTO_UPDATE_GUIDE.md) - Comprehensive documentation
- **Example Config:** [.env.updates.example](.env.updates.example) - Server configuration template
- **electron-updater Docs:** https://www.electron.build/auto-update
- **Semantic Versioning:** https://semver.org/

---

## ✅ Quick Checklist

Before deploying updates:

- [ ] Version bumped in `package.json`
- [ ] Release notes written
- [ ] Tested locally with `test-updates-local.sh`
- [ ] Deployed to test server
- [ ] Verified on test machine
- [ ] Deployed to production (if test successful)
- [ ] Monitoring server logs
- [ ] Users notified of new version

---

## 🚀 Next Steps

1. **Test locally:** `./scripts/test-updates-local.sh`
2. **Set up nginx server** for test updates
3. **Deploy test update:** `./scripts/deploy-update.sh test`
4. **Verify update works** on installed client
5. **Configure production server** with HTTPS and code signing
6. **Document process** for your team

---

**Auto-Update System Active!** 🎉

Users will receive automatic updates without reinstalling. Test thoroughly before production deployment.
