# AlloFlow Homeschool — Deployment & Self-Hosting Guide

**This guide helps you choose and set up your AlloFlow Homeschool deployment.**

---

## Quick Comparison: Which Tier is Right For You?

### 🟢 Tier 1: Cloud Only (Default) — For Most Parents

**Choose this if:**
- ✅ You want simplicity (no technical setup)
- ✅ You're comfortable with data on encrypted cloud servers
- ✅ You want access from any device (classroom, work, on-the-go)
- ✅ You don't want to manage servers

**What you need:**
- Internet connection (required)
- No hardware investment
- No Docker or server knowledge

**Cost:**
- ~$20-50/month for cloud AI API usage + backup storage

**Setup time:**
- 5 minutes (download app, create account, select "Cloud Mode")

**How it works:**
```
Your Computer
    ↓ Internet ↓
  [Cloud Server at AlloFlow]
    • Data storage
    • AI (ChatGPT, Gemini, Claude)
    • Backups
    • Multi-device sync
```

---

### 🟡 Tier 2: Hybrid (Local Data + Cloud AI Fallback) — Best Balance

**Choose this if:**
- ✅ You care about data privacy
- ✅ You have basic technical skills (can run Docker commands)
- ✅ You can keep a PC/NAS running 24/7 (or rent low-cost hardware)
- ✅ You want free AI after initial setup
- ✅ You can accept slightly slower AI responses

**What you need:**
- Hardware (see below)
- Internet connection (for AI provider fallback only)
- Docker Desktop installed (free, easy setup)
- 15-20 minutes to configure

**Cost:**
- One-time: $200-600 for hardware (or $0 if repurposing old PC)
- After that: Free (no monthly subscriptions)

**Setup time:**
- 20 minutes (Docker install) + 10 minutes (run commands)

**Hardware Options** (pick one):

| Hardware | Price | Notes |
|----------|-------|-------|
| **Home laptop** (old i7, 16GB) | $0-300 | Repurpose old machine |
| **Synology NAS DS224+** | ~$400 | Always-on, quiet, professional |
| **QNAP TS-264C3U** | ~$600 | Faster, more storage |
| **Raspberry Pi 5 8GB** | $80-150 | Smallest, slowest, cheapest |
| **Desktop PC** | $200-500 | If dedicated, best performance |

**How it works:**
```
Your Computer (PocketBase, Ollama, SearXNG)
    ↓ Offline ↓
  [Database, Local AI, Private Search]
  
    ↓ Internet (only if needed) ↓
  [Cloud AI Fallback: Gemini/ChatGPT]
```

**What stays private:**
- ✅ All your lesson plans
- ✅ All your children's progress data
- ✅ All your family's personal information
- ✅ All your child's activity history

**What uses cloud (optional fallback):**
- ☁️ Image generation (if Flux not working)
- ☁️ Advanced prompt responses (if Ollama unavailable)

**Setup steps:**
1. Install Docker Desktop (free)
2. Download `docker-compose-hybrid.yml`
3. Run: `docker compose up -d`
4. In app: Settings → Server → Select "Hybrid Mode"
5. Done! (Ollama model auto-downloads on first use, ~10 min)

---

### 🔴 Tier 3: Full Local (100% Offline) — Maximum Privacy

**Choose this if:**
- ✅ You want ZERO cloud dependency
- ✅ You have a NVIDIA GPU (RTX 3060 or better)
- ✅ You want to work completely offline
- ✅ You have advanced technical skills
- ✅ You need maximum privacy (e.g., vulnerable family situation)

**What you need:**
- NVIDIA GPU with 8GB+ VRAM
- 16-32GB system RAM
- SSD storage (200GB+)
- Docker Desktop + NVIDIA Container Toolkit
- 30-45 minutes to set up

**Cost:**
- One-time: $500-2000+ for GPU hardware
- After that: Free (100% no subscriptions)
- Alternative: Rent GPU on Vast.ai ($0.20-1.00/hour)

**Setup time:**
- 45 minutes (install Docker, NVIDIA Toolkit, pull models)

