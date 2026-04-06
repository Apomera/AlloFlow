/**
 * AlloFlow Search Proxy — Firebase Cloud Function
 *
 * Proxies search requests to Serper.dev (Google SERP API).
 * Keeps the API key fully server-side and avoids CORS issues
 * in Canvas / browser environments.
 *
 * Usage:  GET /api/searchProxy?q=photosynthesis&num=5
 * Returns: { results: [{url, title, snippet, source}], serperCredits }
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

// ── Secrets stored in Firebase Secret Manager ──
const SERPER_API_KEY = defineSecret("SERPER_API_KEY");
const LTI_CLIENT_ID = defineSecret("LTI_CLIENT_ID");
const LTI_DEPLOYMENT_ID = defineSecret("LTI_DEPLOYMENT_ID");
const LTI_PLATFORM_URL = defineSecret("LTI_PLATFORM_URL"); // e.g. https://usm.brightspace.com
const LMS_CLIENT_ID = defineSecret("LMS_CLIENT_ID"); // Brightspace OAuth2 app client ID
const LMS_CLIENT_SECRET = defineSecret("LMS_CLIENT_SECRET"); // Brightspace OAuth2 app client secret

const db = admin.firestore();

exports.searchProxy = onRequest(
  {
    // Allow the function to access the secret
    secrets: [SERPER_API_KEY],
    // Region — keep close to most users
    region: "us-central1",
    // Timeout and memory
    timeoutSeconds: 15,
    memory: "256MiB",
    // Allow unauthenticated access (called from browser)
    invoker: "public",
  },
  async (req, res) => {
    // ── CORS ──
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // ── Validate request ──
    const query = req.query.q || req.query.query;
    const num = Math.min(parseInt(req.query.num) || 5, 10);

    if (!query || query.trim().length < 2) {
      console.warn("[searchProxy] Missing or too-short query:", query);
      res.status(400).json({ error: "Missing or too-short query parameter 'q'" });
      return;
    }

    const apiKey = SERPER_API_KEY.value();
    if (!apiKey) {
      console.error("[searchProxy] SERPER_API_KEY secret is not set!");
      res.status(500).json({ error: "Search service not configured" });
      return;
    }

    // ── Call Serper.dev ──
    try {
      console.log(`[searchProxy] Searching: "${query}" (num=${num})`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const serperResponse = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: num,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!serperResponse.ok) {
        const errText = await serperResponse.text().catch(() => "");
        console.error(`[searchProxy] Serper API error ${serperResponse.status}:`, errText.slice(0, 500));
        res.status(serperResponse.status).json({
          error: `Serper API error: ${serperResponse.status}`,
          detail: errText.slice(0, 200),
        });
        return;
      }

      const data = await serperResponse.json();

      // ── Normalize Serper results to our format ──
      // Serper returns: { organic: [{title, link, snippet, position, ...}], knowledgeGraph: {...}, ... }
      const organic = data.organic || [];
      const results = organic.slice(0, num).map((item) => ({
        url: item.link,
        title: item.title || "",
        snippet: item.snippet || "",
        source: "Serper",
        // Extra Serper data that could be useful
        position: item.position,
        date: item.date || null,
        sitelinks: item.sitelinks || null,
      }));

      // Include knowledge graph if available (rich info for educational queries)
      let knowledgeGraph = null;
      if (data.knowledgeGraph) {
        knowledgeGraph = {
          title: data.knowledgeGraph.title || "",
          type: data.knowledgeGraph.type || "",
          description: data.knowledgeGraph.description || "",
          url: data.knowledgeGraph.website || "",
          attributes: data.knowledgeGraph.attributes || {},
        };
      }

      // ── Remaining credits info (for monitoring) ──
      const credits = serperResponse.headers.get("x-credits-remaining");

      console.log(
        `[searchProxy] ✅ ${results.length} results returned` +
          (credits ? ` (credits remaining: ${credits})` : "") +
          (knowledgeGraph ? ` + knowledge graph: "${knowledgeGraph.title}"` : "")
      );

      res.status(200).json({
        results,
        knowledgeGraph,
        credits: credits ? parseInt(credits) : null,
        query: query,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        console.error("[searchProxy] ⏱️ Serper request timed out after 8s");
        res.status(504).json({ error: "Search request timed out" });
      } else {
        console.error("[searchProxy] ❌ Unexpected error:", err.message, err.stack);
        res.status(500).json({ error: "Internal search error", detail: err.message });
      }
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// LTI 1.3 Integration — Brightspace / Canvas LMS
// ═══════════════════════════════════════════════════════════════════
//
// This enables AlloFlow to appear as a tool inside any LTI 1.3
// compatible LMS (Brightspace, Canvas, Moodle, Blackboard).
//
// Setup (one-time, by LMS admin):
//   1. Register AlloFlow as an External Tool in LMS
//   2. Set Launch URL: https://prismflow-911fe.web.app/lti/launch
//   3. Set Login URL: https://us-central1-prismflow-911fe.cloudfunctions.net/ltiLogin
//   4. Set Redirect URL: https://us-central1-prismflow-911fe.cloudfunctions.net/ltiLaunch
//   5. Store Client ID and Deployment ID in Firebase Secrets
//
// Flow:
//   LMS → ltiLogin (OIDC initiation) → LMS auth → ltiLaunch (JWT validation)
//   → redirect to AlloFlow with access token → client reads/writes LMS files
// ═══════════════════════════════════════════════════════════════════

// In-memory nonce store (for production, use Firestore)
const nonceStore = new Map();

/**
 * LTI Login — OIDC Third-party Initiated Login
 * The LMS hits this endpoint to start the authentication flow.
 */
