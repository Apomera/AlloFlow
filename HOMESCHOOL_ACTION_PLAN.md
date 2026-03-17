# AlloFlow Homeschool Module - Action Plan

**Status**: Planning Phase (Phase 3)  
**Target User**: Parents managing homeschool education  
**Integration Point**: After Phase 2 Week 8-9 (Client Package Builder)  
**Scope**: Architectural planning, UX design, implementation strategy (no code yet)

---

## 1. Vision & Objectives

### Problem Statement
Parents homeschooling their children need a way to:
- Organize and manage their child's learning plans
- Track progress across subjects/activities
- Leverage AI tools they already have access to (ChatGPT, Gemini, Claude)
- Avoid vendor lock-in by self-hosting
- Create custom lesson plans without technical expertise

### Key Objectives
1. **Simple Parent UX** - Non-technical parents can set up in <5 minutes
2. **AI-First Design** - Leverage ChatGPT/Gemini/Claude via OAuth (no API keys required)
3. **Self-Hosted Option** - Parents can run locally or on-premises
4. **Child Progress Tracking** - Visualize learning outcomes, time spent, mastery levels
5. **Lesson Plan Builder** - Import existing curricula or create custom plans
6. **Minimal Data Entry** - Copy/paste lesson plans, AI summarizes/structures them
7. **Not a Complete Rewrite** - Reuse existing AlloFlow components (sessions, quizzes, reporting)

---

## 2. Proposed Architecture

### 2.1 High-Level Design (Separate Product)

```
AlloFlow Platform (Main - School District Focus):
┌─────────────────────────────────────────────────┐
│    AlloFlow Student.exe / .dmg                   │
│    AlloFlow Teacher.exe / .dmg                   │
│                                                 │
│  └─→ Connects to cluster PocketBase             │
│  └─→ Designed for classrooms, schools, districts
└─────────────────────────────────────────────────┘

AlloFlow Homeschool Platform (NEW - Separate Release):
┌─────────────────────────────────────────────────┐
│    AlloFlow Homeschool Parent.exe / .dmg         │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │     Dashboard Tab (Main View)            │   │
│  │  • Child cards / overview                │   │
│  │  • Weekly lesson schedule                │   │
│  │  • Quick stats (mastery, time spent)     │   │
│  └──────────────────────────────────────────┘   │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐   │
│  │    Lessons Tab                           │   │
│  │  • Create lessons                        │   │
│  │  • Import curriculum (with AI)           │   │
│  │  • Manage assignments                    │   │
│  └──────────────────────────────────────────┘   │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐   │
│  │    Reports Tab                           │   │
│  │  • View child progress                   │   │
│  │  • Analytics & mastery tracking          │   │
│  │  • PDF export for records                │   │
│  └──────────────────────────────────────────┘   │
│                      ↓                          │
│  ┌──────────────────────────────────────────┐   │
│  │    Settings Tab (Admin Functions IN-APP)  │   │
│  │  ★ BUILD CHILD APPS (like Student/Teacher) │   │
│  │  • Family & Children setup                │   │
│  │  • AI Provider config (ChatGPT/Gemini)   │   │
│  │  • Build child.exe / child.dmg           │   │
│  │  • Database backup & restore             │   │
│  │  • Custom server URL (optional)          │   │
│  │  • Self-host mode toggle                 │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  Child Apps (Built by Parent):                 │
│  ├─→ AlloFlow Homeschool Child-Sarah.exe        │
│  ├─→ AlloFlow Homeschool Child-Emma.dmg         │
│  └─→ (Auto-configured, auto-linked to parent)  │
│                                                 │
│  └─→ Can connect to main cluster OR self-host  │
│  └─→ Designed for parents, homeschooling      │
└─────────────────────────────────────────────────┘

All apps use same backend:
  └─→ PocketBase (same database)
  └─→ Same REST API
  └─→ Same authentication system
  └─→ Data scoped by: homeschool_families.id
```

### 2.2 Database Schema (New Collections)

The homeschool app uses the **same PocketBase backend** as the main client (student/teacher), but with additional collections scoped to family units instead of classes:

**homeschool_families**
```json
{
  "id": "UUID",
  "parent_id": "PocketBase user ID",
  "children": ["child_id_1", "child_id_2"],
  "family_name": "string",
  "curriculum_type": "string (e.g., 'Charlotte Mason', 'Unschooling', 'Custom')",
  "timezone": "string",
  "ai_provider": "chatgpt|gemini|claude|none",
  "ai_oauth_token": "encrypted (optional)",
  "ai_oauth_refresh": "encrypted (optional)",
  "server_url": "string (optional, for custom cluster)",
  "local_mode": "boolean (self-hosted = true)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**homeschool_children**
```json
{
  "id": "UUID",
  "family_id": "FK → homeschool_families",
  "name": "string",
  "grade_level": "K|1|2|...|12",
  "birth_date": "date",
  "learning_style": "string (visual|auditory|kinesthetic|reading-writing)",
  "interests": "string array",
  "learning_objectives": "string (custom goals)",
  "created_at": "timestamp"
}
```

**homeschool_lessons**
```json
{
  "id": "UUID",
  "family_id": "FK → homeschool_families",
  "child_id": "FK → homeschool_children",
  "title": "string",
  "subject": "math|reading|science|history|art|pe|other",
  "description": "text",
  "duration_minutes": "number",
  "due_date": "date (optional)",
  "ai_generated": "boolean",
  "status": "draft|active|completed",
  "original_content": "text (parent-pasted curriculum)",
  "structured_content": "JSON (AI-processed)",
  "created_at": "timestamp"
}
```

**homeschool_progress**
```json
{
  "id": "UUID",
  "child_id": "FK → homeschool_children",
  "lesson_id": "FK → homeschool_lessons",
  "date": "date",
  "status": "in_progress|completed",
  "time_spent_minutes": "number",
  "mastery_level": "0-100",
  "notes": "string (parent notes)",
  "created_at": "timestamp"
}
```

**oauth_tokens** (existing collection, shared)
```json
{
  "id": "UUID",
  "user_id": "FK → users",
  "provider": "chatgpt|gemini|claude",
  "access_token": "encrypted",
  "refresh_token": "encrypted (optional)",
  "expires_at": "timestamp",
  "scope": "string",
  "created_at": "timestamp"
}
```

---

## 3. Role Definition: Parent (Homeschool)

### 3.1 Permissions vs. Teacher Role

| Feature | Teacher (in School App) | Parent (in Homeschool App) |
|---------|---------|---------------------|
| Create lessons | ✅ (for class) | ✅ (for own child) |
| Manage students | ✅ (class roster) | ✅ (own children only) |
| View progress | ✅ (class-wide) | ✅ (child-specific) |
| Grade assignments | ✅ Yes | ✅ Yes |
| Share with peers | ✅ Yes | ❌ No (private family) |
| AI integration | Basic | ✅ OAuth (no API key) |
| Admin panel | Separate app (Electron) | Built into app (Settings tab) |
| Self-host | ❌ No | ✅ Yes (Docker or local) |
| Export data | Academic dashboards | Full student records for homeschool compliance |

### 3.2 Homeschool App Layout

**Main Dashboard Tab:**
```
╔════════════════════════════════════════════════════════╗
║  AlloFlow Homeschool    [Dashboard] [Lessons] [Reports] [⚙ Settings]
╚════════════════════════════════════════════════════════╝

┌─ My Family ────────────────────────────────────────────┐
│  👨‍👩‍👧 Smith Homeschool                                   │
│  📚 Curriculum: Charlotte Mason Mix                     │
│                                                        │
│  Selected Child: Sarah (Grade 4) [Switch]              │
│  ├─ 3,850 min total learning | 73% avg mastery       │
│  └─ 12 lessons completed this month                    │
└────────────────────────────────────────────────────────┘

