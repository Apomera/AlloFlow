# AlloFlow LMS Integration Guide

## Quick Start: Bookmarklet (Any LMS, Zero Setup)

1. Open `lms_bookmarklet.js` from this repo
2. Copy the minified bookmarklet URL from the bottom of the file
3. Create a new browser bookmark and paste it as the URL
4. Navigate to any LMS course page → click the bookmark
5. A panel appears listing all documents → click "Audit in AlloFlow"

**Works with:** Brightspace, Canvas, Moodle, Blackboard, Schoology, Google Classroom, or any web-based LMS.

---

## Full Integration: LTI 1.3 (Firebase Deployment)

### Prerequisites
- Your own Firebase project (free tier works)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Node.js 20+

### Step 1: Deploy AlloFlow to Your Firebase

```bash
git clone https://github.com/Apomera/AlloFlow.git
cd AlloFlow
npm install
cd functions && npm install && cd ..
firebase login
firebase use --add  # select your Firebase project
firebase deploy
```

### Step 2: Set Firebase Secrets for LTI

These secrets are obtained from your LMS admin when they register AlloFlow as an External Tool:

```bash
# Your LMS provides these when you register AlloFlow as an LTI tool:
firebase functions:secrets:set LTI_CLIENT_ID
# Prompt: Enter the Client ID from your LMS (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

firebase functions:secrets:set LTI_DEPLOYMENT_ID  
# Prompt: Enter the Deployment ID from your LMS (e.g., "1")

firebase functions:secrets:set LTI_PLATFORM_URL
# Prompt: Enter your LMS base URL (e.g., "https://youruniversity.brightspace.com")
```

### Step 3: Register AlloFlow in Your LMS

#### Brightspace (D2L)
1. Go to **Admin Tools → Manage Extensibility → LTI Advantage**
2. Click **Register Tool**
3. Enter:
   - **Name:** AlloFlow Accessibility Pipeline
   - **Domain:** `YOUR-PROJECT-ID.web.app`
   - **Login URL:** `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/ltiLogin`
   - **Redirect URL:** `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/ltiLaunch`
   - **Target Link URI:** `https://YOUR-PROJECT-ID.web.app`
4. Enable scopes: `openid`
5. Save → copy the **Client ID** and **Deployment ID** → set as Firebase secrets (Step 2)
6. Create a **Deployment** and link it to your org units (courses)

#### Canvas (Instructure)
1. Go to **Admin → Developer Keys → + Developer Key → LTI Key**
2. Enter the same Login/Redirect URLs with your Firebase project domain
3. Set **Method:** Manual Entry
4. Copy the Client ID → set as Firebase secret

#### Moodle
1. Go to **Site Administration → Plugins → External Tool → Manage Tools**
2. Click **Configure a tool manually**
3. Enter the Login/Redirect URLs
4. Set **LTI version:** 1.3

### Step 4: Add to Courses

#### Brightspace
- In a course: **Content → Add Existing Activity → External Learning Tools → AlloFlow**
- Faculty see AlloFlow as a tool in their course navigation

#### Canvas  
- In a course: **Settings → Apps → + App → By Client ID**

### What Faculty See

After setup, faculty click "AlloFlow" in their LMS course → AlloFlow opens knowing:
- Who they are (name, email)
- What course they're in
- Whether they're an instructor or student
- What files are in the course (with file API integration)

---

## Firebase Secrets Reference

| Secret | Description | Example | Where to Get It |
|--------|-------------|---------|-----------------|
| `LTI_CLIENT_ID` | OAuth client ID from LMS | `a1b2c3d4-...` | LMS admin panel after registering tool |
| `LTI_DEPLOYMENT_ID` | Deployment ID from LMS | `1` | LMS admin panel |
| `LTI_PLATFORM_URL` | Your LMS base URL | `https://uni.brightspace.com` | Your LMS URL |
| `SERPER_API_KEY` | (Optional) Web search API key | `abc123...` | serper.dev (free tier available) |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   LMS           │     │   Firebase Functions  │     │  AlloFlow   │
│  (Brightspace,  │────>│  ltiLogin             │     │  Web App    │
│   Canvas, etc.) │     │  ltiLaunch            │────>│  (static)   │
│                 │<────│  ltiSession           │     │             │
└─────────────────┘     └──────────────────────┘     └─────────────┘
                               │
                        Firebase Secrets
                        (per-institution)
```

Each institution deploys their own Firebase project. No shared infrastructure. FERPA-compliant by design.

---

## Support

- **Source:** [github.com/Apomera/AlloFlow](https://github.com/Apomera/AlloFlow)
- **License:** GNU AGPL v3
- **Contact:** [Your contact info]