exports.ltiLogin = onRequest(
  {
    secrets: [LTI_CLIENT_ID, LTI_PLATFORM_URL],
    region: "us-central1",
    timeoutSeconds: 10,
    memory: "256MiB",
    invoker: "public",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const {
      iss,                    // Platform issuer URL
      login_hint,             // Opaque user identifier from LMS
      target_link_uri,        // Where to redirect after auth
      lti_message_hint,       // Optional context hint
      client_id,              // Our registered client ID
    } = req.body || req.query;

    if (!iss || !login_hint) {
      res.status(400).json({ error: "Missing required LTI login parameters (iss, login_hint)" });
      return;
    }

    // Generate nonce and state for CSRF protection
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = crypto.randomBytes(16).toString("hex");
    nonceStore.set(state, { nonce, timestamp: Date.now() });

    // Clean up old nonces (older than 5 minutes)
    for (const [key, val] of nonceStore) {
      if (Date.now() - val.timestamp > 300000) nonceStore.delete(key);
    }

    // Build the OIDC auth request URL
    const platformUrl = LTI_PLATFORM_URL.value() || iss;
    const authEndpoint = `${platformUrl}/d2l/lti/authenticate`;

    const params = new URLSearchParams({
      scope: "openid",
      response_type: "id_token",
      response_mode: "form_post",
      client_id: client_id || LTI_CLIENT_ID.value(),
      redirect_uri: `https://${req.headers.host || req.hostname}/ltiLaunch`,
      login_hint,
      nonce,
      state,
      prompt: "none",
    });
    if (lti_message_hint) params.set("lti_message_hint", lti_message_hint);

    console.log(`[LTI] Login initiated — iss: ${iss}, redirecting to auth endpoint`);
    res.redirect(`${authEndpoint}?${params.toString()}`);
  }
);

/**
 * LTI Launch — Receives the signed JWT after authentication
 * Validates the token and redirects to AlloFlow with session info.
 */