**Hardware Options:**

| GPU | VRAM | Price | Where to Buy |
|-----|------|-------|-------------|
| RTX 3060 (used) | 8GB | $250-350 | eBay, Facebook Marketplace |
| RTX 4060 Ti | 8GB | $300-400 | Amazon, Newegg |
| RTX 4080 | 16GB | $1100-1300 | Amazon, Newegg |
| NVIDIA Jetson AGX Orin | 12GB | $699 | NVIDIA official |
| A100 (used) | 40GB | $3000-5000 | Used markets |

**Alternative: Rent GPU as needed:**
- Vast.ai: $0.0.20-1.00/hour for RTX 3060-4090
- Perfect for: Run models when needed, pay per hour, no hardware cost
- Cost: ~$5-20/month with light usage

**How it works:**
```
Your Computer (Fully Self-Contained)
    ├─ PocketBase (database)
    ├─ Ollama (LLM, GPU-accelerated)
    ├─ Flux (Image gen, GPU-accelerated)
    ├─ SearXNG (Private search)
    └─ Piper (Text-to-speech)
    
    🔒 ZERO internet dependency
    ✅ 100% data privacy
    ✅ Works completely offline
```

**What you get:**
- ✅ Complete privacy (nothing leaves your home)
- ✅ Works offline (internet optional)
- ✅ Fast AI responses (GPU-accelerated)
- ✅ Image generation locally (no cloud)
- ✅ Private web search
- ✅ Full transparency (you control everything)

**Setup steps:**
1. Install NVIDIA Container Toolkit
2. Verify GPU: `nvidia-smi`
3. Download `docker-compose-full.yml`
4. Run: `docker compose -f docker-compose-full.yml up -d`
5. Wait for models to download (~30GB, variable speed)
6. In app: Settings → Server → Select "Full Local Mode"
7. Done! (No internet calls after model download)

---

## Decision Tree

```
Do you care about data privacy?
│
├─ NO → Use Tier 1: Cloud Only ✓
│       (Simplest, fastest, cheapest)
│
└─ YES → Do you have NVIDIA GPU?
    │
    ├─ NO → Use Tier 2: Hybrid ✓
    │       (Local data, best balance)
    │
    └─ YES → Use Tier 3: Full Local ✓
             (Maximum privacy, offline)
```

---

## Common Questions

### Q: Can I switch between tiers?

**A: Yes!** Your data is always portable. You can:
- Start with Tier 1 (Cloud)
- Move to Tier 2 (Hybrid) later
- Upgrade to Tier 3 (Full Local) when you get a GPU

Your lessons, child data, and progress follow you automatically.

### Q: What if my PC shuts down?

**Tier 1 (Cloud):** No problem, automatically backed up  
**Tier 2 (Hybrid):** Data stays safe on disk, auto-resumes when PC comes back  
**Tier 3 (Full Local):** Same, data persists on disk

### Q: Can I move between Tier 2 and Tier 1?

**A: Yes.** Toggle in Settings → Server & Sync:
- Switch to "Cloud Mode" → Uses cloud backup
- Switch to "Hybrid Mode" → Uses local Ollama
- Switch back and forth anytime

### Q: My hardware is underpowered. Can I still use Hybrid?

**A: Yes, but slower.**
- Minimum: 8GB RAM, 4-core CPU
- Tier 2 will work on older hardware, AI responses will be slower
- Try it for free in Docker (cancel anytime)

### Q: Is my data really private in Hybrid/Full Local?

**Tier 2 (Hybrid):**
- ✅ Database: Local (your computer)
- ✅ Lessons: Local
- ✅ Child progress: Local
- ⚠️ Image generation: Cloud (if Flux unavailable)
- ⚠️ Advanced AI: Cloud fallback (if Ollama down)

**Tier 3 (Full Local):**
- ✅ Everything: 100% local, zero cloud

### Q: How much disk space do I need?

**Tier 2 (Hybrid):**
- ~50GB for Ollama models
- ~10GB for PocketBase database
- ~20GB for backups
- Total: **80-100GB recommended**

