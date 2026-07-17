/**
 * Optional AlloFlow Firebase web services.
 *
 * This file intentionally exports only the authenticated search and public-page
 * import proxies. Institutional endpoints
 * (LTI, LMS scans, dashboards, remediation logs, and published HTML) are not
 * deployable until AlloFlow has district identity, tenant isolation, durable
 * session state, and an emulator-backed security test suite.
 */

"use strict";

const crypto = require("crypto");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { SourceFetchError, fetchPublicPage } = require("./web_source_fetch");

if (!admin.apps.length) admin.initializeApp();

const SERPER_API_KEY = defineSecret("SERPER_API_KEY");
const ALLOWED_ORIGINS = defineString("ALLOFLOW_ALLOWED_ORIGINS", { default: "" });
const SEARCH_REQUESTS_PER_MINUTE = 30;
const SOURCE_FETCH_REQUESTS_PER_MINUTE = 20;
const MAX_QUERY_LENGTH = 200;
const MAX_SOURCE_URL_LENGTH = 2048;
const MAX_RESULTS = 10;
const RATE_WINDOW_MS = 60 * 1000;
const db = admin.firestore();

function configuredOrigins() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
  const origins = new Set();
  if (projectId) {
    origins.add("https://" + projectId + ".web.app");
    origins.add("https://" + projectId + ".firebaseapp.com");
  }
  String(ALLOWED_ORIGINS.value() || "").split(",").map((value) => value.trim()).filter(Boolean)
    .forEach((value) => origins.add(value));
  return origins;
}

function setSecurityHeaders(res) {
  res.set("Cache-Control", "no-store");
  res.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
}

function applyCors(req, res) {
  const origin = String(req.get("Origin") || "");
  if (!origin || !configuredOrigins().has(origin)) return false;
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Firebase-AppCheck");
  res.set("Access-Control-Max-Age", "3600");
  res.set("Vary", "Origin");
  return true;
}

function sendError(res, status, code) {
  res.status(status).json({ error: code });
}

async function verifyCaller(req) {
  const authorization = String(req.get("Authorization") || "");
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match) {
    const error = new Error("missing-auth");
    error.status = 401;
    throw error;
  }
  const appCheckToken = String(req.get("X-Firebase-AppCheck") || "");
  if (!appCheckToken) {
    const error = new Error("missing-app-check");
    error.status = 401;
    throw error;
  }
  const [user, appCheck] = await Promise.all([
    admin.auth().verifyIdToken(match[1], true),
    admin.appCheck().verifyToken(appCheckToken),
  ]);
  if (!user.uid || !appCheck.appId) {
    const error = new Error("invalid-caller");
    error.status = 401;
    throw error;
  }
  return { uid: user.uid, appId: appCheck.appId };
}

async function enforceRateLimit(uid, scope = "search", limit = SEARCH_REQUESTS_PER_MINUTE) {
  const key = crypto.createHash("sha256").update(uid).digest("hex");
  const safeScope = String(scope || "request").replace(/[^a-z0-9_-]/gi, "_").slice(0, 32);
  const ref = db.collection("_alloflowRateLimits").doc(safeScope + "_" + key);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const record = snapshot.exists ? snapshot.data() : null;
    const windowStart = record && Number(record.windowStart) || 0;
    const count = record && Number(record.count) || 0;
    if (now - windowStart < RATE_WINDOW_MS && count >= limit) {
      const error = new Error("rate-limited");
      error.status = 429;
      throw error;
    }
    const nextWindow = now - windowStart < RATE_WINDOW_MS ? windowStart : now;
    const nextCount = now - windowStart < RATE_WINDOW_MS ? count + 1 : 1;
    transaction.set(ref, {
      windowStart: nextWindow,
      count: nextCount,
      expiresAt: admin.firestore.Timestamp.fromMillis(nextWindow + (10 * RATE_WINDOW_MS)),
    });
  });
}

function safeText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch (_) {
    return "";
  }
}