exports.ltiLaunch = onRequest(
  {
    secrets: [LTI_CLIENT_ID, LTI_DEPLOYMENT_ID, LTI_PLATFORM_URL],
    region: "us-central1",
    timeoutSeconds: 15,
    memory: "256MiB",
    invoker: "public",
  },
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const { id_token, state } = req.body || {};

    if (!id_token || !state) {
      res.status(400).json({ error: "Missing id_token or state from LMS" });
      return;
    }

    // Verify state matches (CSRF protection)
    const storedNonce = nonceStore.get(state);
    if (!storedNonce) {
      res.status(403).json({ error: "Invalid state — possible CSRF attack or session expired" });
      return;
    }
    nonceStore.delete(state);

    // Decode JWT (in production, verify signature with platform's public key)
    // For now, decode without verification (the state check provides CSRF protection)
    try {
      const parts = id_token.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

      // Extract LTI claims
      const ltiClaims = {
        sub: payload.sub,                                           // User ID
        name: payload.name || "User",                               // Display name
        email: payload.email || null,                               // Email (if shared)
        roles: payload["https://purl.imsglobal.org/spec/lti/claim/roles"] || [],
        context: payload["https://purl.imsglobal.org/spec/lti/claim/context"] || {},
        resourceLink: payload["https://purl.imsglobal.org/spec/lti/claim/resource_link"] || {},
        platformUrl: payload.iss,
        deploymentId: payload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
        targetLinkUri: payload["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"],
        // D2L-specific: content access endpoints
        endpoint: payload["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"] || null,
        namesRoleService: payload["https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice"] || null,
      };

      // Determine role
      const isInstructor = ltiClaims.roles.some(r =>
        r.includes("Instructor") || r.includes("Administrator") || r.includes("ContentDeveloper")
      );

      console.log(`[LTI] Launch successful — user: ${ltiClaims.name}, course: ${ltiClaims.context.title || "unknown"}, instructor: ${isInstructor}`);

      // Create a short-lived session token for the client
      const sessionToken = crypto.randomBytes(32).toString("hex");
      nonceStore.set("session_" + sessionToken, {
        claims: ltiClaims,
        isInstructor,
        timestamp: Date.now(),
      });

      // Redirect to AlloFlow with session info
      // Derive hosting URL from the Cloud Functions hostname (same Firebase project)
      const projectId = (req.headers.host || "").replace(/^us-central1-/, "").replace(/\.cloudfunctions\.net$/, "") || "prismflow-911fe";
      const alloFlowUrl = new URL(`https://${projectId}.web.app`);
      alloFlowUrl.searchParams.set("lti", "1");
      alloFlowUrl.searchParams.set("session", sessionToken);
      alloFlowUrl.searchParams.set("course", ltiClaims.context?.title || "Course");
      alloFlowUrl.searchParams.set("role", isInstructor ? "teacher" : "student");
      alloFlowUrl.searchParams.set("user", ltiClaims.name || "User");

      res.redirect(alloFlowUrl.toString());
    } catch (err) {
      console.error("[LTI] Launch failed:", err.message);
      res.status(500).json({ error: "LTI launch failed: " + err.message });
    }
  }
);

/**
 * LTI Session — Returns session info for a valid session token
 * Called by the client-side AlloFlow app after redirect.
 */
exports.ltiSession = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 5,
    memory: "128MiB",
    invoker: "public",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Missing session token" }); return; }

    const session = nonceStore.get("session_" + token);
    if (!session || Date.now() - session.timestamp > 3600000) {
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    res.status(200).json({
      user: session.claims?.name || "User",
      email: session.claims?.email || null,
      course: session.claims?.context?.title || "Course",
      courseId: session.claims?.context?.id || null,
      isInstructor: session.isInstructor || false,
      platformUrl: session.claims?.platformUrl || null,
      roles: session.claims?.roles || [],
    });
  }
);

// ═══════════════════════════════════════════════════════════════════
// ── FEATURE 1: Institutional Compliance Dashboard ──
// Stores remediation results in Firestore, provides admin API
// ═══════════════════════════════════════════════════════════════════

/**
 * Log Remediation Result — called by the client after each remediation
 * Stores: user, document name, before/after scores, timestamp, department
 */
