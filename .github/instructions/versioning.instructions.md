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

**BEFORE** running build:

- [ ] **Identify change type**: Bug vs New Feature
- [ ] **Check current version**: Look at `admin/package.json` `"version"` field
- [ ] **Increment version ONLY IF**:
  - [ ] Bug fix within same phase → Increment patch (0.1.0 → 0.1.1)
  - [ ] New feature completing next phase → Increment minor (0.1.x → 0.2.0)
- [ ] **Update in TWO places**:
  1. `admin/package.json` - `"version"` field
  2. Session notes (`.memories/session/`) - document what was changed
- [ ] **Then build**: `npm run dist`

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
