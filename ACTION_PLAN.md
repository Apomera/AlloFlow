# AlloFlow Action Plan: Security Hardening + Admin Packaging System

## Phase 1: Security Hardening (Weeks 1–3)

### Week 1 — Critical Fixes (Must-Do Before Any Deployment)

**1.1 — Lock down Docker service ports**
- In `docker-compose.yml`: Change every port binding from `"PORT:PORT"` to `"127.0.0.1:PORT:PORT"`
- This ensures PocketBase, Ollama, Flux, Edge TTS, and SearXNG are only reachable from localhost
- External access goes through the nginx reverse proxy only

**1.2 — Replace hardcoded SearXNG secret**
- In `docker/searxng/settings.yml`: Remove the hardcoded `secret_key: "alloflow2026searxng"`
- Generate a random key at first boot (the admin installer from Phase 3 will do this automatically)
- Store in `.env` file, reference via Docker environment variable

**1.3 — Move API keys from URL query strings to headers**
- In `src/aiProvider.js`: Change `?key=${this.apiKey}` pattern to use `Authorization: Bearer ${this.apiKey}` header
- This applies to all Gemini API calls
- Keys will no longer appear in browser history, logs, or referer headers

**1.4 — Restrict CORS on local services**
- In `docker/flux-server/flux_server.py`: Change `allow_origins=["*"]` to `allow_origins=["http://localhost", "https://localhost", "https://*.yourdomain.edu"]`
- In `docker/edge-tts-server/server.py`: Replace `CORS(app)` with explicit origin whitelist
- The admin installer (Phase 3) will configure the allowed origins based on the domain entered during setup

**1.5 — Add CSP header**
- In `docker/nginx.conf`: Add `Content-Security-Policy` header:
  - `default-src 'self'`
  - `script-src 'self'` (remove need for `unsafe-inline` by moving inline scripts to files)
  - `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com` (for Canvas mode)
  - `img-src 'self' data: blob: https:`
  - `style-src 'self' 'unsafe-inline'` (Tailwind requires this)
- In `prismflow-deploy/firebase.json`: Add matching CSP header for Firebase Hosting deployments