┌─ Sarah's Week ─────────────────────────────────────────┐
│  ─────────────────────────────────────────────────────│
│  Mon | Math: Fractions      | ✓ Done | 45 min         │
│  Mon | Reading: Little House| ✓ Done | 30 min         │
│  Tue | Science: Ecosystems  | 🔄 In Progress | 15 min │
│  Tue | Art Project          | ⭕ Not started         │
│  Wed | Writing: Journal Prompt | (Not assigned yet)   │
│                                                        │
│  [Add More] [Generate with AI] [Export Week to PDF]   │
└────────────────────────────────────────────────────────┘

┌─ Quick Actions ────────────────────────────────────────┐
│  [Create Lesson] [Import Curriculum] [View Progress]  │
└────────────────────────────────────────────────────────┘
```

**Settings Tab (Admin Functions Embedded):**
```
╔════════════════════════════════════════════════════════╗
║  AlloFlow Homeschool    [Dashboard] [Lessons] [Reports] [⚙ Settings]
╚════════════════════════════════════════════════════════╝

┌─ Family Settings ──────────────────────────────────────┐
│  Family Name: Smith Homeschool                         │
│                                                        │
│  Children:                                             │
│  ├─ Sarah (Grade 4, 9 yo)  [Edit] [Remove]            │
│  ├─ Emma (Grade 2, 7 yo)   [Edit] [Remove]            │
│  └─ [Add Child]                                        │
└────────────────────────────────────────────────────────┘

┌─ BUILD CHILD APPS ★ (New) ────────────────────────────┐
│  Build child-specific apps for your kids              │
│  (Same technology as Student/Teacher deployments)     │
│                                                        │
│  Select child: Sarah (Grade 4)  ▼                     │
│                                                        │
│  Platform:                                             │
│  ○ Windows (.exe)                                     │
│  ○ macOS (.dmg)                                       │
│                                                        │
│  Kiosk Mode (full screen, no escape): ☐              │
│                                                        │
│  [Build Child App]                                     │
│  (Progress: 0%)                                        │
│                                                        │
│  Available builds:                                     │
│  ├─ AlloFlow Homeschool Child-Sarah.exe                │
│  │  Windows • 95 MB • Mar 17 2:30 PM                   │
│  │  [Download]                                        │
│  └─ AlloFlow Homeschool Child-Emma.dmg                 │
│     macOS • 85 MB • Mar 16 11:45 AM                    │
│     [Download]                                        │
└────────────────────────────────────────────────────────┘

┌─ AI Provider Setup ────────────────────────────────────┐
│  Configure your AI account (optional):                 │
│                                                        │
│  ☐ ChatGPT (OpenAI)        [Connected ✓] [Disconnect] │
│  ☐ Gemini (Google)         [Connect]                   │
│  ☐ Claude (Anthropic)      [Connect]                   │
│                                                        │
│  Default provider: ChatGPT                             │
│  Using: parent.email@gmail.com                         │
└────────────────────────────────────────────────────────┘

┌─ Server & Backup ──────────────────────────────────────┐
│  Server URL: http://localhost:8090                     │
│  [Change]                                              │
│                                                        │
│  Mode: ● Local (Self-hosted)                          │
│        ○ Cloud (Connected to cluster)                 │
│                                                        │
│  Backup & Restore:                                    │
│  Last backup: 2025-03-17 10:30 AM                     │
│  [Backup Now] [Restore from File]                     │
│  [Export Full Record]                                  │
└────────────────────────────────────────────────────────┘

┌─ About & Support ──────────────────────────────────────┐
│  Version: 1.0.0                                        │
│  [Check for Updates]                                   │
│  [Documentation] [Discord Community] [Report Issue]   │
└────────────────────────────────────────────────────────┘
```

---

## 4. Key Workflows

### 4.1 First-Time Parent Setup (5-minute onboarding)

```
Step 1: Download & Launch App
  └─> Parent downloads: AlloFlow-Homeschool-Parent.exe/dmg
  └─> Launches app for first time

Step 2: Family Information (Onboarding Wizard)
  ├─> Enter family name ("The Smiths")
  ├─> Select curriculum type (or "Custom/Mix")
  └─> Add children (names, grade levels, learning styles)

Step 3: AI Integration (Optional but Recommended)
  ├─> "Which AI tool do you use?"
  │   ├─> ChatGPT (oauth via OpenAI)
  │   ├─> Gemini (oauth via Google)
  │   └─> Claude (oauth via Anthropic)
  ├─> [Connect to ChatGPT] button
  │   └─> Launches browser window for OAuth
  │   └─> No API key required — uses parent's existing account
  └─> (Can skip and use without AI for now)

Step 4: Build First Child App
  ├─> Parent goes to Settings → "Build Child Apps"
  ├─> Select: Sarah (Grade 4)
  ├─> Choose platform: Windows (.exe) or macOS (.dmg)
  ├─> Optional: Enable Kiosk Mode
  ├─> Click [Build Child App]
  │   └─> Parent app builds: AlloFlow Homeschool Child-Sarah.exe/dmg (~95 MB)
  │   └─> Takes 1-2 minutes (first build longer)
  ├─> [Download] appears when ready
  └─> Parent transfers file to child's device (USB, email, cloud share, etc.)

Step 5: Child Installs & Launches
  ├─> Child downloads/runs installer
  ├─> App auto-launches
  ├─> Logs in or auto-authenticates
  ├─> Shows child's assigned lessons from parent
  └─> Child starts learning!

Result: Parent in Parent Dashboard + Child with own app automatically linked.
```

### 4.2 Building Child Apps (Like District Deployments)

**Parent's "Build Child Apps" Workflow (Settings Tab):**
```
1. Parent goes to Settings → "Build Child Apps"
2. Select which child: [Sarah ▼]
3. Choose platform:
   ○ Windows (.exe)
   ○ macOS (.dmg)
4. Optional: [x] Kiosk Mode (full screen, no escape key)
5. Click [Build Child App]
6. Progress bar shows build steps:
   - Preparing environment (20%)
   - Installing dependencies (40%)
   - Building React app (60%)
   - Building Electron package (100%)
7. Download link appears: "AlloFlow Homeschool Child-Sarah.exe (95 MB)"
8. Parent can now share/distribute to child

Benefits of This Model:
  ✅ Parent controls what each child gets
  ✅ Custom branding per child (optional)
  ✅ Can build for multiple children
  ✅ Auto-linked to parent's PocketBase
  ✅ Each child's progress tracked separately
  ✅ Parents can rebuild when server URL changes
```

### 4.3 Create Lesson Workflow

**Option A: From Scratch (Manual)**
```
1. Click Lessons tab
2. Click [Create Lesson]
3. Fill form:
   - Title: "Introduction to Fractions"
   - Subject: Math
   - Duration: 45 minutes
   - For: Sarah (Grade 4)
   - Description: Custom text
4. Add activities (inline editor or templates)
5. Set optional due date
6. Save as draft or assign immediately
```

**Option B: From Existing Curriculum (AI-Powered)**
```
1. Click Lessons tab
2. Click [Import Curriculum]
3. Paste content from:
   - PDF (copy-paste text)
   - Website (copy-paste article)
   - Existing lesson plan
   - Book chapter summary
3. Select target child(ren)
4. Click [AI Suggest Structure]
   └─> Calls configured AI (ChatGPT/Gemini/Claude) via OAuth
   └─> Returns:
       - Title (auto-generated)
       - Objectives (extracted or summarized)
       - Daily breakdown (e.g., "Day 1: Introduction, Day 2: Practice")
       - Assessment ideas
       - Time estimates
