#!/usr/bin/env node
// check_no_discrepancy_persistence.cjs — FERPA gate enforcing the render-only
// invariant on report_writer_module.js's `discrepancyReport` state.
//
// Background:
//   `discrepancyReport` is component-local React useState that holds the
//   result of the psycheck verifier (either an imported JSON file or the
//   inline JS port's output). It may contain extracted quotes from the
//   source narrative + a wall-clock _timestamp. If it ever joins the
//   module's localStorage / Firestore / export-bundle paths, those quotes
//   travel with student identifiers into Tier-2 storage.
//
//   The FERPA comment in report_writer_module.js (search for "FERPA
//   INVARIANT") states this rule in prose. This gate enforces it
//   mechanically.
//
// The rule:
//   `discrepancyReport` must NEVER appear as a property key in any
//   object literal anywhere in report_writer_module.js. Today it does not.
//
//   This catches the actual regression vector — the autosave snapshot at
//   `const snapshot = { reportTitle, studentAge, ..., reportSections, ... }`
//   is a shorthand-object literal. Adding `discrepancyReport` as one token
//   to that literal would silently route the verifier result into
//   localStorage via the safeSetItem on the following line. This gate
//   refuses the addition.
//
//   The check is broader than "only sink-adjacent objects" intentionally:
//   there are zero legitimate places in this module for discrepancyReport
//   to live in an object literal (it's React state, accessed via
//   `discrepancyReport.field` or referenced as a deps-array element, never
//   keyed into objects). So the strict rule has zero false positives today
//   and catches every reasonable regression path.
//
// Usage:
//   node dev-tools/check_no_discrepancy_persistence.cjs
//   node dev-tools/check_no_discrepancy_persistence.cjs --verbose
//
// Exit codes:
//   0 — clean
//   1 — leak found; failure message includes file:line + fix guidance
//   2 — internal error (parser failure, etc.)

const fs = require("fs");
const path = require("path");

const TARGET = path.join(__dirname, "..", "report_writer_module.js");
const FORBIDDEN_KEY = "discrepancyReport";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");

function loadParser() {
    try {
        return require(path.join(__dirname, "..", "node_modules", "@babel", "parser"));
    } catch (e) {
        console.error("check_no_discrepancy_persistence: @babel/parser not found");
        console.error("Install with: cd UDL-Tool-Updated && npm install --no-save @babel/parser");
        process.exit(2);
    }
}

const babelParser = loadParser();

function parse(src) {
    return babelParser.parse(src, {
        sourceType: "script",
        plugins: [],
        errorRecovery: true,
    });
}

function objectExpressionPropertiesForKey(node, key) {
    if (!node || node.type !== "ObjectExpression") return [];
    const hits = [];
    for (const prop of node.properties) {
        if (!prop) continue;
        if (prop.type !== "ObjectProperty" && prop.type !== "Property") continue;
        const keyNode = prop.key;
        if (!keyNode) continue;
        if (keyNode.type === "Identifier" && keyNode.name === key) hits.push(prop);
        else if (keyNode.type === "StringLiteral" && keyNode.value === key) hits.push(prop);
        else if (keyNode.type === "Literal" && keyNode.value === key) hits.push(prop);
    }
    return hits;
}

function walk(node, visitor, parent = null) {
    if (!node || typeof node !== "object") return;
    visitor(node, parent);
    for (const key of Object.keys(node)) {
        if (key === "loc" || key === "start" || key === "end") continue;
        const child = node[key];
        if (Array.isArray(child)) {
            for (const c of child) walk(c, visitor, node);
        } else if (child && typeof child === "object" && child.type) {
            walk(child, visitor, node);
        }
    }
}

function lineOf(node) {
    return (node.loc && node.loc.start && node.loc.start.line) || "?";
}

function main() {
    let src;
    try {
        src = fs.readFileSync(TARGET, "utf8");
    } catch (e) {
        console.error("check_no_discrepancy_persistence: cannot read " + TARGET);
        console.error("  " + e.message);
        process.exit(2);
    }

    let ast;
    try {
        ast = parse(src);
    } catch (e) {
        console.error("check_no_discrepancy_persistence: parse error in " + TARGET);
        console.error("  " + e.message);
        process.exit(2);
    }

    const findings = [];

    walk(ast, (node) => {
        if (node.type !== "ObjectExpression") return;
        const hits = objectExpressionPropertiesForKey(node, FORBIDDEN_KEY);
        for (const hit of hits) {
            findings.push({ line: lineOf(hit), objLine: lineOf(node) });
        }
    });

    if (findings.length === 0) {
        console.log(
            "✓ check_no_discrepancy_persistence: discrepancyReport does not appear as a property "
                + "key in any object literal in report_writer_module.js."
        );
        if (verbose) {
            console.log(
                "  This catches the actual regression vector — adding `discrepancyReport` as "
                    + "a shorthand entry to the autosave snapshot literal or the gallery-entry "
                    + "literal would silently leak verifier output (including extracted quotes "
                    + "from the source narrative) into localStorage."
            );
        }
        return 0;
    }

    console.error("✗ check_no_discrepancy_persistence: FERPA INVARIANT VIOLATION");
    console.error("");
    console.error("  `discrepancyReport` may contain extracted quotes from the source");
    console.error("  narrative + a wall-clock timestamp. It MUST NOT appear as a property");
    console.error("  key in any object literal in report_writer_module.js, because every");
    console.error("  such literal in this module either feeds localStorage / a Firestore");
    console.error("  write / an export bundle, or is one refactor away from doing so.");
    console.error("");
    console.error("  The state declaration is explicit:");
    console.error("    \"render-only; never written to setHistory / saveHistory;");
    console.error("     never written to Firestore via saveToCloud; never serialized");
    console.error("     into snapshot / saveSnapshot; never included in copyFullReport");
    console.error("     / printReport / export bundles\"");
    console.error("");
    console.error("  Violation(s):");
    for (const f of findings) {
        console.error(`    report_writer_module.js:${f.line}  (in object literal at line ${f.objLine})`);
    }
    console.error("");
    console.error("  Fix: remove discrepancyReport from the object literal. If you need to");
    console.error("  surface state about the verifier output to another component, use the");
    console.error("  existing render path (banner overlay via discrepanciesBySection memo)");
    console.error("  or add a sibling useState that does not contain student-derived text.");
    return 1;
}

process.exit(main());
