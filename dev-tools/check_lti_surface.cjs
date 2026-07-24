#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const functions = fs.readFileSync(path.join(root, "desktop/web-app/functions/index.js"), "utf8");
const optional = fs.readFileSync(path.join(root, "desktop/web-app/firebase.functions.json"), "utf8");
const client = fs.readFileSync(path.join(root, "AlloFlowANTI.txt"), "utf8");
const forbidden = ["exports.ltiLogin", "exports.ltiLaunch", "exports.ltiSession", '"function": "ltiLogin"', '"function": "ltiLaunch"', '"function": "ltiSession"'];
const failures = forbidden.filter((token) => functions.includes(token) || optional.includes(token));
if (/ltiSession\?token=|params\.get\(['"]role['"]\)/.test(client)) failures.push("client trusts an LTI query token or URL role");
if (!client.includes("Firebase LTI is disabled until a verified one-time identity exchange")) failures.push("client does not state the fail-closed LTI boundary");
if (failures.length) {
  console.error("LTI fail-closed contract failed:");
  failures.forEach((failure) => console.error(" - " + failure));
  process.exit(1);
}
console.log("LTI endpoints are fail-closed and absent from Firebase deployment.");