5. Review suggestions, edit as needed
6. Save as lesson plan
7. Assign to child (generates activity for child to complete)
```

**Option C: From Template**
```
1. Click [Browse Templates]
2. View curated templates by subject/grade
   - "Fractions (Grade 3-5)"
   - "Revolutionary War Timeline"
   - "Photosynthesis Experiment"
3. Preview and customize
4. Assign to child
```

---

## 5. Feature Breakdown

### 5.1 Parent Dashboard Components

| Component | Purpose | UI Example |
|-----------|---------|-----------|
| **Family Overview** | See all children at a glance | Card grid with child avatars |
| **Quick Stats** | Weekly/monthly learning hours, mastery % | Progress bars, sparklines |
| **Weekly Calendar** | See upcoming lessons/activities | Week view, color-coded by subject |
| **Progress Viewer** | Mastery levels, time tracking, trends | Line chart, subject breakdown |
| **Lesson Builder** | Create/edit/organize lessons | WYSIWYG editor + AI assistance |
| **Child View** | See what child sees; parent-controlled access | Role-based conditional render |
| **AI Assistant ChatBox** | Quick questions, lesson generation | Integrated chat interface |
| **Settings** | Timezone, AI provider, self-host config | Standard settings panel |
| **Export/Report** | Generate progress reports for records | PDF export, print-friendly |

### 5.2 AI Integration Strategy

**Approach: OAuth Without API Keys**

Current (❌ Not ideal for parents):
```
Admin creates API key in OpenAI dashboard
→ Adds to .env file
→ Secrets in code
→ Single shared key for all users
```

Proposed (✅ Parent-friendly):
```
Parent connects their personal AI account:
  1. Parent clicks [Connect ChatGPT]
  2. Browser opens oauth.openai.com
  3. Parent logs into their own account
  4. Parent grants AlloFlow permission to:
     - Read/write drafts
     - Generate content
     - (No billing/API access)
  5. OAuth token stored securely in PocketBase
  6. AlloFlow uses parent's token for API calls
  
Benefits:
  • Parent maintains control
  • Uses existing ChatGPT/Gemini/Claude subscription
  • No shared API key
  • Can revoke access anytime
  • Billing tied to parent's account
```

**OAuth Implementation Per Provider:**

| Provider | OAuth Flow | Scope | Token Storage |
|----------|-----------|-------|----------------|
| ChatGPT (OpenAI) | oauth.openai.com | write_drafts, read_drafts | Encrypted in PocketBase |
| Gemini (Google) | oauth.google.com | Gemini API scope | Encrypted in PocketBase |
| Claude (Anthropic) | oauth.claude.ai | Console API access | Encrypted in PocketBase |

---

## 6. Implementation Phases

### Phase 3a: Parent & Child App Scaffold (Week 10-11)

**Deliverables - Parent App:**
- [ ] Create `/client-homeschool/` directory with Electron scaffold
- [ ] Build 4 main tabs: Dashboard, Lessons, Reports, Settings
- [ ] Implement Settings tab with family/child management (replaces separate admin app)
- [ ] ★ Implement "Build Child Apps" feature in Settings:
  - [ ] Child selector (which child to build for)
  - [ ] Platform selector (Windows/macOS)
  - [ ] Kiosk mode toggle
  - [ ] Progress tracking UI
  - [ ] Download button for completed builds
  - [ ] List of available builds
- [ ] Create onboarding wizard for first-time setup
- [ ] Integrate with existing PocketBase (read homeschool_families, homeschool_children)
- [ ] Integrate ClientPackageBuilder service (copy from /admin/)

**Deliverables - Child App:**
- [ ] Create `/client-homeschool-child/` directory with Electron scaffold
- [ ] Minimal dashboard: Show assigned lessons only
- [ ] Activity/lesson view: Complete activities, see progress
- [ ] Simple progress view: View grades/mastery
- [ ] Auto-configuration: Environment vars baked in (CHILD_ID, FAMILY_ID, SERVER_URL)
- [ ] Test local build (dev mode)

**Dependencies:** Phase 2 complete (Client Package Builder infrastructure)

**Effort:** ~55 hours (45 parent + 10 child)

### Phase 3b: AI Integration & OAuth (Week 12-13)

**Deliverables:**
- [ ] OAuth setup for ChatGPT/Gemini/Claude (built into Settings)
- [ ] LessonImporter component (paste curriculum → AI structure)
- [ ] Backend API for `POST /api/homeschool/ai/generate-outline`
- [ ] AIAssistant chat interface
- [ ] Encrypted token storage for AI credentials
- [ ] Error handling for rate limits / API failures

**Dependencies:** Phase 3a complete

**Effort:** ~50 hours

### Phase 3c: Progress Tracking & Reports (Week 14-15)

**Deliverables:**
- [ ] ProgressChart component (mastery trends, time tracking)
- [ ] Reports tab with subject breakdown, mastery analytics
- [ ] PDF export for homeschool records (compliance)
- [ ] Full student record export (backup)
- [ ] Mastery auto-calculation from child's completed activities
- [ ] Weekly/monthly summaries

**Dependencies:** Phase 3a, 3b

**Effort:** ~35 hours

### Phase 3d: Production Build & Deployment (Week 16-17)

**Deliverables:**
- [ ] Windows .exe build (electron-builder, NSIS installer)
- [ ] macOS .dmg build (electron-builder, DMG config)
- [ ] Homeschool branding (icons, app name, installer screens)
- [ ] **GPU Auto-Detection System** (unified across ALL apps):
  - [ ] `gpu-detection.js` — Detects NVIDIA/AMD/Apple Silicon/CPU
  - [ ] `docker-gpu-setup.js` — Generates Docker config per GPU type
  - [ ] `docker-compose.universal.yml` — GPU-agnostic base configuration
  - [ ] Auto-detection integration in app startup (Electron main process)
  - [ ] Settings UI shows detected GPU type and capabilities
- [ ] Docker setup for three deployment tiers (GPU-agnostic):
  - [ ] Tier 1: Cloud (reference only, no Docker needed)
  - [ ] Tier 2: Hybrid (Local data + Cloud AI fallback)
  - [ ] Tier 3: Full Local (100% offline, GPU-accelerated)
- [ ] In-app deployment wizard (Settings → Server & Sync):
  - [ ] Shows detected GPU hardware
  - [ ] Recommends appropriate deployment tier
  - [ ] One-click Docker setup button
  - [ ] GPU-specific verification commands
- [ ] Deployment documentation (hardware requirements per GPU type)
- [ ] Separate installer hosting (different from main AlloFlow)
- [ ] Release notes explaining three deployment options

**Dependencies:** Phase 3a, 3b, 3c

**Effort:** ~50 hours (15+ additional for unified GPU auto-detection system across all products)

---

## 7. Homeschool App as Separate Release Bundle

### 7.1 Build & Packaging Structure

The homeschool app is **built and released separately** from the main AlloFlow platform, similar to how we package Student.exe and Teacher.exe:

```
AlloFlow Release 1.0:
├── AlloFlow-Student.exe / .dmg
├── AlloFlow-Teacher.exe / .dmg
└── (Main school district focus)

AlloFlow Homeschool Release 1.0 (NEW - Separate):
├── AlloFlow-Homeschool-Parent.exe / .dmg
└── (Homeschool-specific focus)
   └── Includes 3 main tabs:
       ├── Dashboard (lessons, progress, quick actions)
       ├── Lessons (create, import, manage)
       ├── Reports (export, progress tracking)
       └── Settings (admin functions embedded - no separate app needed)
