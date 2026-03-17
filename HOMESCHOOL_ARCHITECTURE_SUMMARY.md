# AlloFlow Homeschool - Architecture Summary

## Quick Overview

**AlloFlow Homeschool** is a **separate product** (different .exe/.dmg) that is completely independent from the main AlloFlow platform, while reusing the same backend infrastructure.

---

## Release Structure

### Main AlloFlow Platform
```
AlloFlow-Student.exe/dmg        ← For students in classrooms
AlloFlow-Teacher.exe/dmg        ← For teachers in schools
Admin Center (Electron app)     ← Separate admin interface for schools
```

### AlloFlow Homeschool Platform (NEW)
```
AlloFlow-Homeschool-Parent.exe/dmg       ← Parent's app (main download)
   ├─ Dashboard (view lessons, progress)
   ├─ Lessons (create/import)
   ├─ Reports (tracking, exports)
   └─ Settings (family setup, AI config, + ★ BUILD CHILD APPS)

Built by Parents:
   ├─ AlloFlow-Homeschool-Child-Sarah.exe/dmg   ← Auto-configured for Sarah
   ├─ AlloFlow-Homeschool-Child-Emma.exe/dmg    ← Auto-configured for Emma
   └─ (Auto-linked to parent via PocketBase)
```

---

## Key Architecture Decisions

### 1️⃣ Separate Executables
- **NOT**: Added as a role in the main AlloFlow app
- **YES**: Separate .exe/.dmg download, like Student/Teacher apps
- **Why**: Keeps main platform focused on schools; homeschool is its own thing

### 2️⃣ Unified Backend
- **NOT**: Separate PocketBase instances
- **YES**: Same PocketBase cluster for all products
- **Why**: Shared infrastructure, but data is logically scoped by collection (homeschool_families, homeschool_lessons, etc.)

### 3️⃣ Admin Built Into App
- **NOT**: Separate admin center needed
- **YES**: Settings tab inside the parent app handles all admin functions (family setup, AI config, backups, etc.)
- **Why**: Parents don't need a separate application; everything is in one place

### 4️⃣ Code Reuse
- **NOT**: Rewriting UI from scratch
- **YES**: Copy key components from main app (LessonCard.jsx, ProgressViewer.jsx, ReportGenerator.jsx)
- **Why**: These components work identically; no reason to reinvent

### 5️⃣ Self-Hosted Option
- **NOT**: Cloud-only deployment
- **YES**: Optional Docker setup for privacy-conscious parents
- **Why**: Parents control their own data if they choose

---

## Directory Structure

```
AlloFlow (Project Root)
├── /client/                    (Main AlloFlow - Student/Teacher)
│   ├── src/pages/StudentDashboard.jsx
│   ├── src/pages/TeacherDashboard.jsx
│   ├── main.js (Electron main process)
│   └── package.json
│
├── /admin/                     (Admin Center - School focus)
│   ├── src/pages/Dashboard.jsx
│   ├── src/pages/Clusters.jsx
│   ├── src/pages/Users.jsx
│   └── main.js (Electron main process)
│
├── /client-homeschool/         (NEW - Parent App)
│   ├── src/
│   │   ├── App.jsx             (Always shows parent dashboard)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   (Parent view: lessons, progress, quick stats)
│   │   │   ├── Lessons.jsx     (Create/import lessons)
│   │   │   ├── Reports.jsx     (Analytics, PDF export)
│   │   │   └── Settings.jsx    (★ Family setup, AI config, BUILD CHILD APPS)
│   │   ├── components/
│   │   │   ├── BuildChildApp.jsx      (★ Child builder UI + progress)
│   │   │   ├── LessonImporter.jsx     (NEW)
│   │   │   ├── AIAssistant.jsx        (NEW)
│   │   │   ├── ProgressChart.jsx      (NEW)
│   │   │   ├── ChildSelector.jsx      (NEW)
│   │   │   └── shared/
│   │   │       ├── LessonCard.jsx            (copied from /client/)
│   │   │       ├── ProgressViewer.jsx       (copied from /client/)
│   │   │       └── ReportGenerator.jsx      (copied from /client/)
│   │   └── styles/
│   │       └── homeschool.css   (Homeschool branding)
│   ├── main.js
│   ├── preload.js (IPC handlers for buildChildApp)
│   ├── package.json
│   └── electron-builder.yml
│
├── /client-homeschool-child/   (NEW - Child App - separate build target)
│   ├── src/
│   │   ├── App.jsx             (Read env vars: CHILD_ID, FAMILY_ID, SERVER_URL)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   (Assigned lessons only)
│   │   │   ├── ActivityView.jsx (Do the lesson/activity)
│   │   │   └── ProgressView.jsx (View grades/mastery)
│   │   └── components/
│   │       ├── LessonCard.jsx  (Minimal - read-only)
│   │       └── ProgressViewer.jsx (Child's scores)
│   ├── main.js (Child-specific Electron main)
│   ├── preload.js
│   ├── package.json
│   └── electron-builder.yml    (Different app name, icon)
│
└── /pocketbase/                (Shared backend)
    └── Database (same for all products, scoped by collection)
```