**1.6 — Pin lucide CDN with SRI hash**
- In `index.html`: Change `https://unpkg.com/lucide@latest` to a specific version with `integrity="sha384-..."` and `crossorigin="anonymous"` attributes
- Alternatively, bundle lucide into the CRA build (it's already in `prismflow-deploy/package.json` as `lucide-react`) and remove the CDN script tag entirely from the landing page

**1.7 — Fix innerHTML SVG injection**
- In `index.html`: Replace `document.getElementById('hero-allobot').innerHTML = svg` with either:
  - `<img src="allobot.svg">` (simplest), or
  - `DOMParser` → `adoptNode` approach (if SVG interactivity is needed)

### Week 2 — High-Priority Hardening

**2.1 — Add rate limiting to nginx**
- Add `limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;` to nginx.conf
- Apply `limit_req zone=api burst=50 nodelay;` to API proxy locations
- Add separate stricter zone for image generation: `rate=1r/s` (1 image per second per IP)

**2.2 — Add input length validation to all Python endpoints**
- `docker/edge-tts-server/server.py`: Reject `input` text longer than 5,000 characters
- `docker/npu_server.py`: Reject messages with total token count > `max_tokens` config
- `docker/flux-server/flux_server.py`: Already has Pydantic models — add `Field(max_length=1000)` to prompt fields

**2.3 — Add security headers to nginx**
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `X-Content-Type-Options: nosniff` (already present — verify)

**2.4 — Run containers as non-root**
- In `docker/Dockerfile`: Add `USER nginx` after the final `COPY` stage
- In flux-server Dockerfile: Add `USER 1000`
- In edge-tts-server Dockerfile: Add `USER 1000`

**2.5 — Pin npm dependencies**
- In `prismflow-deploy/package.json`: Change all `^x.y.z` to exact `x.y.z`
- Commit `package-lock.json` to git
- Add `npm audit` to the build pipeline

**2.6 — Add Docker network isolation**
- In `docker-compose.yml`: Create two networks:
  - `frontend` — nginx + PocketBase (user-facing)
  - `backend` — Ollama, Flux, TTS, SearXNG (internal only, accessed via nginx proxy)
- Only nginx gets both networks

### Week 3 — Medium Priority + Validation

**3.1 — Add path validation to DataLayer**
- In `src/dataLayer.js`: Add whitelist regex `^[a-zA-Z0-9_-]+$` for appId and sessionId before they're used in path construction

**3.2 — Add log rotation to Docker**
- In `docker-compose.yml`: Add to each service:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```

**3.3 — Document PocketBase access rules**
- Create PocketBase collection rules that restrict:
  - Students: can only read/write their own session data
  - Teachers: can read all sessions in their class, write their own
  - Admin: full access

**3.4 — Add hash verification to setup-local-ai.bat**
- After downloading `OllamaSetup.exe`, verify SHA-256 hash against a known-good value before executing

**3.5 — Security regression test**
- Create a checklist script that verifies all the above changes:
  - Ports bound to 127.0.0.1? Check.
  - CSP header present? Check.
  - CORS restricted? Check.
  - Containers non-root? Check.

---

## Phase 2: Admin Server & Packaging Architecture (Weeks 4–10)

### Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                  ADMIN CENTER (Windows EXE)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Admin UI     │  │  Server Mgr  │  │  Package Builder  │  │
│  │  (Electron    │  │  (Node.js)   │  │  (electron-builder│  │
│  │   + React)    │  │              │  │   + pkg)          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘  │
│         │                 │                  │               │
│  ┌──────┴─────────────────┴──────────────────┴────────────┐  │
│  │              Embedded Docker Compose Stack              │  │
│  │  PocketBase │ Ollama │ Flux │ TTS │ SearXNG │ Nginx    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Load Balancer (nginx upstream)             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │  │
│  │  │ Node A  │  │ Node B  │  │ Node C  │  (other bldgs) │  │
│  │  └─────────┘  └─────────┘  └─────────┘               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │                              │
          │ HTTPS                        │ Generates
          ▼                              ▼
  ┌───────────────┐            ┌──────────────────────┐
  │ Teacher/Student│           │ Student/Teacher EXE   │
  │ Browsers       │           │ (Electron thin client │
  │ (existing app) │           │  preconfigured with   │
  │                │           │  server URL)          │
  └────────────────┘           └──────────────────────┘
```

### Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Admin desktop app | **Electron** | Cross-platform (Win EXE + Mac DMG), embeds the existing React UI unchanged, can manage Docker, can build packages |
| Client desktop app | **Electron** (thin) | Wraps the same web app in a shell preconfigured with server URL — no browser needed |
| Load balancer | **nginx upstream** config | Already in the stack, just needs upstream block configuration |
| Package builder | **electron-builder** | Produces `.exe` (NSIS) and `.dmg` natively, supports code signing |
| Server management | **Node.js child_process** | Calls `docker compose` commands, monitors health endpoints |
| Master-node communication | **REST API over HTTPS** | Nodes register with master, master distributes config |

### Why Electron (Not Tauri)

- The existing app is a **CRA React app** — Electron wraps it with zero changes
- Electron supports `child_process` for Docker management — Tauri would require rewriting in Rust
- electron-builder produces **both .exe and .dmg** from one codebase
- Canvas integration is already browser-based — Electron's Chromium is the same engine
- **Not recreating the wheel**: the web app stays identical, Electron is just a shell

---

### Week 4–5: Admin Center Core

**2.1 — Create Electron admin app scaffold**
- New directory: `admin/`
- `admin/package.json` with electron, electron-builder dependencies
- `admin/main.js` — Electron main process
- `admin/preload.js` — secure bridge for Docker/system calls
- `admin/src/` — Admin UI (React, reuses existing Tailwind/shared.css)
- The admin UI is NOT the AlloFlow teaching app — it's a separate management dashboard

**2.2 — Admin UI: Dashboard Tab**
- Shows: running services (green/red status), CPU/RAM/GPU usage, connected clients count
- Polls Docker health endpoints every 10 seconds
- Shows: server domain/IP, TLS cert status, last backup time

**2.3 — Admin UI: Services Tab**
- Start/stop/restart individual Docker services (PocketBase, Ollama, Flux, TTS, SearXNG)
- View logs (tails `docker compose logs`)
- Configure ports, GPU settings, model selection
- Writes to `.env` file, then runs `docker compose up -d`

**2.4 — Admin UI: AI Models Tab**
- Lists available Ollama models with download status
- One-click "Download School Pack" button that pulls:
  - DeepSeek R1 1.5B (math)
  - Phi 3.5 (general)
  - Qwen 2.5 3B (balanced)
- Shows download progress, disk usage
- Manages Flux model download
- Leverages existing `setup-local-ai.bat` logic but in a GUI

**2.5 — Admin UI: Security Tab**
- Generate/rotate SearXNG secret key
- Configure allowed CORS origins
- View/edit PocketBase admin credentials
- Toggle TLS (auto-generate self-signed cert for LAN, or input Let's Encrypt domain)
- Configure API key (stored encrypted, never in plaintext `.env`)

### Week 6–7: Server Clustering & Load Balancing

**2.6 — Master/Node registration API**
- Master server exposes `POST /api/cluster/register` (authenticated)
- Node servers call this on startup with their IP, capabilities (GPU? which models?), health status
- Master stores node list in PocketBase `cluster_nodes` collection
- Heartbeat: nodes ping master every 30 seconds, master marks stale nodes as offline

**2.7 — Load balancer configuration**
- Admin UI: "Cluster" tab shows all registered nodes on a map/list
- When nodes register, admin generates nginx `upstream` config:
  ```nginx
  upstream ollama_cluster {
      least_conn;
      server 10.0.1.10:11434;   # Building A
      server 10.0.1.20:11434;   # Building B
      server 10.0.1.30:11434;   # Building C (backup)
  }
  ```
- Admin writes config and reloads nginx (`docker exec nginx nginx -s reload`)
- Supports strategies: round-robin, least-connections, ip-hash (sticky sessions)

**2.8 — Master server controls**
- Master pushes configuration to nodes: model lists, allowed users, rate limits
- Nodes pull config from master on startup and every 5 minutes
- If master is unreachable, nodes continue operating with last-known-good config (offline resilience — core AlloFlow principle)

**2.9 — Centralized PocketBase**
- Option A: All nodes point to master's PocketBase (simpler, requires network)
- Option B: PocketBase per node with sync to master (complex but offline-capable)
- Recommend **Option A** for districts with reliable LAN, **Option B** only for fully air-gapped sites
- Admin UI lets you choose

### Week 8–9: Client Package Builder

**2.10 — Client Electron app scaffold**
- New directory: `client/`
- Minimal Electron shell — loads `https://{configured-server}/` in a BrowserWindow
- No local server, no Docker — just a preconfigured browser wrapped in a desktop app
- `client/config.json`: `{ "serverUrl": "https://alloflow.school.edu", "schoolName": "Lincoln Elementary" }`
- Auto-updates via electron-updater (checks master server for new versions)

**2.11 — Package builder in Admin UI**
- Admin UI: "Deploy" tab
- Form fields:
  - Server URL (auto-filled from current admin server)
  - School name (shown in title bar)
  - Role: "Teacher" or "Student" (controls which features are visible)
  - Platform: Windows (.exe) or Mac (.dmg)
  - Optional: custom icon/branding
- "Build Package" button:
  1. Writes `config.json` with server URL + role
  2. Runs `electron-builder --win nsis` or `electron-builder --mac dmg`
  3. Outputs: `AlloFlow-Student-Setup.exe` (~80MB) or `AlloFlow-Student.dmg` (~90MB)
  4. File is downloadable from the Admin UI or servable via a LAN URL

**2.12 — Student EXE behavior**
- On first launch: shows school name, connects to configured server
- No setup wizard, no configuration — just opens the app
- If server is unreachable: shows cached version (service worker) with "Offline Mode" banner
- Teacher EXE: same but with admin settings panel accessible via menu
- Kiosk mode option: locks student into AlloFlow (no address bar, no DevTools)

**2.13 — Mac DMG support**
- electron-builder can cross-compile Mac DMGs from Windows **only for unsigned builds**
- For signed builds: requires macOS with Apple Developer certificate
- Plan: Admin server can build unsigned DMGs for internal LAN distribution
- For App Store / MDM distribution: requires a separate macOS build machine (documented, not automated)

### Week 10: Integration Testing & Documentation

**2.14 — End-to-end test scenario**
1. Install admin EXE on district server
2. Run setup wizard → downloads Docker images, AI models
3. Register 2 building nodes
4. Generate student EXE with Building A's URL
5. Student launches EXE → auto-connects → joins teacher session via 4-digit code
6. Verify: load balancing distributes LLM requests across nodes

**2.15 — Documentation deliverables**
- `ADMIN_GUIDE.md` — Installing and configuring the admin center
- `DEPLOYMENT_GUIDE.md` — District-wide rollout playbook
- `NETWORK_REQUIREMENTS.md` — Ports, firewall rules, bandwidth estimates
- Update existing `DEPLOY_YOUR_OWN.md` to reference admin installer as the recommended path

---

## Phase 3: File/Directory Plan

```
AlloFlow/
├── admin/                          # NEW — Admin Center Electron app
│   ├── package.json
│   ├── main.js                     # Electron main process
│   ├── preload.js                  # Secure IPC bridge
│   ├── electron-builder.yml        # Build config for EXE/DMG
│   ├── src/
│   │   ├── App.jsx                 # Admin dashboard UI
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Service status, metrics
│   │   │   ├── Services.jsx        # Docker service management
│   │   │   ├── Models.jsx          # AI model downloads
│   │   │   ├── Cluster.jsx         # Node management, load balancing
│   │   │   ├── Security.jsx        # Certs, keys, CORS config
│   │   │   └── Deploy.jsx          # Client package builder
│   │   └── components/             # Shared UI components
│   └── assets/                     # Icons, branding
│
├── client/                         # NEW — Thin client Electron app
│   ├── package.json
│   ├── main.js                     # Loads server URL in BrowserWindow
│   ├── preload.js
│   ├── config.json                 # Server URL, role, school name
│   └── electron-builder.yml
│
├── docker/                         # EXISTING — Modified
│   ├── docker-compose.yml          # Ports → 127.0.0.1, networks added
│   ├── nginx.conf                  # CSP, HSTS, rate limiting added
│   ├── cluster-nginx.conf          # NEW — upstream load balancer config
│   └── ...existing files...
│
├── src/                            # EXISTING — Modified
│   ├── aiProvider.js               # API key → header, not query string
│   ├── dataLayer.js                # Path validation added
│   └── ...existing files...
│
├── prismflow-deploy/               # EXISTING — Unchanged
│   └── ...                         # Still builds to Firebase + Docker
│
└── ...existing root files...       # Unchanged
```

---

## Compatibility with Google Canvas

Everything above preserves Canvas compatibility:

| Concern | How It's Preserved |
|---------|--------------------|
| Canvas loads AlloFlow as a web app | The web app is **unchanged** — Electron and admin are separate projects that serve or wrap the same app |
| Canvas blocks external APIs | `aiProvider.js` already gates external calls with `_isCanvasEnv` — no change needed |
| Canvas uses Firebase auth | Firebase path in `dataProvider.js` remains the default — PocketBase is only used in self-hosted mode |
| Canvas has its own CSP | CSP headers added to nginx/Firebase only apply to self-hosted deployments, not Canvas |
| Canvas serves from Google domain | `build.js --mode=prod` continues to produce the same CDN-referenced build for Canvas deployment |

**The admin center and client packages are additive infrastructure** — they don't modify the core web app. They wrap it, serve it, and manage the backend that supports it.

---

## Effort Estimate by Phase

| Phase | Scope | New Code |
|-------|-------|----------|
| **Phase 1** (Weeks 1–3) | Security hardening | Config changes + small code fixes to ~8 files |
| **Phase 2a** (Weeks 4–5) | Admin center core | ~2,000 lines (Electron + React dashboard) |
| **Phase 2b** (Weeks 6–7) | Clustering + load balancing | ~1,500 lines (API + nginx config generation) |
| **Phase 2c** (Weeks 8–9) | Client packager | ~800 lines (thin Electron client + builder UI) |
| **Phase 2d** (Week 10) | Testing + docs | Test scripts + 4 markdown documents |
