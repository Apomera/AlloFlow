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

// ── Serper API key stored in Firebase Secret Manager ──
const SERPER_API_KEY = defineSecret("SERPER_API_KEY");

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