exports.searchProxy = onRequest(
  {
    secrets: [SERPER_API_KEY],
    region: "us-central1",
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 10,
    concurrency: 20,
    invoker: "public",
  },
  async (req, res) => {
    setSecurityHeaders(res);
    if (!applyCors(req, res)) {
      sendError(res, 403, "origin-not-allowed");
      return;
    }
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST, OPTIONS");
      sendError(res, 405, "method-not-allowed");
      return;
    }
    if (!req.is("application/json")) {
      sendError(res, 415, "json-required");
      return;
    }

    let caller;
    try {
      caller = await verifyCaller(req);
      await enforceRateLimit(caller.uid, "search", SEARCH_REQUESTS_PER_MINUTE);
    } catch (error) {
      const status = error && error.status || 401;
      if (status >= 500) console.error("[searchProxy] caller verification failed", error);
      sendError(res, status, status === 429 ? "rate-limited" : "unauthorized");
      return;
    }

    const query = safeText(req.body && req.body.query, MAX_QUERY_LENGTH);
    const requested = Number.parseInt(req.body && req.body.num, 10);
    const num = Number.isFinite(requested) ? Math.max(1, Math.min(requested, MAX_RESULTS)) : 5;
    if (query.length < 2) {
      sendError(res, 400, "invalid-query");
      return;
    }

    const apiKey = SERPER_API_KEY.value();
    if (!apiKey) {
      sendError(res, 503, "search-not-configured");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const upstream = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num }),
        signal: controller.signal,
      });
      if (!upstream.ok) {
        console.error("[searchProxy] upstream status", upstream.status);
        sendError(res, 502, "search-provider-error");
        return;
      }
      const data = await upstream.json();
      const results = (Array.isArray(data.organic) ? data.organic : []).slice(0, num).map((item) => ({
        url: safeHttpUrl(item && item.link),
        title: safeText(item && item.title, 300),
        snippet: safeText(item && item.snippet, 1000),
        source: "Serper",
      })).filter((item) => item.url);
      res.status(200).json({ results });
    } catch (error) {
      if (error && error.name === "AbortError") {
        sendError(res, 504, "search-timeout");
      } else {
        console.error("[searchProxy] request failed", error);
        sendError(res, 502, "search-provider-error");
      }
    } finally {
      clearTimeout(timeout);
    }
  }
);


exports.sourceFetchProxy = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 10,
    concurrency: 20,
    invoker: "public",
  },
  async (req, res) => {
    setSecurityHeaders(res);
    if (!applyCors(req, res)) {
      sendError(res, 403, "origin-not-allowed");
      return;
    }
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.set("Allow", "POST, OPTIONS");
      sendError(res, 405, "method-not-allowed");
      return;
    }
    if (!req.is("application/json")) {
      sendError(res, 415, "json-required");
      return;
    }

    let caller;
    try {
      caller = await verifyCaller(req);
      await enforceRateLimit(caller.uid, "source_fetch", SOURCE_FETCH_REQUESTS_PER_MINUTE);
    } catch (error) {
      const status = error && error.status || 401;
      if (status >= 500) console.error("[sourceFetchProxy] caller verification failed", error);
      sendError(res, status, status === 429 ? "rate-limited" : "unauthorized");
      return;
    }

    const sourceUrl = safeText(req.body && req.body.url, MAX_SOURCE_URL_LENGTH);
    if (!sourceUrl) {
      sendError(res, 400, "invalid-url");
      return;
    }
    try {
      const source = await fetchPublicPage(sourceUrl);
      res.status(200).json({
        url: source.url,
        title: safeText(source.title, 300),
        text: source.text,
        contentType: source.contentType,
        bytes: source.bytes,
        redirects: source.redirects,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof SourceFetchError) {
        sendError(res, error.status || 422, error.code || "source-fetch-failed");
        return;
      }
      console.error("[sourceFetchProxy] request failed", error);
      sendError(res, 502, "source-fetch-failed");
    }
  }
);
