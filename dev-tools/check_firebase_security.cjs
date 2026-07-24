#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const failures = [];
let checkCount = 0;
const check = (condition, message) => { checkCount += 1; if (!condition) failures.push(message); };

const defaultConfig = json("desktop/web-app/firebase.json");
const functionsConfig = json("desktop/web-app/firebase.functions.json");
const liveConfig = json("desktop/web-app/firebase.live-sessions.json");
const indexes = json("firestore.indexes.json");
const functions = read("desktop/web-app/functions/index.js");
const sourceFetch = read("desktop/web-app/functions/web_source_fetch.js");
const desktopSourceFetch = read("desktop/runtime/web-source-fetch.cjs");
const lumen = read("stem_lab/stem_lumen_study.js");
const ai = read("ai_backend_module.js");
const app = read("AlloFlowANTI.txt");
const env = read("desktop/web-app/.env.example");
const rules = read("firestore.rules");
const guide = read("DEPLOY_YOUR_OWN.md");

check(read("desktop/web-app/firestore.rules") === rules, "deploy Firestore rules mirror must match canonical rules");
check(read("desktop/web-app/firestore.indexes.json") === read("firestore.indexes.json"), "deploy Firestore indexes mirror must match canonical indexes");

check(!defaultConfig.functions, "default firebase.json must not deploy Functions");
check(!(defaultConfig.hosting.rewrites || []).some((rule) => rule.function), "default hosting must not contain Function rewrites");
const allowedFunctions = new Set(["searchProxy", "sourceFetchProxy"]);
const functionRewrites = (functionsConfig.hosting.rewrites || []).filter((rule) => rule.function);
check(functionRewrites.length === 2 && functionRewrites.every((rule) => allowedFunctions.has(rule.function)), "optional config may rewrite only searchProxy and sourceFetchProxy");
check(functionsConfig.functions && functionsConfig.functions.runtime === "nodejs22", "optional Functions must use Node 22");
check(liveConfig.firestore && liveConfig.firestore.rules === "firestore.rules", "live-session config must wire the canonical rules");
check(liveConfig.firestore && liveConfig.firestore.indexes === "firestore.indexes.json", "live-session config must wire TTL indexes");

const exportsFound = [...functions.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1]);
check(exportsFound.length === 2 && exportsFound.includes("searchProxy") && exportsFound.includes("sourceFetchProxy"), "only searchProxy and sourceFetchProxy may be exported");
for (const banned of ["storeRemediated", "accessible", "dashboardData", "logRemediation", "lmsAuth", "lmsScan", "triggerLmsScan", "scanResults", "ltiLogin", "ltiLaunch", "ltiSession"]) {
  check(!functions.includes(banned), "retired unsafe Function still present: " + banned);
}
check(functions.includes("verifyIdToken"), "searchProxy must verify a Firebase ID token");
check(functions.includes("appCheck().verifyToken"), "searchProxy must verify App Check");
check((functions.match(/req\.method !== "POST"/g) || []).length === 2, "both optional Functions must be POST-only");
check(!functions.includes("req.query"), "search terms must not be accepted in URLs");
check(!/Access-Control-Allow-Origin["']\s*,\s*["']\*["']/.test(functions), "Function CORS must not use wildcard origin");
check(functions.includes("_alloflowRateLimits") && (functions.match(/maxInstances/g) || []).length === 2, "optional Functions must retain distributed quota and instance caps");
check(functions.includes('enforceRateLimit(caller.uid, "source_fetch"'), "sourceFetchProxy must retain its own per-user quota");
check(functions.includes("fetchPublicPage(sourceUrl)"), "sourceFetchProxy must use the hardened public-page fetcher");
check(sourceFetch.includes("node:dns") && sourceFetch.includes("makePinnedLookup"), "source fetch must resolve and pin approved DNS answers");
check(sourceFetch.includes("blockedIpv4") && sourceFetch.includes("blockedIpv6") && sourceFetch.includes("169.254.0.0") && sourceFetch.includes("fc00::"), "source fetch must block private, link-local, and reserved IP ranges");
check(sourceFetch.includes("MAX_SOURCE_BYTES") && sourceFetch.includes("MAX_REDIRECTS") && sourceFetch.includes("unsupported-content-type"), "source fetch must cap bytes and redirects and restrict content types");
check(sourceFetch.includes("assertPublicTarget(current") && sourceFetch.includes("location"), "source fetch must revalidate redirect destinations");
check(sourceFetch === desktopSourceFetch, "desktop and cloud source-fetch safety cores must match");

check(!ai.includes("https://prismflow-911fe.web.app"), "client must not fall back to the maintainer Firebase project");
check(ai.includes("getFunctionSecurityHeaders") && ai.includes("method: 'POST'"), "client search must send authenticated POST requests");
check(lumen.includes("/api/sourceFetchProxy") && lumen.includes("getFunctionSecurityHeaders") && lumen.includes("method: 'POST'"), "Lumen source import must prefer the authenticated POST proxy");
check(lumen.includes("error.code === 'source-fetch-unavailable'"), "Lumen may use the legacy importer only when the first-party route is unavailable");
check(app.includes("initializeAppCheck") && app.includes("ReCaptchaEnterpriseProvider"), "owned Firebase client must initialize App Check");
check(app.includes("getFunctionSecurityHeaders"), "client must expose authenticated Function headers");
check(!app.includes("process.env.REACT_APP_GEMINI_API_KEY"), "public app must not compile a Gemini credential");
check(!env.includes("REACT_APP_GEMINI_API_KEY"), "public env template must not invite a Gemini credential");

check(rules.includes("resource.data.ownerUid == request.auth.uid"), "asset rules must bind owner UID");
check(rules.includes("resource.data.parentId"), "asset rules must bind a parent");
check(rules.includes("resource.data.expiresAt"), "asset rules must enforce expiry");
check(rules.includes("allow list: if false;"), "enumerable collections must deny list");
check(/conceptMastery[\s\S]*?allow read, write: if false;/.test(rules), "retired concept mastery must fail closed");
check(rules.includes("quiz-signaling"), "rules must allow the active quiz signaling transport");
check(indexes.fieldOverrides.some((item) => item.collectionGroup === "session_assets" && item.ttl === true), "session asset TTL policy missing");
check(guide.includes("firebase deploy --only hosting") && guide.includes("hosting-only"), "guide must lead with hosting-only deployment");
check(!guide.includes("REACT_APP_GEMINI_API_KEY"), "guide must not instruct browser Gemini-key deployment");

if (failures.length) {
  console.error("Firebase security contract failed:");
  failures.forEach((failure) => console.error(" - " + failure));
  process.exit(1);
}
console.log("Firebase security contract passed (" + checkCount + " invariants).");