```

**Key differences from main client:**

| Aspect | Main Client (Student/Teacher) | Homeschool App |
|--------|-------|---------|
| Build output | Student.exe, Teacher.exe | **Homeschool-Parent.exe** (single app) |
| Admin panel | Separate Electron app (admin-center) | **Built into app** (Settings tab) |
| UI design | School-focused (classrooms, rosters) | **Family-focused** (1-5 children) |
| Role selection | Login screen (student/teacher/independent) | **Built-in, auto-loads parent dashboard** |
| Backend | Connects to PocketBase cluster | **Same PocketBase**, scoped to family |
| Branding | AlloFlow (generic) | **AlloFlow Homeschool** (specific) |
| Installer | Generic | Branded for homeschool market |

### 7.2 Build Process (Similar to Student/Teacher)

```bash
# Build Homeschool App (Windows)
cd /client-homeschool
ROLE=homeschool_parent npm run build:win
# Output: dist/AlloFlow Homeschool Parent Setup 0.2.0.exe (~95 MB)

# Build Homeschool App (macOS)
ROLE=homeschool_parent npm run build:mac
# Output: dist/AlloFlow Homeschool Parent-0.2.0.dmg (~85 MB)
```

**Electron builder config:**
```yaml
# electron-builder.yml
appId: com.alloflow.homeschool
productName: AlloFlow Homeschool Parent
directories:
  buildResources: assets/homeschool
  output: dist

extraMetadata:
  role: ${ROLE}  # homeschool_parent
  appType: homeschool  # New identifier
  features:
    aiIntegration: true
    selfHost: true
    adminEmbedded: true

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/homeschool/icon-installer.ico
  installerHeaderIcon: assets/homeschool/icon-header.ico

dmg:
  icon: assets/homeschool/icon-dmg.icns
```

### 7.3 Admin Functions Embedded in App (No Separate Admin Center)

Instead of a separate Electron admin app (like admin-center/), the homeschool app includes all admin functions as a Settings tab:

**Settings Tab (Built into Parent App):**
```
┌─────────────────────────────────────────────────────┐
│ AlloFlow Homeschool   [⚙ Settings]                 │
└─────────────────────────────────────────────────────┘

┌─ Family Profile ────────────────────────────────────┐
│  Family Name: Smith Homeschool                      │
│  Curriculum Type: Charlotte Mason Mix               │
│  [Edit]                                             │
└─────────────────────────────────────────────────────┘

┌─ Manage Children ───────────────────────────────────┐
│  Sarah (Grade 4)           [Edit] [Remove]         │
│  Emma (Grade 2)            [Edit] [Remove]         │
│  [Add New Child]                                    │
└─────────────────────────────────────────────────────┘

┌─ AI Configuration ──────────────────────────────────┐
│  AI Provider: ☐ ChatGPT ☐ Gemini ☐ Claude         │
│  Current: ChatGPT (Connected ✓)                    │
│  Account: parent.email@gmail.com                   │
│  [Connect Different AI] [Disconnect]               │
│  [Test Connection]                                 │
└─────────────────────────────────────────────────────┘

┌─ Server & Sync ─────────────────────────────────────┐
│  Server Mode: ● Cloud   ○ Local Self-Hosted        │
│  Server URL: https://cluster.alloflow.io           │
│  Status: Connected ✓                               │
│  [Change Server] [Docker Setup Guide]              │
│                                                     │
│  Backup & Restore:                                 │
│  Last backup: 2025-03-17 14:30                     │
│  [Backup Now] [Restore] [Export Full Record]       │
└─────────────────────────────────────────────────────┘

┌─ App Settings ──────────────────────────────────────┐
│  Auto-launch on startup: ☑                         │
│  Dark mode: ☐                                      │
│  Show progress notifications: ☑                    │
│  Data collection for improvements: ☑              │
│  [Check for Updates]                               │
└─────────────────────────────────────────────────────┘

┌─ About & Support ───────────────────────────────────┐
│  Version: 1.0.0                                    │
│  [Help & Tutorials] [Report Issue] [Discord]       │
└─────────────────────────────────────────────────────┘
```

### 7.4 Self-Hosted Option (Three Deployment Tiers)

Parents can choose their deployment model based on privacy needs and hardware:

#### **Tier 1: Cloud Only (Default) — RECOMMENDED FOR MOST**
- ✅ Easiest setup (no Docker, no servers)
- ✅ Access from any device  
- ✅ Automatic backups & uptime
- ✅ No hardware investment
- ✅ Latest AI models (GPT-4, Gemini Pro)
- ❌ Data on AlloFlow servers (encrypted)

**Hardware**: None (just internet connection)  
**Setup time**: 5 minutes  
**Best for**: Busy parents who want simplicity

---

#### **Tier 2: Hybrid (Local Data + AI Fallback) — BEST BALANCE**
- ✅ Complete data privacy (PocketBase local)
- ✅ Works offline for lessons/quizzes (no AI dependency)
- ✅ Falls back to cloud AI if local unavailable
- ✅ Moderate hardware requirements (no GPU needed)
- ✅ Affordable hardware (~$200-500 home server or laptop)
- ✅ Free after setup (Ollama, SearXNG free)
- ❌ Slower AI responses (CPU-only Ollama vs. GPU)
- ❌ PC/NAS must stay on or use always-on hardware

**Services included:**
- PocketBase (database)
- Ollama (text generation, CPU-friendly models)
- SearXNG (private web search)
- Piper/Edge TTS (text-to-speech, offline)
- ❌ NO Flux (too slow on CPU, cloud fallback)

**Hardware**: 
- Minimum: 8GB RAM, 4-core CPU (Intel i5/AMD Ryzen 5 or better)
- Recommended: 16GB RAM, 6-core CPU + SSD

**Setup time**: 15-20 minutes  
**Best for**: Privacy-conscious parents with basic tech skills

**Hybrid Docker setup:**
```bash
# 1. Parent downloads hybrid docker-compose.yml
curl -o docker-compose.yml https://download.alloflow.io/homeschool/docker-compose-hybrid.yml

# 2. Start services:
docker compose up -d

# 3. Homeschool app detects and uses:
#    - PocketBase local (database) ✅
#    - Ollama local (text generation) ✅
#    - SearXNG local (search) ✅
#    - Falls back to Gemini/GPT-4 for image generation ✅

# 4. Parent goes to Settings → Server & Sync
# 5. Selects "Hybrid Mode" (Local data, Cloud AI fallback)
# 6. App auto-detects local services
```

---

#### **Tier 3: Full Local (Complete Privacy + Performance) — POWER USERS**
- ✅ Perfect data privacy & offline capability
- ✅ Fastest AI responses (GPU-accelerated)
- ✅ Image generation included (Flux.1-schnell)
- ✅ All features work offline
- ✅ No cloud service dependency
- ❌ High hardware barrier (NVIDIA GPU required)
- ❌ Setup more complex
- ❌ Flux image gen slower than cloud APIs
- ❌ Most expensive (GPU hardware $500-2000+)

**Services included:**
- PocketBase (database)
- Ollama (LLM text generation, GPU-accelerated)
- Flux.1-schnell (image generation + editing)
- SearXNG (private web search)
- Piper/Edge TTS (text-to-speech, offline)
- ✅ ALL features completely local

**Hardware Required:**
- NVIDIA GPU with 8GB+ VRAM (RTX 3060, RTX 4060 Ti, A100, etc.)
- Minimum: 16GB system RAM, 6-core CPU
- Recommended: 32GB+ RAM, SSD storage
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed

**Common Hardware Configurations:**
- Desktop: RTX 4060 Ti (8GB) — $300-400
- Desktop: RTX 4080 (16GB) — $1200+
- Used: RTX 3080 (10GB) — $400-600 (eBay)
- Always-on: NVIDIA Jetson AGX Orin (12GB) — $699
- Cloud alternative: Rent GPU from Vast.ai ($0.20-1.00/hour when needed)

**Setup time**: 30-45 minutes  
**Best for**: Tech-savvy parents who want maximum privacy & performance

**Full Local Docker setup:**
```bash
# 1. Parent downloads full docker-compose.yml
curl -o docker-compose.yml https://download.alloflow.io/homeschool/docker-compose-full.yml