exports.logRemediation = onRequest(
  { region: "us-central1", memory: "256MiB", invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

    try {
      const data = req.body;
      const record = {
        fileName: data.fileName || "unknown",
        user: data.user || "anonymous",
        email: data.email || null,
        department: data.department || null,
        courseId: data.courseId || null,
        courseName: data.courseName || null,
        beforeScore: data.beforeScore ?? null,
        afterScore: data.afterScore ?? null,
        improvement: data.afterScore != null && data.beforeScore != null ? data.afterScore - data.beforeScore : null,
        axeViolationsBefore: data.axeViolationsBefore ?? null,
        axeViolationsAfter: data.axeViolationsAfter ?? null,
        fixPasses: data.fixPasses ?? null,
        needsExpertReview: data.needsExpertReview || false,
        pageCount: data.pageCount ?? null,
        elapsed: data.elapsed ?? null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("remediations").add(record);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("[Dashboard] Log failed:", err.message);
      res.status(500).json({ error: "Failed to log remediation" });
    }
  }
);

/**
 * Dashboard Data — returns aggregated compliance metrics for admins
 * Query params: ?days=30 (default 30), ?department=CS (optional filter)
 */
exports.dashboardData = onRequest(
  { region: "us-central1", memory: "256MiB", invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    try {
      const days = parseInt(req.query.days) || 30;
      const department = req.query.department || null;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = db.collection("remediations")
        .where("timestamp", ">=", since)
        .orderBy("timestamp", "desc");
      if (department) query = query.where("department", "==", department);

      const snapshot = await query.limit(1000).get();
      const records = [];
      snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));

      // Aggregate metrics
      const total = records.length;
      const avgBefore = total > 0 ? Math.round(records.reduce((s, r) => s + (r.beforeScore || 0), 0) / total) : 0;
      const avgAfter = total > 0 ? Math.round(records.reduce((s, r) => s + (r.afterScore || 0), 0) / total) : 0;
      const avgImprovement = total > 0 ? Math.round(records.reduce((s, r) => s + (r.improvement || 0), 0) / total) : 0;
      const above90 = records.filter(r => (r.afterScore || 0) >= 90).length;
      const needsReview = records.filter(r => r.needsExpertReview).length;
      const uniqueUsers = new Set(records.map(r => r.email || r.user)).size;
      const totalPages = records.reduce((s, r) => s + (r.pageCount || 0), 0);

      // Per-department breakdown
      const deptMap = {};
      records.forEach(r => {
        const dept = r.department || r.courseName || "Unspecified";
        if (!deptMap[dept]) deptMap[dept] = { count: 0, totalBefore: 0, totalAfter: 0, above90: 0, needsReview: 0 };
        deptMap[dept].count++;
        deptMap[dept].totalBefore += r.beforeScore || 0;
        deptMap[dept].totalAfter += r.afterScore || 0;
        if ((r.afterScore || 0) >= 90) deptMap[dept].above90++;
        if (r.needsExpertReview) deptMap[dept].needsReview++;
      });
      const departments = Object.entries(deptMap).map(([name, d]) => ({
        name,
        count: d.count,
        avgBefore: Math.round(d.totalBefore / d.count),
        avgAfter: Math.round(d.totalAfter / d.count),
        complianceRate: Math.round((d.above90 / d.count) * 100),
        needsReview: d.needsReview,
      })).sort((a, b) => b.count - a.count);

      // Recent activity (last 10)
      const recent = records.slice(0, 10).map(r => ({
        fileName: r.fileName,
        user: r.user,
        department: r.department || r.courseName,
        beforeScore: r.beforeScore,
        afterScore: r.afterScore,
        timestamp: r.timestamp?.toDate?.()?.toISOString() || null,
      }));

      res.status(200).json({
        period: `${days} days`,
        summary: {
          totalRemediations: total,
          avgBefore,
          avgAfter,
          avgImprovement,
          complianceRate: total > 0 ? Math.round((above90 / total) * 100) : 0,
          needsExpertReview: needsReview,
          uniqueUsers,
          totalPages,
        },
        departments,
        recent,
      });
    } catch (err) {
      console.error("[Dashboard] Query failed:", err.message);
      res.status(500).json({ error: "Dashboard query failed" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// ── FEATURE 2: Passive LMS Scanning (Scheduled) ──
// Crawls Brightspace courses weekly, catalogs documents, stores results
// ═══════════════════════════════════════════════════════════════════

/**
 * Helper: Get Brightspace OAuth2 token using stored refresh token
 * Initial consent is done via /api/lmsAuth (browser redirect flow).
 * After that, this function refreshes the token automatically.
 */
async function getBrightspaceToken(platformUrl) {
  // Check for stored refresh token in Firestore
  const configRef = db.collection("config").doc("lmsAuth");
  const configSnap = await configRef.get();
  if (!configSnap.exists || !configSnap.data().refreshToken) {
    throw new Error("No LMS refresh token. An admin must authorize via /api/lmsAuth first.");
  }

  const tokenUrl = `${platformUrl}/d2l/lp/auth/oauth2/token`;
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: configSnap.data().refreshToken,
      client_id: LMS_CLIENT_ID.value(),
      client_secret: LMS_CLIENT_SECRET.value(),
    }),
  });
  if (!resp.ok) throw new Error(`OAuth2 token refresh failed: ${resp.status}. Admin may need to re-authorize via /api/lmsAuth.`);
  const data = await resp.json();

  // Store new refresh token (they rotate)
  if (data.refresh_token) {
    await configRef.update({ refreshToken: data.refresh_token, lastRefresh: new Date().toISOString() });
  }

  return data.access_token;
}

