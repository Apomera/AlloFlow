#!/usr/bin/env node
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const check = path.join(__dirname, "check_firebase_security.cjs");
const result = spawnSync(process.execPath, [check], { stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