# 2. Start all services (requires NVIDIA GPU):
docker compose up -d

# Services start on:
#   - PocketBase: http://localhost:8090
#   - Ollama: http://localhost:11434
#   - Flux: http://localhost:7860
#   - SearXNG: http://localhost:8888

# 3. Check GPU is detected:
docker exec alloflow-ollama ollama list
docker logs alloflow-flux | grep -i gpu

# 4. Parent goes to Settings → Server & Sync
# 5. Selects "Full Local Mode"
# 6. App uses only local services, zero cloud dependency
```

---

#### **Comparison Table**

| Feature | Cloud | Hybrid | Full Local |
|---------|-------|--------|-----------|
| **Data Privacy** | ⚠️ Cloud | ✅ Local | ✅ Local |
| **Works Offline** | ❌ No | ⚠️ Partially | ✅ Yes |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Moderate | ⭐⭐⭐ Hard |
| **Hardware Cost** | $0 | $200-500 | $500-2000+ |
| **Monthly Cost** | ~$20-50 | Free | Free |
| **Text Generation Speed** | Fast (Cloud) | Slow (CPU) | Fast (GPU) |
| **Image Generation** | Cloud (Fast) | Cloud fallback | Local (Slower) |
| **Web Search** | No (Cloud) | Local + Anonymous | Local + Anonymous |
| **AI Model Access** | Latest GPT-4, Gemini | Mistral, Llama, Zephyr | Mistral, Llama, Zephyr |
| **Parents Using** | 90% (non-technical) | 8% (Privacy + tech skills) | 2% (Maximum privacy) |

---

#### **How Parents Choose**

**"I just want it to work"** → Cloud (Default)  
**"I care about privacy + basic tech skills"** → Hybrid  
**"I want complete control + have a GPU"** → Full Local  

**Fallback Strategy (Hybrid & Full Local):**

When a local service is unavailable, app gracefully falls back:

```javascript
// Example: Image generation with fallback
async function generateImage(prompt) {
  try {
    // Try local Flux first (Full Local) or (Hybrid if user paid)
    return await fluxServer.generate(prompt);
  } catch (error) {
    // Fall back to Gemini if local unavailable
    console.log("Local Flux unavailable, using Gemini...");
    return await geminiFallback.generate(prompt);
  }
}

// Text generation with fallback
async function generateLesson(curriculum) {
  // Try Ollama first
  try {
    return await ollama.generate(curriculum);
  } catch {
    // Fall back to ChatGPT if Ollama down
    console.log("Local Ollama unavailable, using ChatGPT...");
    return await chatGptFallback.generate(curriculum);
  }
}
```

This means:
- **Hybrid parents** get privacy by default, cloud safety net if needed
- **Full Local parents** are completely independent, zero cloud dependency
- **Neither blocks the parent** — app always works, degrades gracefully

---

## 8

### 8.1 Shared Components with Teacher Build

```javascript
// Existing: TeacherDashboard.jsx (Teacher role)
// New: ParentDashboard.jsx (Parent role)
// 
// Both can reuse:
// ├─ LessonCard.jsx (add/edit lessons)
// ├─ ProgressViewer.jsx (mastery tracking)
// ├─ QuizModal.jsx (student takes quiz)
// ├─ ActivityTracker.jsx (time/progress auto-capture)
// ├─ ReportGenerator.jsx (PDF export)
// └─ Settings UI components
//
// Differences:
// ├─ ParentDashboard: 1-5 children vs. TeacherDashboard: 20-30+ students
// ├─ ParentDashboard: AI integration vs. TeacherDashboard: school-issued tools
// ├─ ParentDashboard: Private/offline vs. TeacherDashboard: connected to admin cluster
// └─ ParentDashboard: Self-hosted option vs. TeacherDashboard: cloud only
```

### 8.2 Minimal New Components

```jsx
// NEW Components:
---

## 8. Code Structure (Separate Homeschool App)

### 8.1 Directory Structure

```
/client/                          (Main AlloFlow - Student/Teacher)
├── public/
├── src/
│   ├── App.jsx
│   ├── pages/
│   │   ├── StudentDashboard.jsx
│   │   └── TeacherDashboard.jsx
│   └── ...
├── main.js
├── preload.js
└── electron-builder.yml

/client-homeschool/              (NEW - Separate Homeschool App)
├── public/
├── src/
│   ├── App.jsx                   (Different root - always shows Parent UI)
│   ├── pages/
│   │   ├── Dashboard.jsx         (Parent dashboard - lessons & progress)
│   │   ├── Lessons.jsx           (Create/import/manage lessons)
│   │   ├── Reports.jsx           (Progress tracking, export)
│   │   └── Settings.jsx          (Family, AI config, backup - ADMIN FUNCTIONS IN HERE)
│   ├── components/
│   │   ├── LessonImporter.jsx    (Paste curriculum → AI structure)
│   │   ├── AIAssistant.jsx       (Chat for lesson ideas)
│   │   ├── ProgressChart.jsx     (Mastery trends)
│   │   ├── ChildSelector.jsx     (Switch between children)
│   │   └── shared/               (Reused from main app)
│   │       ├── LessonCard.jsx
│   │       ├── ProgressViewer.jsx
│   │       └── ReportGenerator.jsx
│   └── styles/
│       └── homeschool.css        (Different design language)
├── main.js                       (Custom main process for homeschool)
├── preload.js                    (Similar to main app)
├── package.json                  (Own dependencies + electron-builder)
└── electron-builder.yml          (Homeschool-specific config)
```

### 8.2 Code Sharing Strategy

**Reused from Main App (copy files with minimal edits):**
```javascript
/client-homeschool/src/components/shared/
├── LessonCard.jsx               // from /client/src/components/LessonCard.jsx
├── ProgressViewer.jsx           // from /client/src/components/ProgressViewer.jsx
├── ReportGenerator.jsx          // from /client/src/components/ReportGenerator.jsx
├── ActivityTracker.jsx          // from /client/src/components/ActivityTracker.jsx
└── QuizModal.jsx                // from /client/src/components/QuizModal.jsx

// Reason: These components work identically
// They just display/manage lessons and progress
// No changes needed for homeschool context
```

**New Components (Homeschool-specific):**
```jsx
// Pages
Dashboard.jsx          // Main parent view: weekly overview, quick stats, child selector
Lessons.jsx            // Create/import/manage lessons
Reports.jsx            // Progress analytics, export to PDF
Settings.jsx           // ★ NO SEPARATE ADMIN APP - all admin functions embedded here:
                       //   - Family profile management
                       //   - Child management
                       //   - AI provider configuration (ChatGPT/Gemini/Claude OAuth)
                       //   - Server selection (Cloud vs. Local)
                       //   - Database backup/restore
                       //   - App settings (theme, auto-launch, etc.)

// Components
LessonImporter.jsx     // Paste curriculum → preview → AI structure → create
AIAssistant.jsx        // Chat interface for lesson generation
ProgressChart.jsx      // Mastery trends, visualization
ChildSelector.jsx      // Dropdown/tabs to switch which child's dashboard to view
FamilySetup.jsx        // Onboarding wizard (first login)
```

### 8.3 Shared Backend (Same PocketBase)