**Tier 3 (Full Local):**
- ~50GB for Ollama models
- ~20GB for Flux models
- ~10GB for PocketBase database
- ~20GB for backups
- Total: **150-200GB recommended**

### Q: Can multiple family members access at once?

**Tier 1 (Cloud):** ✅ Yes, unlimited simultaneous users  
**Tier 2 (Hybrid):** ✅ Yes, but limited by your home internet speed  
**Tier 3 (Full Local):** ✅ Yes, same as Hybrid

### Q: What if I lose internet?

**Tier 1 (Cloud):** ❌ Can't access lessons or AI features  
**Tier 2 (Hybrid):** ✅ Can do lessons offline, AI might fail (falls back gracefully)  
**Tier 3 (Full Local):** ✅ Works perfectly offline, no interruption

---

## Setting Up Each Tier

### Tier 1: Cloud (Default)

**Steps:**
1. Download: `AlloFlow-Homeschool-Parent.exe` or `.dmg`
2. Install & run app
3. Create account
4. Onboarding wizard: Choose "Cloud Mode"
5. Connect ChatGPT/Gemini (OAuth)
6. **Done in 5 minutes**

---

### Tier 2 & 3: GPU Auto-Detection (Unified for All Deployments)

**IMPORTANT: GPU Auto-Detection**

When you launch AlloFlow (admin, student, teacher, OR homeschool), it **automatically detects your GPU** and configures Docker accordingly:

- ✅ **NVIDIA** (CUDA) — Auto-detected and configured
- ✅ **AMD** (ROCm) — Auto-detected and configured  
- ✅ **Apple Silicon** (Metal) — Auto-detected and configured
- ✅ **CPU-only** — Auto-fallback (slower, but works)

**You don't need to manually select which GPU type!** The app handles it all automatically.

---

### Tier 2: Hybrid (Local Data + Cloud AI Fallback)

**Prerequisites:**
- Docker Desktop installed (free download)
- 15-30 minutes free time
- Your GPU will be auto-detected (works with any GPU type: NVIDIA/AMD/Apple Silicon)

**Steps:**

```bash
# 1. Open terminal/PowerShell

# 2. Create folder for AlloFlow data
mkdir ~/alloflow-homeschool
cd ~/alloflow-homeschool

# 3. Download universal docker-compose + GPU setup scripts
curl -O https://download.alloflow.io/docker/docker-compose.universal.yml
curl -O https://download.alloflow.io/docker/docker-gpu-setup.js

# 4. Auto-detect GPU and generate configuration
#    (Creates docker-compose.override.yml + .env.gpu automatically)
node docker-gpu-setup.js

# 5. Start services (uses universal config + auto-generated overrides)
docker compose -f docker-compose.universal.yml up -d

# 6. Verify all services running
docker compose ps
# Should show: pocketbase ✓, ollama ✓, searxng ✓, piper ✓

# 7. Open app and select Hybrid Mode
#    Settings → Server & Sync → Select "Hybrid Mode"
#    (App auto-detects local services)

# 8. Launch your first AI query
#    Triggers Ollama model download (~3GB, ~10 min)
```

**GPU Auto-Setup Explanation:**

The `docker-gpu-setup.js` script automatically:
- ✅ Detects your GPU (NVIDIA/AMD/Apple Silicon/CPU)
- ✅ Generates the correct `docker-compose.override.yml`
- ✅ Creates `.env.gpu` with GPU-specific environment variables
- ✅ Prints verification commands for your specific GPU type

**Troubleshooting:**
- Services won't start? → Make sure Docker Desktop is running
- Models won't download? → Check internet connection, disk space
- Slow responses? → Wait for Ollama model to finish downloading
- Port conflicts? → Change ports in docker-compose.universal.yml
- GPU not detected correctly? → Run `node gpu-detection.js` to debug

---

### Tier 3: Full Local (100% Offline, All Services Local)

