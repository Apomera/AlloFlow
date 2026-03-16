# AlloFlow Admin - Installation & Uninstallation Guide

## Windows Installation

### Installation Process
1. Run `AlloFlow-Admin-Setup.exe`
2. Choose installation directory (default: `C:\Program Files\AlloFlow Admin`)
3. Complete setup wizard (Docker, GPU detection, AI configuration)
4. Application installs for all users (requires administrator privileges)

### Windows Uninstallation

**Method 1: Windows Settings**
1. Open **Settings** → **Apps** → **Installed apps**
2. Search for "AlloFlow Admin"
3. Click **⋯** (three dots) → **Uninstall**
4. Follow uninstaller prompts

**Method 2: Control Panel**
1. Open **Control Panel** → **Programs and Features**
2. Find "AlloFlow Admin"
3. Click **Uninstall**
4. Follow uninstaller prompts

**What Gets Removed:**
- ✅ AlloFlow Admin application files
- ✅ Desktop and Start Menu shortcuts
- ✅ Registry entries
- ✅ Application configuration (`%APPDATA%\AlloFlow Admin`)
- ✅ Application logs (`%LOCALAPPDATA%\AlloFlow Admin`)
- ❓ **Docker data (you'll be prompted):**
  - **Yes**: Removes all Docker containers, AI models, PocketBase database, student data
  - **No**: Keeps server data for future reinstall

**Complete Data Removal:**
If you want to completely remove all traces of AlloFlow:
```powershell
# Run as Administrator in PowerShell
# Stop Docker services
docker compose -f "C:\Program Files\AlloFlow Admin\docker\docker-compose.yml" down -v

# Remove application data
Remove-Item -Recurse -Force "$env:APPDATA\AlloFlow Admin"
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\AlloFlow Admin"

# Remove server data
Remove-Item -Recurse -Force "C:\Program Files\AlloFlow Admin"
```

---

## macOS Installation

### Installation Process
1. Open `AlloFlow-Admin.dmg`
2. Drag **AlloFlow Admin** to **Applications** folder
3. Launch from Applications folder
4. Complete setup wizard (Docker, GPU detection, AI configuration)

### macOS Uninstallation

**Standard Uninstall (App Only):**
1. Open **Finder** → **Applications**
2. Drag **AlloFlow Admin** to **Trash**
3. Right-click Trash → **Empty Trash**

**This leaves behind:**
- `~/Library/Application Support/AlloFlow Admin/` (settings, logs)
- `~/Library/Preferences/com.alloflow.admin.plist` (preferences)
- `~/Library/Logs/AlloFlow Admin/` (crash logs)
- Docker containers and AI models (still running)

**Complete Uninstall (App + All Data):**

Run the provided uninstall script:
```bash
cd /Applications/AlloFlow\ Admin.app/Contents/Resources
./uninstall.sh
```

Or manually:
```bash
#!/bin/bash

echo "🗑️  Uninstalling AlloFlow Admin completely..."

# Stop Docker services
docker compose -f ~/docker-compose.yml down -v 2>/dev/null

# Remove application
sudo rm -rf /Applications/AlloFlow\ Admin.app

# Remove application support files
rm -rf ~/Library/Application\ Support/AlloFlow\ Admin
rm -rf ~/Library/Preferences/com.alloflow.admin.plist
rm -rf ~/Library/Logs/AlloFlow\ Admin
rm -rf ~/Library/Caches/com.alloflow.admin

# Remove server data
rm -rf ~/AlloFlow/docker
rm -f ~/AlloFlow/ai-config.json
rm -f ~/AlloFlow/setup-complete.lock
rm -f ~/AlloFlow/.env

# Remove Docker volumes (AI models, PocketBase DB)
docker volume rm $(docker volume ls -q | grep alloflow) 2>/dev/null

echo "✅ AlloFlow Admin completely removed"
echo "Note: Docker Desktop itself is not removed (may be used by other apps)"
```

---

## Linux Uninstallation

### AppImage
1. Simply delete the `.AppImage` file
2. Remove application data:
```bash
rm -rf ~/.config/AlloFlow\ Admin
rm -rf ~/.local/share/AlloFlow\ Admin
rm -rf ~/.cache/AlloFlow\ Admin
```

### Complete Removal (including Docker data)
```bash
#!/bin/bash

# Stop Docker services
docker compose -f ~/AlloFlow/docker/docker-compose.yml down -v

# Remove application data
rm -rf ~/.config/AlloFlow\ Admin
rm -rf ~/.local/share/AlloFlow\ Admin
rm -rf ~/.cache/AlloFlow\ Admin

# Remove server data
rm -rf ~/AlloFlow

echo "AlloFlow Admin completely removed"
```

---

## Data Preservation vs Complete Removal

### Preserve Data (Recommended for Reinstalls)
**Use case:** Upgrading to new version, testing different configurations

**Keep:**
- PocketBase database (student accounts, progress)
- Downloaded AI models (~5-10GB)
- Student work and generated content

**How:** Choose "No" when prompted during uninstall, or just remove the app

### Complete Removal
**Use case:** Migrating to different server, decommissioning

**Remove:**
- All application files
- All configuration
- All Docker containers and volumes
- All AI models
- All student data

**How:** Choose "Yes" when prompted, or run complete removal scripts above

---

## Troubleshooting Uninstall

### Windows: Uninstaller won't run
```powershell
# Force remove via PowerShell (run as Administrator)
$uninstallPath = (Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AlloFlow Admin").UninstallString
Start-Process $uninstallPath -Wait
```

### macOS: Permission denied
```bash
# Grant full disk access
sudo rm -rf /Applications/AlloFlow\ Admin.app
sudo rm -rf ~/Library/Application\ Support/AlloFlow\ Admin
```

### Docker containers still running
```bash
# Windows (PowerShell)
docker ps -a | Select-String "alloflow" | ForEach-Object { docker rm -f $_.ToString().Split()[0] }

# macOS/Linux
docker ps -a | grep alloflow | awk '{print $1}' | xargs docker rm -f
docker volume prune -f
```

---

## Reinstallation After Uninstall

### Quick Reinstall (Data Preserved)
1. Run installer
2. Setup wizard detects existing configuration
3. Skips Docker/model download steps
4. Uses existing PocketBase database

### Fresh Install (After Complete Removal)
1. Run installer
2. Complete full setup wizard
3. Re-download AI models (~5-10GB)
4. Recreate admin account
5. Student accounts need to be recreated

---

## Support

If you encounter issues during uninstallation:
- Check logs: Windows (`%LOCALAPPDATA%\AlloFlow Admin\logs`), macOS (`~/Library/Logs/AlloFlow Admin`)
- GitHub Issues: https://github.com/yourusername/AlloFlow/issues
- Email: support@alloflow.com