Both `/client` and `/client-homeschool` connect to same PocketBase, but data is scoped:

```javascript
// Main app (/client)
// Role-based access:
//   - Student: sees only my assigned lessons
//   - Teacher: sees all students in my classes

// Homeschool app (/client-homeschool)
// Family-scoped access:
//   - Parent: sees only my children's lessons & progress
//   - Data isolated by homeschool_families.id
```

---

## 9. Child App Architecture & Linking

### 9.1 How Child Apps Work

Child apps built by the parent are **minimal Electron apps** that function like the district student apps, but scoped to homeschool family:

```
Parent App (AlloFlow-Homeschool-Parent.exe)
  ├─ Logs in as: parent_homeschool role
  ├─ Scoped to: homeschool_families.id
  ├─ Access: All children in that family
  └─ Functions: Create lessons, build child apps, track progress

Child App (AlloFlow-Homeschool-Child-Sarah.exe)
  ├─ Built by: Parent via Settings → Build Child Apps
  ├─ Logs in as: child_homeschool role
  ├─ Scoped to: homeschool_children.id (Sarah)
  ├─ Access: Only Sarah's assigned lessons & progress
  └─ Functions: View lessons, complete activities, see grades
```

### 9.2 Build Process (Uses ClientPackageBuilder)

Parent clicking [Build Child App] triggers same process as district deployments:

```
1. Parent app calls IPC: buildChildApp({ childId, platform, kioskMode })
2. Parent app main process invokes ClientPackageBuilder
3. Build steps:
   Step 1: Prepare environment
     - Write .env file with CHILD_ID=sarah_uuid
     - Write .env with FAMILY_ID=family_uuid
     - Write .env with SERVER_URL=https://cluster.alloflow.com
   
   Step 2: Install dependencies
     - npm install --omit=dev (same as student/teacher builds)
   
   Step 3: Build React app
     - npm run react-build
     - Minifies App.jsx, pages (Dashboard only for child)
   
   Step 4: Build Electron package
     - electron-builder with platform flag
     - Creates /dist/AlloFlow Homeschool Child-Sarah Setup X.X.X.exe (~95 MB)

4. Progress sent via IPC to parent app UI
5. Download link appears when complete
```

### 9.3 Child App Configuration

When parent builds a child app, environment variables are baked in:

```bash
# Example .env for Sarah's child app:
REACT_APP_ROLE=child_homeschool
REACT_APP_CHILD_ID=uuid_of_sarah
REACT_APP_FAMILY_ID=uuid_of_smith_family
REACT_APP_SERVER_URL=https://cluster.alloflow.com
REACT_APP_KIOSK_MODE=false  # (or true if parent enabled)
```

Child app reads these at startup:

```javascript
// /client-homeschool-child/src/App.jsx
const childId = process.env.REACT_APP_CHILD_ID;  // sarah_uuid
const familyId = process.env.REACT_APP_FAMILY_ID;  // smith_family_uuid
const serverUrl = process.env.REACT_APP_SERVER_URL;

// Child automatically fetches their lessons from:
// GET /api/homeschool/children/{childId}/lessons
// GET /api/homeschool/children/{childId}/progress
```

### 9.4 Auto-Linking Child ↔ Parent

Child app is automatically linked to parent through:

1. **Family Scoping**: homeschool_families.id is baked into both apps
2. **Child ID**: homeschool_children.id is baked into child app
3. **PocketBase Auth**: Both auth to same PocketBase with role-based rules
4. **Data Isolation**: PocketBase permissions prevent child from seeing other families' data

```javascript
// PocketBase rule: Child can only see their own data
{
  "collection": "homeschool_children",
  "rule": "@request.auth.id = @collection.homeschool_children.parent_id OR @request.auth.role = 'child_homeschool' AND @request.auth.child_id = @request.data.id"
}

// Result:
// - Parent sees all children
// - Child sees only themselves
// - Parent and child connected via homeschool_families.id
```

### 9.5 Multiple Child Apps

Parent can build apps for multiple children:

```
Parent creates: Sarah (Grade 4), Emma (Grade 2)

In Settings → Build Child Apps:
  Select child: [Sarah ▼]      [Build] → AlloFlow Homeschool Child-Sarah.exe
  Select child: [Emma ▼]       [Build] → AlloFlow Homeschool Child-Emma.dmg

Result:
  - Park sends Sarah's app to Sarah's laptop (Windows)
  - Parent sends Emma's app to Emma's iPad (macOS)
  - When Sarah launches her app: Shows only Sarah's lessons
  - When Emma launches her app: Shows only Emma's lessons
  - Parent sees both in dashboard, can track individually
```

### 9.6 Design: Separate Children Directory

Child apps have a separate directory from parent app:

```
/client-homeschool/           (Parent app)
  ├── src/pages/
  │   ├── Dashboard.jsx
  │   ├── Lessons.jsx
  │   ├── Reports.jsx
  │   └── Settings.jsx (BUILD CHILD APPS here)
  └── main.js

/client-homeschool-child/     (Child app - separate build target)
  ├── src/pages/
  │   ├── Dashboard.jsx        (Shows assigned lessons only)
  │   ├── ActivityView.jsx     (Do the lesson/quiz)
  │   └── ProgressView.jsx     (View grades)
  ├── main.js                  (Child-specific main process)
  └── electron-builder.yml     (Different config)
```

**Why Separate?**
- Child app is minimal (no lesson creation, AI, reporting)
- Different UX (simple, distraction-free)
- Can update independently
- Clearer separation of concerns

---

## 10. Integration Points with Existing System

### 9.1 Database Extensions (PocketBase)

```
Existing collections (unchanged):
├─ users (same auth system)
├─ sessions (optional: can use for activity scheduling)
└─ progress (same structure for tracking time/mastery)

New collections (homeschool-scoped):
├─ homeschool_families (parent → children mapping)
├─ homeschool_children (child profile + learning style)
├─ homeschool_lessons (lessons created by parent)
├─ homeschool_progress (child progress on lessons)
└─ oauth_tokens (encrypted AI provider credentials)
```

### 9.2 Backend API Endpoints (Homeschool-specific)

```
GET /api/homeschool/family/:familyId
GET /api/homeschool/children/:familyId
GET /api/homeschool/progress/:childId/month/:yyyy-mm
POST /api/homeschool/lessons (create lesson)
POST /api/homeschool/ai/generate-outline (paste curriculum → structured)
POST /api/homeschool/oauth/connect (ChatGPT/Gemini/Claude)
```
GET /api/parent/oauth/status
POST /api/parent/report/pdf/:childId (export progress)
```

### 9.3 Separate App Packages

```
Build outputs (separate executables):

Standard AlloFlow:
  ├── AlloFlow-Student.exe / .dmg
  └── AlloFlow-Teacher.exe / .dmg

AlloFlow Homeschool (NEW - separate release):
  └── AlloFlow-Homeschool-Parent.exe / .dmg
      (Single executable combining parent dashboard + admin settings)
