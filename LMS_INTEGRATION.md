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
| `LMS_CLIENT_ID` | Brightspace OAuth2 app client ID | `a1b2c3d4-...` | Brightspace Admin → Manage Extensibility → OAuth 2.0 |
| `LMS_CLIENT_SECRET` | Brightspace OAuth2 app secret | `secret123...` | Same as above (shown once at creation) |

---

## Step 5: Enable Institutional Dashboard

The dashboard automatically tracks every remediation performed on your instance.

1. **Enable Firestore** in your Firebase Console (Database → Create Database → Production mode)
2. **Deploy Cloud Functions:** `firebase deploy --only functions`
3. Every remediation now logs to Firestore automatically
4. View dashboard data: `GET https://YOUR-PROJECT-ID.web.app/api/dashboardData?days=30`

**Dashboard API returns:**
- Total remediations, average before/after scores, compliance rate
- Per-department breakdown
- Documents needing expert review
- Recent activity feed

---

## Step 6: Enable LMS Document Scanning

Automated weekly scanning of all Brightspace courses for inaccessible documents.

1. **Create an OAuth2 app in Brightspace:**
   - Go to **Admin Tools → Manage Extensibility → OAuth 2.0**
   - Click **Register an App**
   - Name: "AlloFlow Scanner"
   - Redirect URI: `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/lmsAuth`
   - Scope: `core:*:* content:modules:read content:topics:read organizations:orgunit:read`
   - Copy the **Client ID** and **Client Secret**

2. **Set Firebase Secrets:**
   ```bash
   firebase functions:secrets:set LMS_CLIENT_ID
   firebase functions:secrets:set LMS_CLIENT_SECRET
   ```

3. **Authorize the connection:**
   - Visit `https://YOUR-PROJECT-ID.web.app/api/lmsAuth` in your browser
   - Log in with a Brightspace admin account and grant consent
   - You'll see "LMS Authorization Successful"

4. **Scanning runs automatically** every Sunday at 2 AM ET
   - Trigger a manual scan: `POST https://YOUR-PROJECT-ID.web.app/api/triggerLmsScan`
   - View latest scan results: `GET https://YOUR-PROJECT-ID.web.app/api/scanResults`

---

## Step 7: Enable Accessible Document Server

Serve remediated documents directly to students with alternative format options.

After any remediation, the accessible version can be stored and shared:

1. **Store a remediated document:**
   ```
   POST /api/storeRemediated
   Body: { html: "<accessible HTML>", fileName: "syllabus.pdf", afterScore: 92 }
   Response: { docId: "syllabus-abc123", accessUrl: "https://YOUR-PROJECT-ID.web.app/api/accessible?doc=syllabus-abc123" }
   ```

2. **Share the URL with students.** They can:
   - View the accessible HTML version (with alt-format toolbar)
   - Download as Plain Text, Markdown, or Electronic Braille
   - Print to PDF

3. **Embed in Brightspace:** Add the URL as an External Link in course content. Students click it and get the accessible version with alt-format options — no login required.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────┐
│   LMS           │     │   Firebase Cloud          │     │  AlloFlow   │
│  (Brightspace,  │────>│   Functions               │     │  Web App    │
│   Canvas, etc.) │     │                           │     │  (static)   │
│                 │     │  Auth:                    │     │             │
│  Students see   │     │    ltiLogin               │────>│  Remediation│
│  alt-format     │<────│    ltiLaunch              │     │  Pipeline   │
│  links in       │     │    ltiSession             │     │             │
│  course content │     │    lmsAuth (OAuth2)       │     │  80+ UDL    │
│                 │     │                           │     │  Tools      │
│                 │     │  Dashboard:               │     │             │
│                 │     │    logRemediation          │     │             │
│                 │     │    dashboardData           │     │             │
│                 │     │                           │     │             │
│                 │     │  LMS Scanning:            │     │             │
│                 │     │    lmsScan (weekly)        │     │             │
│                 │     │    triggerLmsScan          │     │             │
│                 │     │    scanResults             │     │             │
│                 │     │                           │     │             │
│                 │     │  Document Server:          │     │             │
│                 │     │    accessible (serve docs) │     │             │
│                 │     │    storeRemediated         │     │             │
│                 │     │                           │     │             │
└─────────────────┘     └──────────────────────────┘     └─────────────┘
                               │           │
                        Firebase Secrets   Firestore
                        (per-institution)  (compliance data)
```

Each institution deploys their own Firebase project. No shared infrastructure. All data stays within the institution's own Google Cloud project. FERPA-compliant by design.

---

## Support

- **Source:** [github.com/Apomera/AlloFlow](https://github.com/Apomera/AlloFlow)
- **License:** GNU AGPL v3
- **Contact:** [Your contact info]