**Prerequisites:**
- Docker Desktop installed
- Any GPU with 8GB+ VRAM (NVIDIA, AMD, or Apple Silicon)
- 45-60 minutes free time
- Good internet (to download ~30GB models once)

**Steps:**

```bash
# 1. Create folder
mkdir ~/alloflow-fulllocal
cd ~/alloflow-fulllocal

# 2. Download universal docker-compose + GPU setup scripts
curl -O https://download.alloflow.io/docker/docker-compose.universal.yml
curl -O https://download.alloflow.io/docker/docker-gpu-setup.js

# 3. Auto-detect GPU and generate configuration (includes Flux)
node docker-gpu-setup.js

# 4. Start all services (including Flux for local image generation)
docker compose -f docker-compose.universal.yml up -d

# 5. Watch model downloads
#    Flux: ~20GB (auto-downloads)
#    Ollama: ~4GB (auto-downloads on first AI query)
docker logs -f alloflow-ollama
docker logs -f alloflow-flux

# 6. Verify all services running
docker compose ps
# Should show: pocketbase ✓, ollama ✓, flux ✓, searxng ✓, piper ✓

# 7. Open app and select Full Local Mode
#    Settings → Server & Sync → Select "Full Local Mode"
```

**GPU-Specific Verification Commands:**

After running `docker-gpu-setup.js`, it will print verification commands specific to your GPU:

**For NVIDIA:**
```bash
nvidia-smi                                          # Shows NVIDIA GPU
docker run --rm --gpus all ubuntu nvidia-smi       # Test Docker CUDA support
```

**For AMD:**
```bash
rocm-smi                                            # Shows AMD GPU
docker run --rm --device=/dev/kfd rocm/rocm rocm-smi  # Test Docker ROCm
```

**For Apple Silicon:**
```bash
system_profiler SPDisplaysDataType                  # Shows M1/M2/M3
docker exec alloflow-ollama ollama list             # Verify Metal auto-detection
```

---

## Maintenance & Backups

### Cloud Mode
- **Automatic:** AlloFlow handles all backups
- **Manual:** In-app: Settings → Backup & Sync → Export Full Record

### Hybrid Mode
- **Automatic:** Sync to cloud backup (optional toggle)
- **Manual Backup:**
  ```bash
  docker compose exec pocketbase tar czf backup.tar.gz pb_data/
  docker cp alloflow-homeschool-pocketbase:/pb/backup.tar.gz ~/backup.tar.gz
  ```
- **Manual Restore:**
  ```bash
  docker cp backup.tar.gz alloflow-homeschool-pocketbase:/pb/
  docker compose exec pocketbase tar xzf /pb/backup.tar.gz
  ```

### Full Local Mode
- **Same as Hybrid** (use manual commands)
- **Additional:** Backup `/models` folder for Ollama/Flux (large, optional)

---

## Cost Breakdown

### Tier 1: Cloud
- **Setup:** $0
- **Monthly:** $20-50 (AI APIs + cloud storage)
- **Yearly:** $240-600

### Tier 2: Hybrid
- **Setup:** $0-600 (depending on hardware)
- **Monthly:** $0 (completely free after setup)
- **Hardware lasts:** 3-5 years
- **Total cost per year:** $0 (or $40-120 if borrowing hardware)

### Tier 3: Full Local
- **Setup:** $500-2000+ (GPU hardware)
- **Monthly:** $0 (completely free)
- **Hardware lasts:** 3-5 years
- **Total cost per year:** $0 (or rent GPU for $5-20/month)

---

## Support & Resources

**Getting Help:**

- **Documentation:** See `HOMESCHOOL_ARCHITECTURE_SUMMARY.md`
- **Docker Help:** https://docs.docker.com/
- **Discord Community:** [link]
- **Email Support:** support@alloflow.io

**Video Guides (Coming Soon):**
- 5-min Cloud setup demo
- 20-min Hybrid setup walkthrough
- 30-min Full Local setup with GPU

---

**Ready to get started?** Choose your tier above and follow the setup steps. Welcome to AlloFlow Homeschool! 🎓