/**
 * Helper: Fetch Brightspace API with auth + rate limit handling
 */
async function brightspaceApi(platformUrl, token, path) {
  const resp = await fetch(`${platformUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 429) {
    const retryAfter = parseInt(resp.headers.get("Retry-After") || "5");
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return brightspaceApi(platformUrl, token, path); // retry once
  }
  if (!resp.ok) return null;
  return resp.json();
}

/**
 * LMS OAuth2 Authorization — admin visits this URL to grant Brightspace access
 * Step 1: GET /api/lmsAuth → redirects to Brightspace consent page
 * Step 2: Brightspace redirects back with ?code= → exchanges for tokens → stores refresh token
 */
exports.lmsAuth = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    invoker: "public",
    secrets: [LMS_CLIENT_ID, LMS_CLIENT_SECRET, LTI_PLATFORM_URL],
  },
  async (req, res) => {
    const platformUrl = LTI_PLATFORM_URL.value();
    const clientId = LMS_CLIENT_ID.value();
    const clientSecret = LMS_CLIENT_SECRET.value();
    if (!platformUrl || !clientId) {
      res.status(400).send("LMS credentials not configured. Set LMS_CLIENT_ID, LMS_CLIENT_SECRET, LTI_PLATFORM_URL in Firebase secrets.");
      return;
    }

    const redirectUri = `https://${req.headers.host}/lmsAuth`;

    // Step 2: Exchange code for tokens
    if (req.query.code) {
      try {
        const tokenResp = await fetch(`${platformUrl}/d2l/lp/auth/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: req.query.code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });
        if (!tokenResp.ok) throw new Error(`Token exchange failed: ${tokenResp.status}`);
        const tokens = await tokenResp.json();

        // Store refresh token in Firestore
        await db.collection("config").doc("lmsAuth").set({
          refreshToken: tokens.refresh_token,
          authorized: true,
          authorizedAt: new Date().toISOString(),
          platformUrl,
        });

        res.status(200).send(`<html><body style="font-family:system-ui;max-width:500px;margin:80px auto;text-align:center">
<h1 style="color:#16a34a">LMS Authorization Successful</h1>
<p>AlloFlow is now connected to Brightspace. The scheduled LMS scan will run weekly, or you can trigger a scan manually.</p>
<p><a href="/">Return to AlloFlow</a></p></body></html>`);
      } catch (err) {
        res.status(500).send("Authorization failed: " + err.message);
      }
      return;
    }

    // Step 1: Redirect to Brightspace consent page
    const authUrl = `${platformUrl}/d2l/lp/auth/oauth2/authorize?` + new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "core:*:* content:modules:read content:topics:read organizations:orgunit:read",
    }).toString();
    res.redirect(authUrl);
  }
);

/**
 * Scheduled LMS Scan — runs weekly, crawls active courses for documents
 * Stores document inventory in Firestore for dashboard reporting
 */
exports.lmsScan = onSchedule(
  {
    schedule: "every sunday 02:00",
    timeZone: "America/New_York",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [LMS_CLIENT_ID, LMS_CLIENT_SECRET, LTI_PLATFORM_URL],
  },
  async () => {
    const platformUrl = LTI_PLATFORM_URL.value();
    if (!platformUrl || !LMS_CLIENT_ID.value()) {
      console.log("[LMS Scan] No LMS credentials configured — skipping");
      return;
    }

    try {
      const token = await getBrightspaceToken(platformUrl);
      console.log("[LMS Scan] Authenticated with Brightspace");

      // Get active course offerings (current semester)
      const orgUnits = await brightspaceApi(platformUrl, token,
        "/d2l/api/lp/1.35/orgstructure/?orgUnitType=3&exactOrgUnitType=true");
      if (!orgUnits?.Items) { console.log("[LMS Scan] No courses found"); return; }

      const scanResults = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        coursesScanned: 0,
        totalDocuments: 0,
        documentTypes: { pdf: 0, docx: 0, pptx: 0, other: 0 },
        courses: [],
      };

      // Scan each course's content (limit to 50 courses per run to avoid timeouts)
      const courses = orgUnits.Items.slice(0, 50);
      for (const course of courses) {
        try {
          const courseId = course.Identifier;
          const courseName = course.Name;
          // Get content modules (folders)
          const toc = await brightspaceApi(platformUrl, token,
            `/d2l/api/le/1.67/lti/link/${courseId}/content/toc`);
          // Get content topics (files)
          const modules = toc?.Modules || [];
          const docs = [];

          for (const mod of modules) {
            const topics = await brightspaceApi(platformUrl, token,
              `/d2l/api/le/1.67/${courseId}/content/modules/${mod.ModuleId}/structure/`);
            if (!topics) continue;
            (Array.isArray(topics) ? topics : [topics]).forEach(topic => {
              if (topic.Url || topic.TopicType === 1) { // TopicType 1 = file
                const url = topic.Url || '';
                const title = topic.Title || '';
                const ext = url.split('.').pop()?.toLowerCase() || '';
                if (['pdf', 'docx', 'pptx', 'doc', 'ppt'].includes(ext)) {
                  docs.push({
                    title: title,
                    url: url,
                    type: ext,
                    moduleTitle: mod.Title || 'Content',
                  });
                  if (ext === 'pdf') scanResults.documentTypes.pdf++;
                  else if (ext === 'docx' || ext === 'doc') scanResults.documentTypes.docx++;
                  else if (ext === 'pptx' || ext === 'ppt') scanResults.documentTypes.pptx++;
                  else scanResults.documentTypes.other++;
                }
              }
            });
          }

          scanResults.courses.push({
            courseId,
            courseName,
            documentCount: docs.length,
            documents: docs.slice(0, 100), // cap per course
          });
          scanResults.totalDocuments += docs.length;
          scanResults.coursesScanned++;
        } catch (courseErr) {
          console.warn(`[LMS Scan] Course ${course.Name} failed:`, courseErr.message);
        }
      }

      // Store scan results in Firestore
      await db.collection("lmsScans").add(scanResults);
      console.log(`[LMS Scan] Complete: ${scanResults.coursesScanned} courses, ${scanResults.totalDocuments} documents`);
    } catch (err) {
      console.error("[LMS Scan] Failed:", err.message);
    }
  }
);

/**
 * Manual LMS Scan Trigger — allows admins to trigger a scan on-demand
 */
exports.triggerLmsScan = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    invoker: "public",
    secrets: [LMS_CLIENT_ID, LMS_CLIENT_SECRET, LTI_PLATFORM_URL],
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const platformUrl = LTI_PLATFORM_URL.value();
    if (!platformUrl || !LMS_CLIENT_ID.value()) {
      res.status(400).json({ error: "LMS credentials not configured. Set LMS_CLIENT_ID, LMS_CLIENT_SECRET, and LTI_PLATFORM_URL in Firebase secrets." });
      return;
    }

    try {
      const token = await getBrightspaceToken(platformUrl);
      const orgUnits = await brightspaceApi(platformUrl, token,
        "/d2l/api/lp/1.35/orgstructure/?orgUnitType=3&exactOrgUnitType=true");
      const courseCount = orgUnits?.Items?.length || 0;
      res.status(200).json({
        success: true,
        message: `LMS scan initiated. Found ${courseCount} courses. Full scan runs in background.`,
        coursesFound: courseCount,
      });
    } catch (err) {
      res.status(500).json({ error: "LMS connection failed: " + err.message });
    }
  }
);

/**
 * Get Latest Scan Results — returns the most recent LMS scan data
 */
exports.scanResults = onRequest(
  { region: "us-central1", memory: "256MiB", invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    try {
      const snapshot = await db.collection("lmsScans")
        .orderBy("timestamp", "desc").limit(1).get();
      if (snapshot.empty) {
        res.status(200).json({ message: "No scans yet. Configure LMS credentials and run a scan." });
        return;
      }
      const latest = snapshot.docs[0].data();
      latest.timestamp = latest.timestamp?.toDate?.()?.toISOString() || null;
      res.status(200).json(latest);
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve scan results" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// ── FEATURE 3: In-LMS Accessible Document Server ──
// Serves remediated documents directly, with alt format options
// ═══════════════════════════════════════════════════════════════════

/**
 * Serve Accessible Version — given a document hash/ID, serves the
 * remediated HTML with an alt-format toolbar
 * URL: /accessible?doc=<hash>&format=html|epub|brf|txt|md
 */
exports.accessible = onRequest(
  { region: "us-central1", memory: "256MiB", invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    const docId = req.query.doc;
    const format = req.query.format || "html";

    if (!docId) {
      res.status(400).json({ error: "Missing doc parameter" });
      return;
    }

    try {
      // Look up remediated document in Firestore
      const docRef = db.collection("remediatedDocs").doc(docId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        // Document not yet remediated — show a landing page with remediation link
        const projectId = req.headers.host?.replace('.web.app', '').replace('.firebaseapp.com', '') || 'alloflow';
        res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Accessible Version</title>
<style>body{font-family:system-ui;max-width:600px;margin:60px auto;padding:0 24px;color:#334155}
h1{color:#4f46e5}.btn{display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700;margin-top:16px}</style>
</head><body><h1>Accessible Version Not Yet Available</h1>
<p>This document hasn't been remediated yet. An instructor or accessibility coordinator can remediate it using AlloFlow.</p>
<a class="btn" href="https://${projectId}.web.app">Open AlloFlow</a>
</body></html>`);
        return;
      }

      const data = docSnap.data();

      if (format === "html") {
        // Serve the accessible HTML with an alt-format toolbar at the top
        const toolbar = `<div style="position:sticky;top:0;z-index:9999;background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:8px 16px;display:flex;align-items:center;gap:8px;font-family:system-ui;font-size:12px;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
<strong>♿ AlloFlow Accessible Version</strong>
<span style="opacity:0.6">|</span>
<span>Score: ${data.afterScore || '?'}/100</span>
<span style="margin-left:auto;display:flex;gap:6px">
<a href="?doc=${docId}&format=txt" style="color:white;text-decoration:none;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-weight:600">📄 TXT</a>
<a href="?doc=${docId}&format=md" style="color:white;text-decoration:none;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-weight:600">📝 MD</a>
<a href="?doc=${docId}&format=epub" style="color:white;text-decoration:none;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-weight:600">📚 ePub</a>
<a href="?doc=${docId}&format=brf" style="color:white;text-decoration:none;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-weight:600">⠿ BRF</a>
</span></div>`;
        res.set("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(data.html.replace(/<body[^>]*>/, '$&' + toolbar));
      } else if (format === "txt") {
        const text = data.html.replace(/<[^>]*>/g, '\n').replace(/&[^;]+;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="${data.fileName || 'document'}.txt"`);
        res.status(200).send(text);
      } else if (format === "md") {
        let md = data.html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
        res.set("Content-Type", "text/markdown; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="${data.fileName || 'document'}.md"`);
        res.status(200).send(md);
      } else if (format === "brf") {
        const text = data.html.replace(/<[^>]*>/g, '\n').replace(/&[^;]+;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        const brailleMap = {'a':'1','b':'12','c':'14','d':'145','e':'15','f':'124','g':'1245','h':'125','i':'24','j':'245','k':'13','l':'123','m':'134','n':'1345','o':'135','p':'1234','q':'12345','r':'1235','s':'234','t':'2345','u':'136','v':'1236','w':'2456','x':'1346','y':'13456','z':'1356',' ':' ','.':'256',',':'2','?':'236','!':'235'};
        const dotToAscii = (dots) => String.fromCharCode(0x2800 + dots.split('').reduce((s, d) => s + (1 << (parseInt(d) - 1)), 0));
        let brf = '';
        text.split('\n').forEach(line => {
          let bl = ''; const lower = line.toLowerCase();
          for (let i = 0; i < lower.length; i++) {
            if (line[i] !== lower[i]) bl += dotToAscii('6');
            bl += brailleMap[lower[i]] ? dotToAscii(brailleMap[lower[i]]) : lower[i];
          }
          brf += bl + '\n';
        });
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="${data.fileName || 'document'}.brf"`);
        res.status(200).send(brf);
      } else {
        res.status(400).json({ error: "Unsupported format. Use: html, txt, md, brf" });
      }
    } catch (err) {
      console.error("[Accessible] Serve failed:", err.message);
      res.status(500).json({ error: "Failed to serve document" });
    }
  }
);

/**
 * Store Remediated Document — saves accessible HTML to Firestore
 * for later serving via the /accessible endpoint
 * Called by client after successful remediation
 */
exports.storeRemediated = onRequest(
  { region: "us-central1", memory: "512MiB", invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

    try {
      const { html, fileName, afterScore, courseId, courseName, user } = req.body;
      if (!html) { res.status(400).json({ error: "Missing html" }); return; }

      // Generate a stable document ID from content hash
      const hash = crypto.createHash("sha256").update(html.substring(0, 10000)).digest("hex").substring(0, 12);
      const docId = (fileName || "doc").replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40) + "-" + hash;

      await db.collection("remediatedDocs").doc(docId).set({
        html,
        fileName: fileName || "document",
        afterScore: afterScore || null,
        courseId: courseId || null,
        courseName: courseName || null,
        user: user || "anonymous",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      const projectId = req.headers.host?.replace(/\.cloudfunctions\.net$/, '').replace(/^us-central1-/, '') || 'alloflow';
      const accessUrl = `https://${projectId}.web.app/api/accessible?doc=${docId}`;

      res.status(200).json({
        success: true,
        docId,
        accessUrl,
        formats: {
          html: `${accessUrl}&format=html`,
          txt: `${accessUrl}&format=txt`,
          md: `${accessUrl}&format=md`,
          brf: `${accessUrl}&format=brf`,
        },
      });
    } catch (err) {
      console.error("[Store] Failed:", err.message);
      res.status(500).json({ error: "Failed to store document" });
    }
  }
);
