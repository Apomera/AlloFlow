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
