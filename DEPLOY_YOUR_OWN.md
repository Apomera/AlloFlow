# AlloFlow self-deployment for schools and districts

This path is intentionally conservative. A plain Firebase deploy publishes the static app only. It does not publish Cloud Functions or open Firestore.

For the strongest privacy and the full local AI path, use AlloFlow Desktop. Gemini Canvas remains the keyless Google-managed path.

## 1. Create a Firebase project

1. Create a project in the [Firebase Console](https://console.firebase.google.com).
2. Register a Web app and copy its public Firebase configuration.
3. Create Firestore in **production mode**. Leave it fail-closed unless you explicitly enable live sessions below.
4. Do not place Gemini, OpenAI, Anthropic, LMS, or other provider secrets in a `REACT_APP_*` variable. Those values are compiled into the public browser bundle.

## 2. Install and configure

Prerequisites: Node.js 18 or newer for the web build, a Google account, and the Firebase CLI.

```bash
npm install -g firebase-tools
firebase login
git clone https://github.com/Apomera/AlloFlow.git
cd AlloFlow/desktop/web-app
npm install
cp .env.example .env
```

Fill in only the public Firebase Web configuration:

```env
REACT_APP_API_KEY=your-public-firebase-web-api-key
REACT_APP_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_PROJECT_ID=your-project-id
REACT_APP_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_APP_ID=your-app-id
REACT_APP_MEASUREMENT_ID=
REACT_APP_FIREBASE_APP_CHECK_SITE_KEY=
GENERATE_SOURCEMAP=false
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

Set the project explicitly:

```bash
firebase use --add your-project-id
```

Confirm that `firebase use` and `REACT_APP_PROJECT_ID` name the same project before every deployment.

## 3. Safe default: hosting only

```bash
npm run build
firebase deploy --only hosting
```

The default [firebase.json](./desktop/web-app/firebase.json) contains no Functions source, Function rewrites, or Firestore rule deployment. A plain `firebase deploy` is therefore also hosting-only.

In this mode:

- Static and local-first features work.
- Firestore stays at the production-mode deny policy.
- Cloud live sessions, the optional Serper search proxy, and Lumen's first-party public-page importer are unavailable.
- No cloud AI billing credential is compiled into the app.

## 4. Optional live sessions

Live sessions use anonymous Firebase identities as short-lived transport identities. Anonymous authentication does **not** prove that someone is district staff.

Before enabling live sessions:

1. Enable Firebase Authentication's Anonymous provider.
2. Register the hosted Web app with Firebase App Check using reCAPTCHA Enterprise.
3. Put the reCAPTCHA Enterprise site key in `REACT_APP_FIREBASE_APP_CHECK_SITE_KEY` and rebuild.
4. Test teacher, student QR, homework, and incognito flows while App Check is in monitoring mode.
5. Deploy the version-controlled rules and TTL policies:

```bash
firebase deploy -c firebase.live-sessions.json --only firestore:rules,firestore:indexes
```

6. In Firebase Console, enforce App Check for Firestore after the monitored flows are healthy.

The rules deny session listing, isolate host and participant writes, bind chunked assets to their owner and parent session, deny retired concept-mastery data, and expire asset/signaling records through Firestore TTL. A district that requires verified teacher identity should keep live sessions disabled until Workspace sign-in or teacher custom claims are implemented.

## 5. Optional authenticated web Functions

Two narrowly scoped Cloud Functions are supported: `searchProxy` for Serper results and `sourceFetchProxy` for Lumen's public-page import. Node.js 22 is required for deployment.

1. Complete the App Check setup above.
2. Set the server-side Serper secret:

```bash
firebase functions:secrets:set SERPER_API_KEY
```

3. If you use a custom domain, set `ALLOFLOW_ALLOWED_ORIGINS` to a comma-separated exact-origin allowlist when Firebase prompts for the parameter.
4. Deploy through the explicit optional configuration:

```bash
firebase deploy -c firebase.functions.json --only functions:searchProxy,functions:sourceFetchProxy,hosting,firestore:indexes
```

Both routes accept POST only and require a valid Firebase ID token plus App Check. They enforce strict origins, input limits, separate Firestore-backed per-user quotas, capped instances, and no-store responses. The page importer additionally resolves and pins public DNS answers, revalidates every redirect, blocks private/reserved targets, accepts text content only, and applies strict time and byte limits. Only `searchProxy` needs the Serper secret.

Gemini Canvas does not fall back to the maintainer's Firebase proxy. It keeps its own keyless environment path.

## Deliberately unavailable Firebase services

The prior experimental LTI, LMS scan, dashboard, remediation-log, and accessible-HTML endpoints are not exported or rewritten. They must not be restored without verified district identity, tenant/course isolation, durable one-time protocol state, authorization tests, and isolated/sanitized document rendering.

## Data and privacy boundaries

| Question | Current answer |
|---|---|
| Who owns the Firebase project? | The deploying school or district. |
| Does anonymous authentication mean staff-only? | No. It provides a per-browser identity, not staff verification. |
| What reaches Firestore when live sessions are enabled? | Session coordination data, teacher-prepared resources, anonymous roster/codename state, quiz/reaction state, and short-lived signaling/assets. |
| Does AlloFlow send Firebase data to its developer? | No, unless a deployer intentionally points the app at a developer-controlled service. The repository no longer provides that fallback. |
| Is deployment automatically FERPA compliant? | No. The district remains responsible for identity, policy, contracts, retention, configuration, and review. |

App Check reduces off-app abuse; it is not authorization. Security Rules protect data boundaries; they do not identify a teacher as staff.

## AI choices

- Gemini Canvas: keyless host-provided Gemini path.
- Desktop: local engine or another school-controlled provider.
- Firebase hosting: local/district endpoint configuration only. Do not compile a provider key into the browser.
- A future district AI proxy should keep credentials in Secret Manager and enforce staff/tenant quotas server-side.

## Updating

```bash
git pull origin main
cd desktop/web-app
npm install
npm run build
firebase deploy --only hosting
```

If you enabled an optional service, review its security notes and redeploy its explicit configuration separately. Never replace production Firestore rules with test-mode allow-all rules to troubleshoot an app.

## Troubleshooting

| Issue | Safer response |
|---|---|
| Firebase project not found | Run `firebase use --add your-project-id` and verify `firebase use`. |
| Live sessions are denied | Keep Firestore fail-closed; complete the optional live-session and App Check checklist. |
| Search proxy returns 401/403 | Verify Anonymous Auth, App Check registration/enforcement, the site key, and exact allowed origin. |
| AI is unavailable | Use Gemini Canvas, AlloFlow Desktop, or a school-controlled local/district endpoint. Do not add a browser build secret. |