```

---

## 10. Use Cases & Scenarios

### 10.1 Use Case 1: "I Have a Lesson Plan PDF"

```
Parent workflow:
1. Opens AlloFlow Homeschool app
2. Clicks [Import Curriculum]
3. Pastes text from PDF (or uploads PDF)
4. Selects child "Sarah (Grade 4)" and subject "Math"
5. Clicks [AI Analyze & Structure]
6. AI (via parent's ChatGPT account) processes:
   - Extracts learning objectives
   - Breaks into daily lessons
   - Suggests activities and assessments
   - Creates time estimates
7. Review suggestions (title, objectives, daily breakdown)
8. Edit as needed (add/remove days, adjust activities)
9. Click [Assign to Sarah]
10. Sarah sees lesson plan in her app
11. Parent can track Sarah's progress in real-time

Result: 5-10 minutes to convert PDF → structured, trackable lesson plan.
```

### 10.2 Use Case 2: "I Need Custom Lesson Ideas"

```
Parent workflow:
1. Opens AI Assistant chatbox
2. Types: "Math lesson ideas for fractions (Grade 4)"
3. AI suggests 5 lesson outlines
4. Parent clicks [Use This One] on favorite
5. Customizes title, activities, timeline
6. Assigns to child
7. Done

Or even:
1. Paste topic: "Photosynthesis"
2. AI asks clarifying questions:
   - "How long (1 hour, 1 day, 1 week)?"
   - "Hands-on or worksheet-based?"
   - "For single child or multiple kids?"
3. AI generates tailored lesson plan
```

### 10.3 Use Case 3: "I Want to Track My Child's Learning"

```
Parent workflow:
1. Parent creates 5 lessons for the week
2. Child completes lessons at own pace
3. Parent views Child's Progress Dashboard:
   - What's due this week
   - What's completed
   - Time spent per subject
   - Mastery levels (auto-calculated from quizzes)
4. Parent sees trends:
   - Sarah excels in reading (80% mastery)
   - Math needs more practice (55% mastery)
5. Parent gets AI suggestion:
   - "Sarah is struggling with fractions. Try hands-on activities."
6. Parent generates new lesson: "Fractions with Food"
7. Sarah does lesson, mastery jumps to 70%
8. Middle of month: Parent exports progress report
   - Screenshots/PDF for homeschool records
   - Shows hours spent, subjects covered, mastery levels
```

### 10.4 Use Case 4: "I Want to Self-Host (Tech Parent)"

```
Tech-savvy parent workflow:
1. Downloads "AlloFlow Homeschool Docker Image"
2. Runs: docker run -d -p 3000:3000 -v ~/alloflow:/data alloflow/homeschool:latest
3. Opens http://localhost:3000
4. Setup same as normal (add family, children, connect ChatGPT)
5. Adds Let's Encrypt SSL: docker exec alloflow certbot certonly --standalone -d dad-homeschool.duckdns.org
6. Configures domain: dad-homeschool.duckdns.org → home IP (using ngrok or DuckDNS)
7. Child accesses from school library: https://dad-homeschool.duckdns.org
8. All data stays at home, backed up locally
9. Parent runs monthly backup script

Result: Professional homeschool platform, zero tech support from AlloFlow, full privacy.
```

---

## 11. Data Structure Examples

### 11.1 Example: Parent Creates Lesson via AI

**Input (Parent pastes):**
```
Charlotte Mason Reading: Introduction to "The Tale of Despereaux"

Overview:
Students read the introduction and first chapter, focusing on character development and narrative techniques. This unit blends literature study with character analysis.

Day 1: Read introduction and Ch. 1
Day 2: Character analysis - Despereaux
Day 3: Vocabulary review
Day 4: Creative response - What would Despereaux say?
Day 5: Quiz and discussion

Vocabulary: Destitute, forgive, dungeon, princess, rat, Miggery Sow
```

**AI Output (ChatGPT processes):**
```json
{
  "title": "Tale of Despereaux: Character & Narrative Study",
  "subject": "reading",
  "grade_level": 4,
  "duration_days": 5,
  "learning_objectives": [
    "Analyze character motivations and development",
    "Identify narrative techniques in fantasy literature",
    "Apply new vocabulary in creative responses",
    "Make predictions based on character traits"
  ],
  "daily_breakdown": [
    {
      "day": 1,
      "title": "Introduction & First Impressions",
      "activities": [
        {
          "type": "reading",
          "description": "Read introduction and Chapter 1",
          "time_estimate": 30,
          "materials": "Book or eBook"
        },
        {
          "type": "discussion",
          "description": "Initial thoughts: Who is Despereaux?",
          "time_estimate": 10
        }
      ],
      "total_time": 40
    },
    {
      "day": 2,
      "title": "Character Analysis",
      "activities": [
        {
          "type": "worksheet",
          "description": "Character trait comparison: Despereaux vs. Other Rats",
          "time_estimate": 25
        },
        {
          "type": "writing",
          "description": "In 5 sentences, explain why Despereaux is different",
          "time_estimate": 15
        }
      ],
      "total_time": 40
    },
    // ... Days 3-5
  ],
  "assessment": {
    "formative": ["Daily discussions", "Worksheets", "Writing responses"],
    "summative": {
      "type": "quiz",
      "questions": [
        "What makes Despereaux different from other rats?",
        "How does the author build suspense in Chapter 1?",
        "Define: destitute, forgive, dungeon"
      ]
    }
  },
  "vocabulary": [
    { "word": "destitute", "definition": "extremely poor", "part_of_speech": "adjective" },
    { "word": "forgive", "definition": "to stop feeling angry at", "part_of_speech": "verb" },
    // ...
  ],
  "extensions": [
    "Create an illustrated character map",
    "Write a letter from Despereaux's perspective",
    "Compare to another book you've read"
  ]
}
```

**Parent sees in UI:**
- Title: "Tale of Despereaux: Character & Narrative Study"
- Grid of 5 days with activities
- Objectives list
- Vocabulary flashcards (can print)
- Assessment quiz (auto-grades with answer key)
- Extensions for advanced learners
- [Edit] button to modify anything
- [Assign to Sarah] → Generated assignments appear in child's dashboard

---

## 12. Security & Privacy Considerations

### 12.1 Data Protection

```
Sensitive Data:
├─ Child personal info (name, date of birth, learning style)
├─ Progress/academic records (mastery scores, activity history)
├─ Parent account credentials
├─ AI OAuth tokens (ChatGPT/Gemini accounts)
└─ Family relationships (child-parent links)

Encryption Strategy:
├─ OAuth tokens: AES-256 encryption in PocketBase
├─ Child data: TLS in transit, encrypted at rest (PocketBase backup)
├─ Progress data: Privacy by default (only parent/child visible)
└─ PII: Minimal storage (name, DOB only if necessary)

Compliance:
├─ COPPA (Children's Online Privacy): No third-party tracking/ads
├─ FERPA: If used for school records, must restrict sharing
├─ GDPR: If EU users, add data export/deletion options
└─ Self-hosted: Parent responsible for backups & security
```

### 12.2 OAuth Permission Scoping

```
ChatGPT OAuth Request:
- Read: drafts, activity history (to improve suggestions)
- Write: draft creation, summarization
- NOT: Billing access, account settings, email

Gemini OAuth Request:
- Read: recent activity (context for suggestions)
- Write: content generation
- NOT: Gmail access, Google Drive content

Claude OAuth Request:
- API access limited to education/content generation scopes
- NOT: Advanced capabilities outside homeschool context
```

---

## 13. Technical Challenges & Solutions

| Challenge | Impact | Proposed Solution |
|-----------|--------|-------------------|
| **OAuth Token Storage** | Security risk if leaked | AES-256 encryption in PocketBase, refresh token rotation |
| **AI API Rate Limiting** | User frustration if parent hits limits | Cache AI responses, queue large requests, throttle |
| **Offline Access** | Parents may edit lessons without internet | Local caching + sync when online |
| **Multi-Child Scheduling** | Complex for parents managing multiple kids | Calendar view, color-coding, auto-time-blocking |
| **Data Migration (Cloud ↔ Self-Hosted)** | Parents want to move between options | Export/import API with data transformation |
| **Parent Technical Support** | Support burden for non-tech parents | Self-service tutorials, video guides, Discord community |
| **Child Device Compatibility** | Works on Chromebooks, tablets, older PCs | Test on major platforms, lightweight React build |

---

## 14. Rollout Strategy

### Phase 1: Soft Launch (Week 18)
- [ ] Release to trusted beta group (10-20 homeschool parents)
- [ ] Gather feedback on UX, AI integration, self-hosting
- [ ] Fix critical issues
- [ ] Document setup process

### Phase 2: Limited Release (Week 19-20)
- [ ] Release to AlloFlow existing users (teacher/student base)
- [ ] Parent role available for opt-in
- [ ] Publicize via blog, community channels
- [ ] Gather larger feedback pool

### Phase 3: Full Release (Week 21+)
- [ ] General availability
- [ ] Marketing push: homeschool networks, parent groups
- [ ] Ongoing support, feature improvements

---

## 15. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Phase 3a Adoption** | 50+ homeschool parents | PocketBase user count (role=parent) |
| **AI Integration** | 60% connect ChatGPT/Gemini | OAuth connection rate |
| **Lesson Creation** | 3+ lessons/parent/month | Avg lessons created per parent |
| **Child Engagement** | 50+ hours/month per child | Time tracking in homeschool_progress |
| **Self-Hosted Deployments** | 20+ parents self-host | Docker image downloads, license registrations |
| **Parent Satisfaction** | 4.5+ / 5 stars | In-app surveys, review sites |
| **Churn Rate** | <10% Monthly | Retention tracking |

---

---

## 17. Separate Product Strategy

### 17.1 Why Separate Release?

**Main AlloFlow (Client App) Focus:**
- School districts, classrooms, teachers
- Multiple classes, 20-100+ students per teacher
- Integration with student information systems (SIS)
- Standardized reporting, compliance
- Role-based access control (principal, teacher, student)

**AlloFlow Homeschool (New Release) Focus:**
- Individual parents, homeschooling families
- 1-5 children per parent
- Personal AI integration (ChatGPT/Gemini account they already have)
- Simple, family-scoped interface
- Optional self-hosted deployment
- Complete privacy & data control options

**Why Not Merge?**
- UI complexity (school vs. family workflows)
- Marketing & positioning (two different markets)
- Simplicity (homeschool app doesn't need roster, SIS, compliance features)
- Branding (target homeschool community separately)
- Pricing (can monetize differently if needed later)

### 17.2 Release Strategy

```
AlloFlow Platform v1.0
├── AlloFlow-Student.exe / .dmg
├── AlloFlow-Teacher.exe / .dmg
└── Admin Center (Electron app - for districts/admins)

AlloFlow Homeschool v1.0 (NEW - separate product)
└── AlloFlow-Homeschool-Parent.exe / .dmg
    └── All admin functions built into Settings tab
        (No separate admin app needed)
```

### 17.3 Unified Backend

```
Both products use same PocketBase backend:

Main AlloFlow:
  ├─ users (teachers, students, admins with role=teacher/student)
  ├─ classes (school rosters)
  ├─ lessons (shared by teacher across students)
  └─ progress (student progress tracked)

AlloFlow Homeschool:
  ├─ users (parents, with role=parent - DIFFERENT namespace)
  ├─ homeschool_families (parent → children)
  ├─ homeschool_children (child profile)
  ├─ homeschool_lessons (parent-created for children)
  └─ homeschool_progress (child progress)

Data Isolation:
  Main app users never see homeschool data
  Homeschool parents never see school data
  Separate login flows + authentication scoping
```

---

## 18. Summary

### What We're Building

A **standalone homeschool product** (separate executable) that:

✅ **Separate from main AlloFlow** — Different .exe/.dmg, different branding, different market  
✅ **Reuses backend** — Same PocketBase, same authentication, but isolated data  
✅ **Admin built-in** — Settings tab replaces separate admin center (just one app to run)  
✅ **AI-first** — Uses parent's existing ChatGPT/Gemini/Claude account (no API keys)  
✅ **Optional self-host** — Parents can choose cloud or local Docker deployment  
✅ **Simple for parents** — 5-minute setup, paste-to-lesson workflow  
✅ **Minimal new code** — Reuses LessonCard, ProgressViewer, ReportGenerator from main app  

### Release Timeline

| Phase | Duration | Deliverable | Status |
|-------|----------|-------------|--------|
| **3a** | Weeks 10-11 | Homeschool app scaffold + Dashboard/Lessons/Reports/Settings tabs | Not started |
| **3b** | Weeks 12-13 | AI OAuth integration (ChatGPT/Gemini/Claude) + LessonImporter | Not started |
| **3c** | Weeks 14-15 | Progress tracking, analytics, PDF reports | Not started |
| **3d** | Weeks 16-17 | Production builds (.exe/.dmg), Docker for self-host | Not started |
| **Total** | ~4-5 weeks | **AlloFlow Homeschool v1.0 ready for launch** | Will start after Phase 2 |

### Before Starting (Validation Checklist)

- [ ] Confirm OAuth flow acceptable (ChatGPT/Gemini/Claude)
- [ ] Survey 5-10 homeschool parents for feedback
- [ ] Validate UI mockups with parents
- [ ] Decide: Premium features model (free tier vs. paid)?
- [ ] Plan launch strategy (homeschool networks, Facebook groups, etc.)

### Success Metrics

- 100+ homeschool parents using within 6 months
- 60%+ AI integration adoption
- 4.5+ / 5 star ratings
- <10% monthly churn
- 50+ self-hosted deployments (optional, tracking via Docker pulls)

---

**Status**: ✅ Revised Action Plan (Separate Product)  
**Next**: Await approval to proceed with Phase 3a


- [ ] Peer parent community (share lesson plans, Tips)
- [ ] Multi-family curriculum sharing (with privacy controls)
- [ ] Standardized test prep modules
- [ ] Homeschool co-op management (coordinate with other families)
- [ ] Transcript generation (GPA, credit hours for high school record)
- [ ] College application portfolio builder
- [ ] Integration with external tests (SAT, ACT, state assessments)
- [ ] Multilingual support (Spanish, Portuguese, Mandarin)
- [ ] Mobile app (native iOS/Android for on-go access)

---

## 17. Summary & Next Steps

### What We're Building
A homeschool-specific version of AlloFlow that:
- Serves parents managing 1-5 children's education
- Leverages AI (ChatGPT/Gemini/Claude) the parent already uses
- Can be self-hosted locally or on cloud
- Tracks child progress and generates reports
- Minimally reuses existing teacher/student components
- Requires no technical expertise to set up

### Why It's Good
- **Large TAM**: 3M+ homeschool families in US alone
- **Unique angle**: OAuth AI (not API keys), self-hosted option
- **Low effort**: Reuses existing components, minimal new code
- **Clear revenue**: Premium features (curriculum library, advanced AI), support tier
- **Community**: Active homeschool networks looking for tools

### Before Starting (Validation)
- [ ] Survey 10-20 actual homeschool parents for feedback
- [ ] Validate AI-first design (do parents actually want this?)
- [ ] Research OAuth implementation with ChatGPT/Gemini/Claude
- [ ] Create UI mockups, test with parents
- [ ] Estimate cloud hosting costs vs. self-hosted (per parent)

### Timeline
- **Phase 3a (Weeks 10-11)**: Parent role, basic dashboard, lesson creation
- **Phase 3b (Weeks 12-13)**: AI integration, OAuth setup
- **Phase 3c (Weeks 14-15)**: Progress tracking, reporting
- **Phase 3d (Weeks 16-17)**: Self-hosted Docker, deployment docs
- **Phase 3 Total**: ~165 hours (~4.1 weeks full-time)

---

**Status**: ✅ Complete Action Plan  
**Next**: Awaiting user feedback & approval to proceed with Phase 3a