---

## What Goes In Each Place

### Main AlloFlow App (`/client/`)
- **User Type**: Students in classrooms
- **UI Focus**: Join sessions, complete activities, view grades
- **Role**: Built-in "student" role
- **Admin**: Not needed (teachers use admin center)

### Admin Center (`/admin/`)
- **User Type**: School admins, district admins, teachers managing classes
- **UI Focus**: Cluster management, user management, teacher dashboards
- **Role**: Built-in admin interface (Electron app)
- **Separate from**: Main client app

### Homeschool App (`/client-homeschool/`)
- **User Type**: Parents managing homeschool
- **UI Focus**: Parent dashboard, lesson creation, progress tracking
- **Admin**: Settings tab (built-in) - no separate admin app needed
- **Role**: "parent_homeschool" (scoped to homeschool collections)

---

## Admin Functions Comparison

### School Admin Center (Separate App)
```
┌─ Admin Center ──────────────┐
│ [Cluster Config]            │
│ [User Management]           │
│ [AI Backend Configuration]  │
│ [Reports & Analytics]       │
│ [Docker/Deploy]             │
└─────────────────────────────┘
```

### Homeschool Settings (Built Into App Tab)
```
┌─ Homeschool App Settings Tab ─┐
│ [Family & Children]           │
│ [AI Provider Config]          │
│ [Server URL (Cloud/Local)]    │
│ [Database Backup/Restore]     │
│ [App Preferences]             │
└───────────────────────────────┘
```

**Key Difference**: Homeschool parents don't need or have access to cluster-level configs or multi-user management. They just manage their family.

---

## Data Model

### Main AlloFlow Collections
```
users (role: teacher, student, admin, independent)
classes (classroom rosters)
lessons (shared by teacher)
progress (student progress)
```

### Homeschool Collections (NEW)
```
homeschool_families (parent → [children])
homeschool_children (child profile, learning style, interests)
homeschool_lessons (parent-created for their children)
homeschool_progress (child's completion & mastery)
oauth_tokens (encrypted AI provider credentials)
```

**Isolation**: Main app users never see homeschool_* collections. Homeschool app only sees scoped data for their family.

---

## Build Outputs

### Build Process
```bash
# Main AlloFlow (existing)
cd /client && npm run build:student     # → AlloFlow-Student.exe/dmg
cd /client && npm run build:teacher     # → AlloFlow-Teacher.exe/dmg

# Homeschool (new - separate build)
cd /client-homeschool && npm run build:homeschool
  # → AlloFlow-Homeschool-Parent.exe/dmg
```

### Binary Sizes
- AlloFlow-Student.exe: ~90 MB
- AlloFlow-Teacher.exe: ~90 MB
- **AlloFlow-Homeschool-Parent.exe: ~95 MB** (slightly larger due to AI components)

---

## Authentication Flow

### Main AlloFlow
```
User downloads Student.exe/Teacher.exe
   ↓
App asks: Server URL?
   ↓  
User enters cluster URL
   ↓
App connects to PocketBase
   ↓
Login with role: student/teacher/independent
```

### Homeschool
```
User downloads Homeschool-Parent.exe
   ↓
App checks: First time?
   ↓
YesYes → Onboarding Wizard (family name, children, AI setup)
   ↓
FirstYes → Onboarding completes, stores config locally
   ↓
App connects to PocketBase (cloud or local)
   ↓
Logs in as role: parent_homeschool (scoped to family)
   ↓
Dashboard loads with that family's data
```

---

## Building Child Apps (Like District Deployments)

### Parent Builds Apps for Children

Parent app includes "Build Child Apps" feature in Settings tab (similar to how admin center builds Student/Teacher packages):

