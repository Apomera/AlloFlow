---
name: versioning
description: "Versioning rules for AlloFlow admin project. Use when: making code changes, building installers, or completing iterations"
applyTo: ["admin/**", "admin/package.json"]
---

# AlloFlow Admin - Versioning Rules

## Version Increment Rules (Semantic Versioning)

Current version: **v0.1.x** (Phase 0 iterations)

### When to Increment

| Change Type | Action | Example |
|-------------|--------|---------|
| **Bug fix** within same phase | Patch: `0.1.0` → `0.1.1` → `0.1.2` | Docker detection improvements |
| **New feature** completing next phase | Minor: `0.1.x` → `0.2.0` | Phase 1: Dashboard skeleton (new version) |
| **Major restructure** or breaking changes | Major: `1.0.0` (future) | Only after Phase 3+ complete |

### Current Phase Info

**Phase 0** (v0.1.x): Setup Wizard with 4 deployment types
- Substeps:
  1. Deployment selection UI ✅
  2. Configuration forms ✅
  3. Docker detection ✅
  4. Folder browsing ✅

Each completed substep = patch increment (v0.1.0 → v0.1.1 → v0.1.2, etc.)

## Checklist: After Making Code Changes

**DO NOT build the installer during active development phases.**
The installer is only built once all phases in the current roadmap milestone are fully implemented and tested.

**BEFORE** running build (only when all phases are complete):

- [ ] **Confirm all phases done**: Every task in the milestone is implemented and tested
- [ ] **Identify version increment**: Bug fix → patch, new phase milestone → minor
- [ ] **Check current version**: Look at `admin/package.json` `"version"` field
- [ ] **Update version**: `admin/package.json` `"version"` field only
- [ ] **Then build**: `npm run dist` in `admin/`

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

## Anti-Pattern: Multiple Changes Without Increment

❌ **WRONG**:
- Implement Docker detection (v0.1.0)
- Implement folder browsing (v0.1.0 - ERROR: still same version)
- Build multiple times without version bump

✅ **RIGHT**:
- Implement Docker detection → v0.1.0 → Build
- Implement folder browsing → v0.1.1 → Build

## Phase Roadmap

- **v0.1.x** (Phase 0): Setup Wizard ← Current
- **v0.2.0** (Phase 1): Dashboard Skeleton
- **v0.3.0** (Phase 2): Docker Container Listing
- **v0.4.0** (Phase 3): Start/Stop Containers
- **v0.5.0** (Phase 4): Settings UI
- **v0.6.0** (Phase 5): Model Management
- **v0.7.0** (Phase 6): Monitoring Dashboard
- **v0.8.0** (Phase 7): Security & Auth

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
