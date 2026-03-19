# AlloFlow Admin Center - Windows Setup Guide

## Quick Start

### For Standard Local Use (Single Machine)
Just run the installer normally - no admin required:
1. Double-click: `AlloFlow Admin Setup 0.2.0.exe`
2. Follow the 7-step wizard
3. Done!

### For Network Classroom Access (Multi-Machine)

For students on **other machines** to connect to your AI server:

1. **Right-click** the installer: `AlloFlow Admin Setup 0.2.0.exe`
2. Select **"Run as administrator"**
3. Follow the 7-step setup wizard
4. Network firewall will auto-configure for port 8000

> **Why?** Network access requires Windows firewall configuration, which needs admin privileges.

---

## What You'll See

### Admin Status Detection

The setup wizard **automatically checks** if you have admin privileges and shows:

**🟠 If NOT running as admin:**
```
Administrator privileges required:
For complete setup including network firewall access, 
close this and right-click the installer, then select 
"Run as administrator". This ensures students can 
connect to the AI server.
```
👉 **Action needed:** Close and restart with admin

**🟢 If running AS admin:**
```
Administrator privileges confirmed:
Network firewall will be automatically configured 
for student network access.
```
👍 **You're all set** - network access will work automatically

### Setup Wizard Steps (1-7)

1. **Deployment Mode** - New server or join cluster?
2. **Docker Check** - Is Docker installed?
3. **Hardware Detection** - GPU and cores detected
4. **AI Backend** - Local, cloud, or hybrid AI?
5. **Network Config** - Server IP assignment
6. **Model Selection** - Which AI models to download
7. **Installation** - Downloads and configuration (~5-15 min)

---

## Firewall Configuration Explained

**What gets configured (admin only):**
- Rule Name: `AlloFlow-Student-Access`
- Protocol: TCP
- Port: 8000
- Access: Allowed from local subnet (10.x.x.x, 192.168.x.x, 172.16-31.x.x)

**If you DON'T run as admin:**
```
✅ Local access works     - Apps on same machine can connect
❌ Network access blocked - Students on other machines cannot connect
```

**If you DO run as admin:**
```
✅ Local access works      - Apps on same machine can connect  
✅ Network access works    - Students on other machines CAN connect
```

---

## How to Access Your Server

## Troubleshooting

### "Still missing admin privileges?"
If you see the admin notice but aren't sure if you started with admin:
1. Close AlloFlow Admin Center
2. **Right-click** `AlloFlow Admin Setup 0.2.0.exe`
3. Select **"Run as administrator"** 
4. Run setup again (you can re-run with the same settings)

### "Firewall configuration failed"
This means setup ran without admin privileges:
1. Close the setup
2. Follow "Still missing admin privileges?" above
3. Run setup again (the installer will skip already-configured steps)

### "Students can't connect over network"
1. Verify firewall rule was created (see "Firewall Configuration" above)
2. Verify server IP is correct
3. Verify all machines are on the same network
4. Temporarily disable firewall to test (then re-enable and investigate rule)

### "Something else isn't working?"
Check the logs:
- Windows Event Viewer → Windows Logs → Application
- AlloFlow logs: `%LOCALAPPDATA%\alloflow-admin\`
- Docker Desktop logs (if using Docker)

---

## Advanced: Re-running Setup

You can run setup multiple times:
- Settings won't be overwritten unless you change them
- Already-downloaded models won't re-download
- Firewall rule won't duplicate (updates if it exists)

**To reset completely:**
1. Uninstall: Settings → Programs → Programs and Features → AlloFlow Admin
2. Delete user data: `%LOCALAPPDATA%\alloflow-admin\`
3. Reinstall

---

## Important Notes

- **Admin is only needed during setup** - Regular operation doesn't require admin privileges
- **One-time firewall configuration** - After setup, the firewall rule persists permanently
- **Network access is optional** - Apps running on the same machine can always connect, regardless of firewall

---

## Need Help?

- 📖 Read the comprehensive manual: `AllowFlow v0.9 Comprehensive User Manual.txt`
- 🐳 Docker issues? Check: `docker/README.md`
- 🤖 AI model issues? See: `deployment guide`
