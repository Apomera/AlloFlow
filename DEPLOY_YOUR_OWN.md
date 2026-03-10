# AlloFlow — Self-Deployment Guide for Schools & Districts

> **Deploy your own AlloFlow instance in ~15 minutes.**
> Your data stays in YOUR Firebase project. The AlloFlow team never touches it.

---

## Prerequisites

- **Node.js 18+** — [download](https://nodejs.org)
- **A Google account** (for Firebase — free tier is sufficient)
- **Optional**: A [Gemini API key](https://aistudio.google.com/apikey) (free tier: 1,500 requests/day)

---

## Step 1: Create Your Firebase Project (5 min)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** → name it (e.g., `oakwood-alloflow`)
3. Disable Google Analytics (not needed) → **Create**
4. Once created, click **⚙️ Project Settings** → scroll to **"Your apps"**
5. Click **Web** (</>) icon → register app name (e.g., `alloflow-web`)
6. Firebase will show your config — **copy it** (you'll need it in Step 3)

### Enable Authentication
1. In Firebase Console → **Build** → **Authentication**
2. Click **Get started**
3. Enable **Anonymous** sign-in method → **Save**

### Enable Firestore
1. In Firebase Console → **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** → select your region → **Create**

---

## Step 2: Install Firebase CLI & Clone AlloFlow

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to your Firebase account
firebase login

# Clone AlloFlow
git clone https://github.com/Apomera/AlloFlow.git
cd AlloFlow/prismflow-deploy
npm install
```

---

## Step 3: Configure Your Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with YOUR Firebase project values from Step 1:

```env
REACT_APP_API_KEY=your-firebase-api-key
REACT_APP_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_PROJECT_ID=your-project-id
REACT_APP_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_APP_ID=your-app-id
REACT_APP_MEASUREMENT_ID=
REACT_APP_GEMINI_API_KEY=your-gemini-key-or-leave-blank
GENERATE_SOURCEMAP=false
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

> **Note**: If you plan to use local AI models (Ollama) instead of Gemini,
> you can leave `REACT_APP_GEMINI_API_KEY` blank. Students/teachers
> configure the AI backend in the app settings.

---

## Step 4: Set Firebase Project

Edit `.firebaserc` to point to YOUR project:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Or run:
```bash
firebase use --add your-project-id
```

---

## Step 5: Build & Deploy

```bash
npm run build
firebase deploy --only hosting
```

Your AlloFlow instance is now live at:
```
https://your-project-id.web.app
```

---

## Step 6: Optional — Enable Local AI

To run AI processing on school hardware instead of cloud:

1. Install [Ollama](https://ollama.com) on a school computer
2. Run: `ollama pull phi3.5` (or any preferred model)
3. In AlloFlow → **AI Backend Settings** → select **Ollama (Local)**
4. AI now runs entirely on-premises — no student data leaves the building

---

## Data Privacy

| Question | Answer |
|----------|--------|
| Who owns the Firebase project? | **You do.** You created it with your Google account. |
| Who has access to student data? | **Only your staff.** Firebase project access is controlled by you. |
| Does AlloFlow send data to its developers? | **No.** The app runs in your Firebase project. We have zero access. |
| What data is stored? | Anonymous session IDs, lesson content, quiz responses. No PII by default. |
| FERPA compliant? | **Yes.** Data stays in your Firebase project, under your control. |

---

## Updating AlloFlow

When a new version is released:

```bash
cd AlloFlow
git pull origin main
cd prismflow-deploy
npm install
npm run build
firebase deploy --only hosting
```

Your `.env` and `.firebaserc` are gitignored — they won't be overwritten.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Firebase project not found" | Run `firebase use --add your-project-id` |
| Build fails | Ensure Node.js 18+: `node --version` |
| Blank page after deploy | Check `.env` values match your Firebase project |
| AI not working | Verify Gemini API key or Ollama is running locally |

---

## Support

- GitHub Issues: [github.com/Apomera/AlloFlow/issues](https://github.com/Apomera/AlloFlow/issues)
- Documentation: [github.com/Apomera/AlloFlow/wiki](https://github.com/Apomera/AlloFlow/wiki)