```
Parent in Settings → Build Child Apps:

1. Select child: [Sarah ▼]
2. Choose platform: ○ Windows (.exe)  ○ macOS (.dmg)
3. Optional: [x] Kiosk Mode (full screen, no escape)
4. Click [Build Child App]
5. Auto-links to parent via PocketBase (config baked in)
6. Progress bar shows build steps
7. [Download] button appears when ready
8. Parent gives file to child (USB, email, cloud, etc.)

Result: AlloFlow-Homeschool-Child-Sarah.exe/dmg (~95 MB)
        Auto-configured with:
        - CHILD_ID=sarah_uuid (who this app logs in as)
        - FAMILY_ID=family_uuid (which family owns it)
        - SERVER_URL=https://cluster.alloflow.com (parent's server)
```

### How Child Apps Work

Child app is minimal Electron + React with limited UI:

```
Child runs app:
  ↓
App reads embedded env vars (CHILD_ID, FAMILY_ID, SERVER_URL)
  ↓
App logs in as: child_homeschool role (child_uuid)
  ↓
Fetches only Sarah's lessons from PocketBase:
  GET /api/homeschool/children/sarah_uuid/lessons
  ↓
Shows Dashboard with assigned lessons
  ↓
When Sarah clicks lesson: ActivityView (do quiz/activity)
  ↓
Progress auto-tracked when activities complete
  ↓
Parent sees Sarah's progress in parent app dashboard
```

### Auto-Linking Child ↔ Parent

Child app is automatically linked because:

1. **Same PocketBase**: Both parent & child connect to same server
2. **Family scope**: homeschool_families.id is baked into both
3. **Child ID**: Only this child's data visible in child app
4. **Role-based rules**: PocketBase enforces permissions (child only sees own data)

Example:
```
Parent app (Electron):
  - Logs in as: parent_homeschool
  - Scoped to: homeschool_families.id (Smith family)
  - Can see: Sarah's data, Emma's data, all lessons

Sarah's child app (Electron):
  - Logs in as: child_homeschool (Sarah)
  - Scoped to: homeschool_children.id (Sarah only)
  - Can see: Only Sarah's lessons and progress
  - Cannot see: Emma's data, parent's settings
```

### Multiple Child Apps

Parent can build separate apps for each child:

```
Parent creates: Sarah (Grade 4), Emma (Grade 2)

Settings → Build Child Apps:
  1. Build for Sarah → Windows (.exe) → AlloFlow-Homeschool-Child-Sarah.exe
  2. Build for Emma → macOS (.dmg) → AlloFlow-Homeschool-Child-Emma.dmg

Distribute:
  - Sarah's app goes to Sarah's Windows laptop
  - Emma's app goes to Emma's iPad (macOS)
  - Each child sees only their own lessons
  - Parent sees both in dashboard
```

---

## AI Integration (ChatGPT/Gemini/Claude)

### How It Works
1. Parent clicks [Connect ChatGPT] in Settings
2. Browser opens OAuth consent screen
3. Parent logs with their own account (e.g., admin@openai.com)
4. Grants AlloFlow permission to write/read drafts
5. OAuth token saved securely in PocketBase
6. When parent uses "Import Curriculum", app calls AI via their token
7. Results show back in the lesson builder

### Why This Model?
- ✅ Parent maintains control
- ✅ Uses their existing subscription
- ✅ No shared API keys
- ✅ Can revoke anytime
- ✅ Billing tied to them

---

## Deployment Tiers (Cloud, Hybrid, Full Local)

Parents choose their deployment based on privacy needs and hardware:

### Tier 1: Cloud Only (90% of parents) — DEFAULT
```
┌─ Parent installs AlloFlow-Homeschool-Parent.exe
├─ App connects to: https://cluster.alloflow.com
├─ Data: Encrypted on AlloFlow servers
├─ AI: ChatGPT, Gemini, Claude (latest models, fast)
├─ Hardware: None needed (internet connection only)
├─ Setup: 5 minutes
├─ Cost: ~$20-50/month (AI API + cloud storage)
└─ Backup: Automatic

Benefits: Simple, no hardware investment, latest AI
Drawback: Data on servers (encrypted)
```

