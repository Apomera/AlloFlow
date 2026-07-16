# Privacy — AlloFlow PDF Remediation connector

_Last updated: 2026-07-16._

This connector runs **entirely on your machine**. There is no AlloFlow server, account,
telemetry, or analytics of any kind.

## What data goes where

| Data | Destination | Why |
| --- | --- | --- |
| The documents you audit/remediate (full content) | **Google Gemini API**, under the API key **you** provide | The pipeline's OCR, audits, and fixes are AI calls |
| Nothing | AlloFlow / the connector author | The connector has no backend |
| Library fetches (no document content) | Public CDNs (pdf.js, Tesseract, pdf-lib, axe-core) | Runtime libraries the pipeline loads |
| Output files (accessible HTML, tagged PDF, report JSON) | **Your local disk only**, at paths you choose | The deliverables |

## Your API key

- Stored by your MCP client (e.g. Claude Desktop's encrypted user-config), injected into the
  connector as an environment variable at launch.
- Never written to disk by the connector, never logged, never included in tool results
  (capability reports name only the key's *source*, e.g. `env:GEMINI_API_KEY`).

## Student records / FERPA

Documents are sent to the Gemini API under your personal or institutional key. A personal
AI Studio key is **not** covered by a school's Google Workspace for Education agreement.
Do not process documents containing student personally identifiable information unless your
institution's agreements cover Gemini API use for that data — or scrub the documents first.

## Local footprint

- Reads only the files/folders you pass to tools; writes outputs with collision-safe names
  (never overwrites) to the folder you choose.
- Job records live in memory and vanish when the connector stops.
- Headless Chromium runs with a fresh, isolated browser context per document.
