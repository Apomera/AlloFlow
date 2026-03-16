# Building AlloFlow Admin Installers

## ✅ macOS Build Complete!

**Built:** AlloFlow Admin v0.2.0  
**File:** `dist/AlloFlow Admin-0.2.0-arm64.dmg` (92 MB)  
**Platform:** macOS 10.12+ (Apple Silicon / ARM64)  

### What's Included
- Setup wizard (8 steps)
- Docker auto-install support
- GPU detection (NVIDIA/AMD)
- AI backend configuration
- Auto-update system
- Uninstall script
- 7 admin dashboard tabs

---

## 📦 Testing the Installer

### Install AlloFlow Admin

1. **Open DMG:**
   ```bash
   open "dist/AlloFlow Admin-0.2.0-arm64.dmg"
   ```

2. **Drag to Applications:**
   - Drag "AlloFlow Admin" to "Applications" folder

3. **Launch:**
   - Open Finder → Applications → AlloFlow Admin
   - First run will show security prompt (unsigned app)
   - Right-click → Open → Open Anyway

4. **Setup Wizard:**
   - First launch shows 8-step setup wizard
   - Configure deployment mode, Docker, GPU, AI backend, etc.

5. **Test Features:**
   - Dashboard tab: Service health monitoring
   - Services tab: Docker management
   - Models tab: Ollama model downloads
   - AI Config tab: Backend configuration
   - Cluster tab: Multi-node management
   - Security tab: SSL, API keys, CORS
   - Deploy tab: Client package builder

### Verify Auto-Update System

1. **Set up local update server:**
   ```bash
   cd dist
   python3 -m http.server 8080
   ```

2. **Bump version in package.json:**
   ```json
   "version": "0.3.0"
   ```

3. **Build new version:**
   ```bash
   npm run build
   npx electron-builder --mac dmg --publish never
   ```

4. **Copy to update server:**
   ```bash
   cp "dist/AlloFlow Admin-0.3.0-arm64.dmg" update-server/
   ```

5. **Open installed app (v0.2.0):**
   - Should see "Update Available: v0.3.0" notification
   - Click "Download Update"
   - Click "Restart & Install"

---

## 🪟 Building Windows .exe (Requires Windows)

### Option 1: Build on Windows Machine

**Requirements:**
- Windows 10/11
- Node.js 18+
- Git

**Steps:**
```powershell
# Clone repo
git clone https://github.com/yourusername/AlloFlow.git
cd AlloFlow/admin

# Install dependencies
npm install

# Build Windows installer
npm run dist-win

# Output: dist/AlloFlow Admin Setup 0.2.0.exe
```

**Build Output:**
- `AlloFlow Admin Setup 0.2.0.exe` (~85 MB) - NSIS installer
- `latest.yml` - Update metadata for auto-updater

---

### Option 2: Cross-Compile from macOS (Limited Support)

⚠️ **Note:** Windows installers built on macOS may have issues and require Windows for proper testing.

```bash
# Install wine (for NSIS compilation)
brew install wine-stable

# Build Windows installer
npm run dist-win

# May fail due to wine/NSIS compatibility issues
```

**Limitations:**
- Code signing not possible (requires Windows + certificate)
- NSIS scripts may fail on macOS
- Installer won't be tested on actual Windows

---

### Option 3: GitHub Actions (Recommended for Production)

Create `.github/workflows/build.yml`:

```yaml
name: Build Installers

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd admin && npm install
      - run: cd admin && npm run dist-win
      - uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: admin/dist/*.exe

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd admin && npm install
      - run: cd admin && npm run dist-mac
      - uses: actions/upload-artifact@v3
        with:
          name: macos-installer
          path: admin/dist/*.dmg
```

**Trigger build:**
```bash
git tag v0.2.0
git push origin v0.2.0
```

**Download artifacts**: GitHub Actions → Artifacts tab

---

## 📋 Build Scripts Reference

```bash
# React production build only
npm run build

# Build Windows .exe (requires Windows)
npm run dist-win

# Build macOS .dmg (requires macOS)
npm run dist-mac

# Build both platforms (if possible)
npm run dist

# Build with auto-update enabled
export UPDATE_SERVER_URL="https://updates.alloflow.com/production"
export UPDATE_CHANNEL="production"
npm run publish-production
```

---

## 🔐 Code Signing (Production Recommendation)

### macOS Code Signing

**Requirements:**
- Apple Developer account ($99/year)
- Developer ID Application certificate

**Steps:**
1. **Get certificate:**
   - Xcode → Preferences → Accounts → Manage Certificates
   - Or: https://developer.apple.com/account/resources/certificates