### Tier 2: Hybrid (8% of parents) — BEST BALANCE
```
┌─ Parent runs GPU auto-detection setup script
├─ Script auto-detects: NVIDIA/AMD/Apple Silicon/CPU
├─ Downloads: docker-compose.universal.yml + overrides
├─ Runs: docker compose up -d
├─ Services:
│  ├─ PocketBase (database) — LOCAL ✅
│  ├─ Ollama (LLM text gen) — LOCAL, GPU-accelerated if available ✅
│  ├─ SearXNG (web search) — LOCAL ✅
│  └─ Flux (image gen) — CLOUD FALLBACK ☁️
├─ Hardware: 8-16GB RAM, 4-6 core CPU (works with any GPU: NVIDIA/AMD/Apple Silicon)
├─ Setup: Auto-detection, then 15-20 minutes
├─ Cost: Free after setup (no cloud bills)
└─ Always-on: NAS, Raspberry Pi, old laptop, desktop with GPU

Benefits: Privacy + fallback safety net, free, works with any GPU
Drawbacks: Slower text gen on CPU (faster with GPU), image gen still uses cloud

Settings toggle: "Hybrid Mode (Local data, Cloud AI backup)"

GPU Auto-Detection:
  ✅ NVIDIA: Auto-uses CUDA
  ✅ AMD: Auto-uses ROCm
  ✅ Apple Silicon: Auto-uses Metal
  ✅ CPU: Auto-fallback (slower)
```

**Hardware Examples for Hybrid:**
- Used business laptop (Core i7, 16GB RAM): $150-300
- Desktop + RTX 4060 Ti (8GB): $800-1200 (much faster AI)
- Synology NAS DS224+ (8GB): ~$400
- QNAP TS-264C3U (16GB): ~$600
- Raspberry Pi 5 (8GB): $80 + SSD (slowest but free forever)
- MacBook with Apple Silicon: Works great (Metal auto-detected)

### Tier 3: Full Local (2% of parents) — MAXIMUM PRIVACY
```
┌─ Parent runs GPU auto-detection setup script
├─ Script auto-detects: NVIDIA/AMD/Apple Silicon
├─ Downloads: docker-compose.universal.yml + full overrides
├─ Requires: GPU with 8GB+ VRAM (any vendor)
├─ Runs: docker compose up -d
├─ Services:
│  ├─ PocketBase (database) — LOCAL ✅
│  ├─ Ollama (LLM) — LOCAL GPU-ACCELERATED ✅
│  ├─ Flux (image gen) — LOCAL GPU-ACCELERATED ✅
│  ├─ SearXNG (search) — LOCAL ✅
│  └─ Piper TTS — LOCAL ✅
├─ Hardware: $500-3000+ (or rent GPU hourly)
├─ Setup: Auto-detection, then 30-45 minutes
├─ Cost: Free (one-time hardware investment)
└─ Zero cloud dependency: 100% offline capable

Benefits: Complete privacy, offline-capable, full control
Drawbacks: GPU hardware cost, setup time, slower image gen than cloud

Settings toggle: "Full Local Mode (All services local, zero cloud)"

GPU Auto-Detection:
  ✅ NVIDIA CUDA: Fully supported
  ✅ AMD ROCm: Fully supported
  ✅ Apple Silicon Metal: Fully supported (slower image gen, but works)
  ❌ CPU: Not recommended (Flux too slow)
```

**Hardware Examples for Full Local:**
- Desktop + RTX 4060 Ti (8GB): $800-1200
- Desktop + RTX 4080 (16GB): $2200-2500
- Used workstation + RTX 3080 (10GB): $600-800
- MacBook M3/M4 Pro/Max: $2000-4000 (Metal works natively)
- NVIDIA Jetson AGX Orin (12GB): $699 + SSD
- AMD Radeon RX 7900 XTX (24GB): $800-1000
- Rent GPU on Vast.ai: $0.20-1.00/hour (~$5-20/month typical usage)

### Comparison Table

