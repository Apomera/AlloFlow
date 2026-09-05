# AlloFlow Remediation MCP for Claude Desktop

This is the local-first AlloFlow document-remediation connector. It runs on your computer; it does
not require an AlloFlow account, institution account, Cloudflare Worker, or paid AlloFlow service.

## Install

1. Download alloflow-remediation.mcpb from this release.
2. In Claude Desktop, open Settings > Extensions and install or drag in the downloaded file.
3. Ask Claude to run remediation_capabilities.
4. If Chromium is not installed, ask Claude to run remediation_setup once.
5. The Gemini key is optional. Deterministic tools such as PDF/UA validation, text extraction,
   redaction, structure checks, contrast repair, form conversion, alternative-format export, and
   resource-pack generation work without it.
6. Full remediation can also run without a Gemini key through the agent-bridge tools. In that mode,
   document-derived prompts and rendered page images pass through the MCP client conversation to
   that client's model provider. Review the provider/account boundary before using student records.

## Requirements

Claude Desktop supplies the Node runtime for this extension; other MCP hosts need Node 20 or newer
on PATH. PDF/UA validation (veraPDF) and EPUB validation (EPUBCheck) need a local Java runtime;
`remediation_capabilities` reports whether Java, Chromium, EPUBCheck and Ace are available.
Chromium is a one-time download through `remediation_setup`.

## Folder processing and narration

Ask the client to remediate a folder using the keyless bridge, with thorough effort and
accessible narration. It handles the model-reply loop, processes up to 60 supported files
sequentially, and can resume saved runs after restart. Completed outputs are verified before reuse.
The client conversation must stay active for model requests.

Both accessible narration (structure announced) and natural narration (continuous reading)
are available. Automatic selection uses Kokoro for English and Piper for other configured
languages after public model downloads. Ask for `document_narration_voices` to see language and
style support; accessible announcements currently cover en/es/fr/de/pt/it, with natural narration
for other configured languages. `remediation_agent_runs` finds saved work after restart.
Outputs include MP3, WAV, HTML with audio controls, and an EPUB containing synchronized audio.
Existing accessible HTML, including a folder of up to 60 documents, can be narrated
directly without a model-reply loop. `document_narration_preflight` checks language
and voice readiness locally before synthesis. Language-tagged blocks and inline
phrases switch voices automatically. Retrying a folder reuses hash-verified final
audio packages without creating duplicate downloads. Failed files and the retry
action are listed in the batch summary.

Editing a paragraph regenerates its changed speech while reusing unchanged clips.
Coverage checks flag potential source omissions, extraction uncertainty, missing
HTML speech and undescribed visuals. Review-required source coverage pauses
narration and tagged-PDF delivery; it does not silently produce a complete claim.
Both accessible and natural listening styles remain available.

## Independent verification and review statuses

A generated tagged PDF is delivered as `-tagged.pdf` only when the bundled veraPDF check passes on
the emitted bytes. Otherwise it is written as `-tagged-review-required.pdf` with
`deliveryStatus: review-required` and the reason recorded in the remediation report. EPUBs are
checked by the bundled EPUBCheck 5.3.0 and DAISY Ace 1.4.6; raw JSON reports are written beside
the EPUB. Every check reports `passed`, `failed`, `review-required`, `unavailable` or `skipped`.
A missing runtime is reported as `unavailable`, never as a pass. `audit_html` runs the AI rubric,
axe-core and IBM Equal Access and reports each engine separately.

These are automated, machine-verifiable checks with a defined scope. A passing result is
`complete-for-tested-scope` and still requires human review of reading order, tables, forms,
language, descriptions and audio. Nothing this connector produces is a WCAG, PDF/UA or Title II
compliance certification.

## Privacy boundary

Deterministic local tools make no model-provider request, although their returned results still enter
the MCP client conversation. Tools described as requiring Gemini send the selected document or
derived content to Google's Gemini API under the user's own key. The keyless agent-bridge path sends
document-derived prompts and page images to the MCP client's model provider instead of Gemini.
Installing this extension does not make either third-party path FERPA compliant. Review PRIVACY.md
before using model-dependent tools with education records.

## Verify the download

Compare the file with SHA256SUMS.txt. GitHub CLI users can additionally verify that GitHub Actions
built the exact bytes from this repository:

    gh attestation verify alloflow-remediation.mcpb -R Apomera/AlloFlow

The CycloneDX file covers packaged npm dependencies. vendor-manifest.json records the SHA-256 and
byte count of every separately bundled browser-runtime asset; THIRD_PARTY_NOTICES.md documents those
third-party components.

## Registry discovery

This release is also the install source for the official MCP Registry entry
io.github.Apomera/alloflow-remediation. Registry discovery installs these same checksum-bound MCPB
bytes; it does not route documents through an AlloFlow or Cloudflare server. Registry publication is
a separate explicit maintainer action after the GitHub release has passed provenance verification.

## Other hosts

HOSTS.md covers Claude Code, OpenAI Codex CLI, Cursor, VS Code, Gemini CLI and, through the optional
Streamable HTTP transport, ChatGPT developer mode. The .mcpb is a zip archive; any host that can run
`node` can use the extracted `server/alloflow-remediation-mcp-stdio.cjs`.

## Pilot guide

PILOT_GUIDE.md in the repository describes a supervised colleague pilot: setup, fixtures, example
prompts, the human review checklist and how to record issues.

## First useful requests

- Audit this document for accessibility and explain what can be checked locally.
- Extract the text from this document without uploading it anywhere.
- Validate this PDF for PDF/UA-1 locally.
- Redact these exact student identifiers from this accessible HTML and verify they are gone.
- Convert this accessible HTML to EPUB, DAISY, or uncontracted Braille.
- Remediate this document thoroughly. Before sending anything to Gemini, tell me what will leave my
  computer and ask for confirmation.
- Remediate this document using the agent bridge. Before starting, tell me which document content
  will enter this conversation and which model provider processes it.