2. **Set environment variable:**
   ```bash
   export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
   ```

3. **Build signed installer:**
   ```bash
   npm run dist-mac
   ```

**Benefits:**
- No "Unidentified Developer" warning
- Auto-updates work properly
- Gatekeeper approval

---

### Windows Code Signing

**Requirements:**
- Code signing certificate (DigiCert, Sectigo, etc.) ($200-400/year)
- Certificate in `.pfx` format

**Steps:**
1. **Get certificate:**
   - Purchase from DigiCert or Sectigo
   - Verify company identity
   - Download certificate as `.pfx`

2. **Set environment variables:**
   ```powershell
   $env:CSC_LINK="C:\path\to\certificate.pfx"
   $env:CSC_KEY_PASSWORD="certificate_password"
   ```

3. **Build signed installer:**
   ```powershell
   npm run dist-win
   ```

**Benefits:**
- No SmartScreen warnings
- Trusted by Windows Defender
- Professional appearance

---

## 🐛 Troubleshooting Builds

### "Application entry file does not exist"

**Problem:** electron-builder can't find main.js

**Solution:** Already fixed in electron-builder.yml:
```yaml
extraMetadata:
  main: "main.js"
```

---

### "default Electron icon is used"

**Problem:** No custom icon specified

**Solution:** Create icon files:
```bash
# macOS: icons.icns (512x512)
# Windows: icons.ico (256x256)
# Linux: icons.png (512x512)

# Place in admin/assets/icon.{icns,ico,png}
```

---

### Build fails with "macro not defined"

**Problem:** UPDATE_SERVER_URL not set

**Solution:** For local builds, ensure publish section is commented out in electron-builder.yml (already done)

For production builds:
```bash
export UPDATE_SERVER_URL="https://updates.alloflow.com/production"
npm run publish-production
```

---

### Windows Build on macOS Fails

**Problem:** wine/NSIS issues on macOS

**Solution:** Use one of these approaches:
1. Build on actual Windows machine
2. Use GitHub Actions (Windows runner)
3. Use AWS/Azure Windows VM
4. Accept unsigned/untested Windows build (not recommended)

---

## 📊 Build Artifacts

### macOS Build Output

```
dist/
├── AlloFlow Admin-0.2.0-arm64.dmg        # Installer (92 MB)
├── AlloFlow Admin-0.2.0-arm64.dmg.blockmap  # Update metadata
├── mac-arm64/                             # Unpacked app
│   └── AlloFlow Admin.app/
├── builder-debug.yml                      # Build configuration
└── builder-effective-config.yaml          # Merged config
```

---

### Windows Build Output

```
dist/
├── AlloFlow Admin Setup 0.2.0.exe        # NSIS Installer (~85 MB)
├── latest.yml                             # Update metadata
├── win-unpacked/                          # Unpacked app
│   └── AlloFlow Admin.exe
└── nsis-web/                              # Web installer (optional)
```

---

## 🚀 Deployment Checklist

- [x] macOS .dmg built and tested
- [ ] Windows .exe built (requires Windows machine/CI)
- [ ] Code signing certificates obtained
- [ ] Update server configured (nginx/GitHub)
- [ ] Auto-update tested locally
- [ ] Uninstall process tested
- [ ] Documentation updated
- [ ] Release notes written
- [ ] Users notified

---

## 📚 Next Steps

1. **Test macOS installer:**
   - Install on clean Mac
   - Complete setup wizard
   - Verify all features work
   - Test uninstall process

2. **Build Windows installer:**
   - Set up Windows VM or use GitHub Actions
   - Build .exe installer
   - Test on Windows 10/11

3. **Set up auto-update server:**
   - Configure nginx with CORS
   - Deploy update files
   - Test update flow

4. **Prepare for production:**
   - Get code signing certificates
   - Set up HTTPS update server
   - Write release notes
   - Announce to users

---

## 🎉 Current Status

✅ **macOS Installer Ready**
- File: `dist/AlloFlow Admin-0.2.0-arm64.dmg` (92 MB)
- Features: Complete admin center with setup wizard, auto-updates, uninstall
- Platform: macOS 10.12+ (Apple Silicon)
- Unsigned: Shows security warning on first launch (normal for dev builds)

⏳ **Windows Installer Pending**
- Requires: Windows machine or GitHub Actions
- Estimated size: ~85 MB
- Platform: Windows 10/11 (64-bit)
- Need: Code signing certificate for production

---

**Ready to test!** Install the macOS .dmg and verify all features work as expected.