| Feature | Cloud | Hybrid | Full Local |
|---------|-------|--------|-----------|
| **Data Privacy** | ⚠️ Cloud Server | ✅ Local | ✅ Completely Local |
| **Works Offline** | ❌ No | ⚠️ Partially* | ✅ Fully Offline |
| **Setup Time** | 5 min | Auto-detect + 20 min | Auto-detect + 45 min |
| **Hardware Cost** | $0 | $150-1200 | $500-4000+ (or rent hourly) |
| **Monthly Cost** | $20-50 | Free | Free |
| **Text Gen Speed** | Instant (Cloud) | ~2-10s (CPU) | <1s (GPU) |
| **Image Gen Speed** | ~30s (Cloud) | Cloud fallback | ~5-30s (GPU, size dependent) |
| **Web Search** | No | Local + Anonymous | Local + Anonymous |
| **Latest AI Models** | ✅ GPT-4, Gemini, Claude | ⚠️ Mistral, Llama 2 | ⚠️ Mistral, Llama 2 |
| **GPU Required** | No | No (Optional) | **Yes** (8GB+ VRAM) |
| **Supported GPUs** | N/A | NVIDIA/AMD/Apple Silicon | NVIDIA/AMD/Apple Silicon |
| **Auto-Detection** | N/A | ✅ Auto-detects GPU type | ✅ Auto-detects GPU type |
| **PC Must Stay On** | N/A | Yes† | Yes† |

*Hybrid offline: Lessons/quizzes work, vocabulary lookup works, but AI features (lesson generation, image creation) need fallback to cloud  
†Or use always-on NAS/server/cloud GPU

### Selection Guide

**"I just want it to work"**  
→ Cloud (Default) — No setup, no hardware cost, simplest

**"I care about data privacy + have basic tech skills"**  
→ Hybrid — Home NAS/laptop, moderate cost, good balance

**"I want maximum privacy + have a GPU"**  
→ Full Local — Complete independence, zero cloud, expensive

### Fallback Strategy (Graceful Degradation)

When local service unavailable, app seamlessly falls back:

```javascript
// Text generation: Try local first, cloud fallback
async function generateLesson(prompt) {
  try {
    return await ollama.generate(prompt); // Local
  } catch {
    return await chatGpt.generate(prompt); // Fallback
  }
}

// Image generation: Try local first, cloud fallback  
async function generateImage(prompt) {
  try {
    return await flux.generate(prompt); // Local (Full Local only)
  } catch {
    return await gemini.generate(prompt); // Fallback
  }
}

// Search: Always local + anonymous (no fallback needed)
async function search(query) {
  return await searxng.search(query); // Always local
}
```

This means:
- **Cloud parents**: Always works (no fallback needed)
- **Hybrid parents**: Get privacy by default, cloud safety net if needed
- **Full Local parents**: Completely independent, zero cloud dependency
- **None are blocked**: Degraded gracefully, never broken

### Docker Compose Files (To Be Created)

```
/docker/
├── docker-compose-cloud.yml     (reference only — no local services needed)
├── docker-compose-hybrid.yml    (PocketBase + Ollama + SearXNG)
└── docker-compose-full.yml      (All services including Flux)
```

Each includes:
- Documented hardware requirements
- GPU configuration (Full Local)
- Healthchecks and logging
- Data volume persistence
- Network configuration
- Upgrade/downgrade instructions

---

## Timeline

| Phase | Start | Duration | Output |
|-------|-------|----------|--------|
| **Phase 2** | Complete | n/a | Client Package Builder ready |
| **3a** | Week 10 | 2 weeks | Homeschool app scaffold + basic UI |
| **3b** | Week 12 | 2 weeks | AI integration (OAuth) + lesson generator |
| **3c** | Week 14 | 2 weeks | Progress tracking + PDF reports |
| **3d** | Week 16 | 2 weeks | Production builds (.exe/.dmg) + docs |
| **Launch** | Week 18 | | AlloFlow Homeschool v1.0 ready |

---

## What's Different from Original Plan

### Original (Integrated into main client)
- Homeschool as a "role" option in main app
- Would appear in login alongside Student/Teacher
- Admin functions still separate
- One code base, multiple modes

### Revised (Separate Product)
- ✅ Homeschool as entirely separate app/product
- ✅ Different .exe/.dmg, different branding
- ✅ Admin functions built into Settings tab (not separate app)
- ✅ Different directory (`/client-homeschool/`)
- ✅ Keeps main platform focused on schools
- ✅ Clearer market positioning

---

## Why This Matters

1. **Clarity**: Main AlloFlow = schools. Homeschool = separate product. No confusion.
2. **Simplicity**: Parents don't see/need school features. Teachers don't see/need homeschool features.
3. **Admin UX**: Parents avoid managing cluster-level configs. They just manage their family in Settings.
4. **Marketing**: Can target homeschool community with dedicated product, messaging, marketing.
5. **Scaling**: Each product can evolve independently (homeschool might add transcript generation; school might add SIS integration).

---

**Ready to proceed with Phase 3a?** Confirm and we'll begin building the Homeschool app scaffold.
