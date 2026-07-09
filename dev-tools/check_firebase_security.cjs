#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const defaultConfig = json("prismflow-deploy/firebase.json");
const functionsConfig = json("prismflow-deploy/firebase.functions.json");
const liveConfig = json("prismflow-deploy/firebase.live-sessions.json");
const indexes = json("firestore.indexes.json");
const functions = read("prismflow-deploy/functions/index.js");
const ai = read("ai_backend_module.js");
const app = read("AlloFlowANTI.txt");
const env = read("prismflow-deploy/.env.example");
const rules = read("firestore.rules");
const guide = read("DEPLOY_YOUR_OWN.md");

check(read("prismflow-deploy/firestore.rules") === rules, "deploy Firestore rules mirror must match canonical rules");
check(read("prismflow-deploy/firestore.indexes.json") === read("firestore.indexes.json"), "deploy Firestore indexes mirror must match canonical indexes");

check(!defaultConfig.functions, "default firebase.json must not deploy Functions");
check(!(defaultConfig.hosting.rewrites || []).some((rule) => rule.function), "default hosting must not contain Function rewrites");
check((functionsConfig.hosting.rewrites || []).filter((rule) => rule.function).every((rule) => rule.function === "searchProxy"), "optional config may rewrite only searchProxy");
check(functionsConfig.functions && functionsConfig.functions.runtime === "nodejs22", "optional Functions must use Node 22");
check(liveConfig.firestore && liveConfig.firestore.rules === "firestore.rules", "live-session config must wire the canonical rules");
check(liveConfig.firestore && liveConfig.firestore.indexes === "firestore.indexes.json", "live-session config must wire TTL indexes");

const exportsFound = [...functions.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1]);
check(exportsFound.length === 1 && exportsFound[0] === "searchProxy", "only searchProxy may be exported");
for (const banned of ["storeRemediated", "accessible", "dashboardData", "logRemediation", "lmsAuth", "lmsScan", "triggerLmsScan", "scanResults", "ltiLogin", "ltiLaunch", "ltiSession"]) {
  check(!functions.includes(banned), "retired unsafe Function still present: " + banned);
}
check(functions.includes("verifyIdToken"), "searchProxy must verify a Firebase ID token");
check(functions.includes("appCheck().verifyToken"), "searchProxy must verify App Check");
check(functions.includes('req.method !== "POST"'), "searchProxy must be POST-only");
check(!functions.includes("req.query"), "search terms must not be accepted in URLs");
check(!/Access-Control-Allow-Origin["']\s*,\s*["']\*["']/.test(functions), "Function CORS must not use wildcard origin");
check(functions.includes("_alloflowRateLimits") && functions.includes("maxInstances"), "searchProxy must retain distributed quota and instance cap");

check(!ai.includes("https://prismflow-911fe.web.app"), "client must not fall back to the maintainer Firebase project");
check(ai.includes("getFunctionSecurityHeaders") && ai.includes("method: 'POST'"), "client search must send authenticated POST requests");
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
console.log("Firebase security contract passed (" + (32 - failures.length) + " invariants).");
