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
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

// ── Secrets stored in Firebase Secret Manager ──
const SERPER_API_KEY = defineSecret("SERPER_API_KEY");
const LTI_CLIENT_ID = defineSecret("LTI_CLIENT_ID");
const LTI_DEPLOYMENT_ID = defineSecret("LTI_DEPLOYMENT_ID");
const LTI_PLATFORM_URL = defineSecret("LTI_PLATFORM_URL"); // e.g. https://usm.brightspace.com

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
