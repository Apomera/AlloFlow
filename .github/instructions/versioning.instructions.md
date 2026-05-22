---
name: versioning
description: "Versioning rules for AlloFlow admin project. Use when: making code changes, building installers, or completing iterations"
applyTo: ["admin/**", "admin/package.json"]
---

# ⚠️ CRITICAL: Read Local App Architecture FIRST

**BEFORE making ANY AI provider, TTS, or agent changes:**
→ Review: `memories/repo/alloflow-local-app-architecture.md`

This documents the ACTUAL port layers, AIProvider dispatch, token handling, and common mistakes.
Glossing over this has caused 3 broken builds due to routing to non-existent proxy endpoints.

---

# AlloFlow Admin - Versioning Rules

Uptick to x.x.x+1 for each bug fix, or minor change. This ensures clear version history and helps users track updates effectively.

Uptick to x.x+1.0 for new features or significant changes that don't break backward compatibility. This signals meaningful improvements while maintaining stability.

**BEFORE** running build (only when all phases are complete):

## Keep in Sync with Upstream Repository

**GitHub upstream**: https://github.com/Apomera/AlloFlow

To prevent divergence from the main branch, maintain synchronization with the original repo regularly.

### When to Sync

- **Daily** or after each major task completion (3+ commits)
- **Before starting large new features** — pull upstream changes to avoid conflicts
- **After upstream releases** — check for critical fixes or API changes
- **If conflicts arise** — resolve and merge carefully to preserve both branches' improvements

### Sync Procedure

```powershell
# 1. Set upstream remote (one-time setup)
git remote add upstream https://github.com/Apomera/AlloFlow.git

# 2. Fetch latest from both remotes
git fetch origin
git fetch upstream

# 3. Review upstream main branch
git log --oneline origin/main..upstream/main | head -20

# 4. Merge upstream changes into your working branch
git merge upstream/main --no-ff

# 5. If conflicts occur:
# - Resolve conflicts manually in conflicting files
# - Prefer YOUR changes for admin-specific code (admin/, versioning)
# - Prefer UPSTREAM for core web app (AlloFlowANTI.txt, build.js, prismflow-deploy/)
# - Test after merge before pushing

# 6. Commit merge and push
git add .
git commit -m "chore: sync with upstream main"
git push origin
```

### Conflict Resolution Strategy

| File Path | Upstream Win | Local Win | Merge Strategy |
|-----------|--------------|-----------|-----------------|
| `AlloFlowANTI.txt` (web app source) | ✅ | — | Take upstream if in doubt; local only for critical fixes |
| `admin/**` (Electron admin app) | — | ✅ | Keep local unless critical upstream bug |
| `prismflow-deploy/**` (React build) | ✅ | — | Sync with upstream (auto-generated) |
| `build.js` | ✅ | — | Take upstream unless modifying for admin-specific build |
| `.github/` (workflows, instructions) | — | ✅ | Keep local (customized for this workflow) |
| `package.json` (root) | ✅ | — | Merge both dependency lists; test after |

### Post-Merge Checklist

After merging upstream changes:

- [ ] Run `npm install` to sync dependencies
- [ ] Test core web app: `npm run build` in `prismflow-deploy/`
- [ ] Test admin app: `npm run dev` in `admin/`
- [ ] Check for version bumps in `admin/package.json` (align if needed but keep local iterative version)
- [ ] Run tests if available: `npm test`
- [ ] Commit all verified changes before continuing with new features

### When to Branch

If upstream diverges significantly or introduces breaking changes:

```bash
# Create a feature branch to test upstream merge
git checkout -b sync/upstream-main
git merge upstream/main
# Test thoroughly, resolve conflicts, then decide:
# - Merge to main if stable
# - Cherry-pick specific commits if full merge causes issues
```

## Build Order: Tests BEFORE Installer

Always run the full Playwright suite **before** building the installer. A passing test run is a gate — never ship an installer that hasn't been validated.

```powershell
# 1. Compile the local app
node local_build.js

# 2. Run ALL Playwright tests (125+) — must pass
node scripts/test_local_app.js --verbose

# 3. Only after 100% pass → build installer
cd admin && npm run dist
```

❌ **WRONG**: Code fix → `npm run dist` → test later (or never)
✅ **RIGHT**: Code fix → `node local_build.js` → `node scripts/test_local_app.js --verbose` → all green → `npm run dist`

---

## Anti-Pattern: Multiple Changes Without Increment

❌ **WRONG**:
- Implement Docker detection (v0.1.0)
- Implement folder browsing (v0.1.0 - ERROR: still same version)
- Build multiple times without version bump

✅ **RIGHT**:
- Implement Docker detection → v0.1.0 → Build
- Implement folder browsing → v0.1.1 → Build

## Files to Update

When incrementing version:

```
admin/package.json
  "version": "x.y.z"
```

That's the **only** file that needs updating (electron-builder picks it up automatically).

## Quick Reference

```bash
# View current version
cat admin/package.json | grep "version"

# After making changes, BEFORE building:
# 1. Update package.json version
# 2. Commit if using git
# 3. Run: npm run dist
```
