---
name: alloflow-portable-remediation
description: Rebuild attached PDFs as accessible copies plus a scoped report entirely in the active file sandbox. Use by default for PDF accessibility, WCAG, Section 508, or PDF/UA remediation when the user has no paid Worker, institution account, AlloFlow server, or separate model API key.
---

# AlloFlow portable PDF remediation

Keep the document inside the active Claude or ChatGPT file sandbox. Do not call
an AlloFlow server, remote MCP, Gemini, web service, analytics endpoint, or
telemetry service while using this workflow.

This is the default path when a user attaches a PDF and simply asks to make it
accessible. It needs no AlloFlow account, Cloudflare Worker, institution-owned
service, or separate AI API key. The host model reads the attachment using the
capabilities already available in the current conversation.

## Run the one-prompt workflow

Resolve the installed directory containing this `SKILL.md` as `<skill-dir>`.
Use absolute paths derived from it for scripts and references; do not assume the
conversation working directory is the Skill directory.

1. Locate the PDF attached to the current conversation. Work on a copy and never
   overwrite the source.
2. Run:

   ```text
   python "<skill-dir>/scripts/alloflow_portable.py" capabilities --json
   ```

3. Bind the plan to that exact PDF:

   ```text
   python "<skill-dir>/scripts/alloflow_portable.py" source-info \
     --source "/path/to/source.pdf"
   ```

   Copy the returned `sha256` into `document.source_sha256` in the repair plan.
   Do not calculate it from extracted text or from a renamed/recreated copy.
4. Read every source page using the host's native document and vision
   capabilities. Preserve the source wording, reading order, headings, lists,
   tables, links, page boundaries, and meaningful images. Do not summarize or
   silently omit repeated content.
5. Write `repair-plan.json` that conforms to
   [references/repair-plan.schema.json](references/repair-plan.schema.json).
   Record uncertainty in `review_notes`; never invent unreadable content.
6. Run one command:

   ```text
   python "<skill-dir>/scripts/alloflow_portable.py" remediate \
     --source "/path/to/source.pdf" \
     --plan "/path/to/repair-plan.json" \
     --out-dir "/path/to/alloflow-output" \
     --pdf auto \
     --verapdf auto
   ```

7. If plan validation fails, correct the plan from the reported errors and run
   it once more. Do not weaken or bypass a validation rule.
8. Return every artifact listed in the final report:

   - semantic accessible HTML;
   - the remediated tagged PDF when this sandbox proved it could generate one;
   - the accessibility report; and
   - the privacy receipt.

If tagged-PDF generation is unavailable, return the HTML and reports and say
plainly that the sandbox could not create a tagged PDF. Do not substitute an
ordinary print-to-PDF and call it accessible.

## Stop instead of rebuilding

Do not automatically rebuild signed documents, legal records, certificates, or
interactive forms where changed layout or field behavior could alter meaning.
Return an audit-only explanation and recommend the responsible document owner.

For scanned pages, complex equations, dense charts, handwriting, ambiguous
reading order, or tables that cannot be reconstructed confidently, preserve
what is legible and add a specific manual-review note. Never guess.

## Interpret the result honestly

- `pdf_generated_validation_passed_review_required` means local veraPDF passed,
  but a person must still compare meaning and fidelity with the source.
- `pdf_generated_with_known_issues` means the PDF was generated and veraPDF
  found unresolved PDF/UA rules.
- `pdf_generated_unverified_review_required` means a tagged PDF was generated
  but local PDF/UA validation did not complete.
- `html_only_review_required` means the semantic rebuild exists but tagged-PDF
  generation was unavailable, disabled, or failed.
- `blocked` means the document type or plan could not be processed safely.
- A veraPDF failure is a real unresolved PDF/UA finding.
- A missing veraPDF capability is `not_run`, never a pass.
- Never say "WCAG compliant," "PDF/UA compliant," "Section 508 compliant," or
  "legally compliant" from this workflow alone.

Read [references/privacy-and-verification.md](references/privacy-and-verification.md)
and [PRIVACY.md](PRIVACY.md) before handling identifiable student information
or interpreting a report. The receipt is scoped to the packaged scripts; it
does not certify the host provider, operating system, or synchronization tools.

## Remote fallback is explicit opt-in

The older AlloFlow MCP/Cloudflare pipeline is not part of this public workflow.
Use it only when the user explicitly requests remote or institution-hosted
processing after understanding that the service will receive the document.
